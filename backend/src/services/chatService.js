const { query, withTransaction } = require('../config/database');
const AppError = require('../utils/appError');
const { generateEmbedding } = require('./embeddingService');
const { searchSimilarChunks } = require('./vectorSearchService');
const { generateChatCompletion } = require('./ollamaService');

const FALLBACK_ANSWER = 'This information is not available in the uploaded documents.';

const createTitleFromQuestion = (question) => {
  const trimmed = question.trim().replace(/\s+/g, ' ');
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
};

const ensureChat = async (client, chatId, question) => {
  if (chatId) {
    const existing = await client.query(
      `SELECT id, title, created_at AS "createdAt"
       FROM chats
       WHERE id = $1`,
      [chatId]
    );

    if (!existing.rows.length) {
      throw new AppError('Chat not found.', 404);
    }

    return existing.rows[0];
  }

  const created = await client.query(
    `INSERT INTO chats (title)
     VALUES ($1)
     RETURNING id, title, created_at AS "createdAt"`,
    [createTitleFromQuestion(question)]
  );

  return created.rows[0];
};

const buildGroundedMessages = (question, contextChunks) => {
  const formattedContext = contextChunks
    .map(
      (chunk, index) =>
        `[Source ${index + 1} | ${chunk.documentName} | Chunk ${chunk.chunkIndex}]\n${chunk.content}`
    )
    .join('\n\n');

  return [
    {
      role: 'system',
      content:
        'You are a documentation assistant. Answer strictly from the provided context. ' +
        `If the answer is not fully supported by the context, reply exactly with: "${FALLBACK_ANSWER}"`
    },
    {
      role: 'user',
      content: `Context:\n${formattedContext}\n\nQuestion: ${question}`
    }
  ];
};

const askQuestion = async ({ question, chatId, selectedDocumentIds: rawSelectedDocumentIds }) => {
  const trimmedQuestion = question?.trim();
  if (!trimmedQuestion) {
    throw new AppError('Question is required.', 400);
  }

  const selectedDocumentIds = Array.isArray(rawSelectedDocumentIds)
    ? rawSelectedDocumentIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    : [];

  if (!selectedDocumentIds.length) {
    throw new AppError('Select at least one document before asking a question.', 400);
  }

  const questionEmbedding = await generateEmbedding(trimmedQuestion);
  const relevantChunks = await searchSimilarChunks(questionEmbedding, {
    documentIds: selectedDocumentIds
  });
  const answer =
    relevantChunks.length > 0
      ? await generateChatCompletion(buildGroundedMessages(trimmedQuestion, relevantChunks))
      : FALLBACK_ANSWER;

  const chat = await withTransaction(async (client) => {
    const ensuredChat = await ensureChat(client, chatId, trimmedQuestion);

    await client.query(
      `INSERT INTO messages (chat_id, role, content)
       VALUES ($1, 'user', $2)`,
      [ensuredChat.id, trimmedQuestion]
    );

    await client.query(
      `INSERT INTO messages (chat_id, role, content)
       VALUES ($1, 'assistant', $2)`,
      [ensuredChat.id, answer]
    );

    return ensuredChat;
  });

  return {
    chatId: chat.id,
    title: chat.title,
    answer,
    context: relevantChunks.map((chunk) => ({
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      chunkIndex: chunk.chunkIndex,
      similarity: Number(chunk.similarity.toFixed(4))
    }))
  };
};

const getChatHistory = async () => {
  const [chatsResult, messagesResult] = await Promise.all([
    query(
      `SELECT id, title, created_at AS "createdAt"
       FROM chats
       ORDER BY created_at DESC`
    ),
    query(
      `SELECT
        id,
        chat_id AS "chatId",
        role,
        content,
        created_at AS "createdAt"
       FROM messages
       ORDER BY created_at ASC`
    )
  ]);

  return chatsResult.rows.map((chat) => ({
    ...chat,
    messages: messagesResult.rows.filter((message) => message.chatId === chat.id)
  }));
};

module.exports = {
  FALLBACK_ANSWER,
  askQuestion,
  getChatHistory
};
