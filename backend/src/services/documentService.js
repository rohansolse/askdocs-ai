const fs = require('fs/promises');
const { withTransaction } = require('../config/database');
const AppError = require('../utils/appError');
const { getDocumentType } = require('../config/documentTypes');
const { extractTextByDocumentType } = require('./documentTextExtractorService');
const { splitIntoChunks } = require('./textChunkService');
const { generateEmbedding } = require('./embeddingService');
const { toVectorLiteral } = require('./vectorSearchService');
const env = require('../config/env');
const { measureAsync, measureSync, yieldToEventLoop } = require('../utils/performance');

const EMBEDDING_CONCURRENCY = env.nodeEnv === 'development' ? 2 : 4;
const DOCUMENT_CONCURRENCY = env.nodeEnv === 'development' ? 1 : 2;
const INSERT_BATCH_SIZE = 25;

const toBooleanOption = (value, fallback) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const mapWithConcurrency = async (items, concurrency, iteratee) => {
  if (!items.length) {
    return [];
  }

  const results = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await iteratee(items[currentIndex], currentIndex);
      await yieldToEventLoop();
    }
  };

  const workerCount = Math.min(Math.max(concurrency, 1), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
};

const insertChunkBatch = async (client, documentId, chunkBatch) => {
  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const chunk of chunkBatch) {
    values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}::vector)`);
    params.push(documentId, chunk.chunkIndex, chunk.content, toVectorLiteral(chunk.embedding));
    paramIndex += 4;
  }

  await client.query(
    `INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
     VALUES ${values.join(', ')}`,
    params
  );
};

const processDocumentUpload = async (file, options = {}) => {
  if (!file) {
    throw new AppError('A supported document file is required.', 400);
  }

  try {
    const documentType = getDocumentType(file);
    if (!documentType) {
      throw new AppError('Unsupported document type.', 400);
    }

    const enableImageOcr = toBooleanOption(options.enableImageOcr, env.imageOcr.enabled);
    const documentLabel = file.originalname;
    const rawText = await extractTextByDocumentType({
      filePath: file.path,
      documentType,
      documentLabel,
      enableImageOcr
    });
    const chunks = measureSync(
      'chunking',
      () => splitIntoChunks(rawText),
      {
        document: documentLabel,
        chunkSize: env.chunking.size,
        overlap: env.chunking.overlap
      }
    );

    if (!chunks.length) {
      throw new AppError('No readable text was found in the uploaded document.', 400);
    }

    const chunkRecords = await measureAsync(
      'embedding generation',
      () =>
        mapWithConcurrency(chunks, EMBEDDING_CONCURRENCY, async (content, index) => ({
          chunkIndex: index,
          content,
          embedding: await generateEmbedding(content)
        })),
      {
        document: documentLabel,
        chunks: chunks.length,
        concurrency: EMBEDDING_CONCURRENCY
      }
    );

    const document = await measureAsync(
      'db insert',
      () =>
        withTransaction(async (client) => {
          const documentInsert = await client.query(
            `INSERT INTO documents (original_name, stored_name, file_type, mime_type)
             VALUES ($1, $2, $3, $4)
             RETURNING
               id,
               original_name AS "originalName",
               stored_name AS "storedName",
               file_type AS "fileType",
               mime_type AS "mimeType",
               uploaded_at AS "uploadedAt"`,
            [file.originalname, file.filename, documentType, file.mimetype]
          );

          const savedDocument = documentInsert.rows[0];

          for (let start = 0; start < chunkRecords.length; start += INSERT_BATCH_SIZE) {
            await insertChunkBatch(client, savedDocument.id, chunkRecords.slice(start, start + INSERT_BATCH_SIZE));
            await yieldToEventLoop();
          }

          return savedDocument;
        }),
      {
        document: documentLabel,
        chunks: chunkRecords.length
      }
    );

    return {
      ...document,
      chunkCount: chunkRecords.length
    };
  } finally {
    await fs.unlink(file.path).catch(() => undefined);
  }
};

module.exports = {
  processDocumentUpload,
  processMultipleDocumentUploads: async (files, options = {}) => {
    if (!Array.isArray(files) || !files.length) {
      throw new AppError('At least one supported document file is required.', 400);
    }

    return mapWithConcurrency(files, DOCUMENT_CONCURRENCY, (file) => processDocumentUpload(file, options));
  }
};
