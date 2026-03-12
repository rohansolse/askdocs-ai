const fs = require('fs/promises');
const { withTransaction } = require('../config/database');
const AppError = require('../utils/appError');
const { extractTextFromPdf } = require('./pdfParserService');
const { splitIntoChunks } = require('./textChunkService');
const { generateEmbedding } = require('./embeddingService');
const { toVectorLiteral } = require('./vectorSearchService');

const processDocumentUpload = async (file) => {
  if (!file) {
    throw new AppError('PDF file is required.', 400);
  }

  try {
    const rawText = await extractTextFromPdf(file.path);
    const chunks = splitIntoChunks(rawText);

    if (!chunks.length) {
      throw new AppError('No readable text was found in the uploaded PDF.', 400);
    }

    const chunkRecords = [];
    for (let index = 0; index < chunks.length; index += 1) {
      const content = chunks[index];
      const embedding = await generateEmbedding(content);

      chunkRecords.push({
        chunkIndex: index,
        content,
        embedding
      });
    }

    const document = await withTransaction(async (client) => {
      const documentInsert = await client.query(
        `INSERT INTO documents (original_name, stored_name)
         VALUES ($1, $2)
         RETURNING id, original_name AS "originalName", stored_name AS "storedName", uploaded_at AS "uploadedAt"`,
        [file.originalname, file.filename]
      );

      const savedDocument = documentInsert.rows[0];

      for (const chunk of chunkRecords) {
        await client.query(
          `INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
           VALUES ($1, $2, $3, $4::vector)`,
          [
            savedDocument.id,
            chunk.chunkIndex,
            chunk.content,
            toVectorLiteral(chunk.embedding)
          ]
        );
      }

      return savedDocument;
    });

    return {
      ...document,
      chunkCount: chunkRecords.length
    };
  } finally {
    await fs.unlink(file.path).catch(() => undefined);
  }
};

module.exports = {
  processDocumentUpload
};

