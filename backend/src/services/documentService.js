const fs = require('fs/promises');
const { withTransaction } = require('../config/database');
const AppError = require('../utils/appError');
const { getDocumentType } = require('../config/documentTypes');
const { extractTextByDocumentType } = require('./documentTextExtractorService');
const { splitIntoChunks } = require('./textChunkService');
const { generateEmbedding } = require('./embeddingService');
const { toVectorLiteral } = require('./vectorSearchService');

const processDocumentUpload = async (file) => {
  if (!file) {
    throw new AppError('A supported document file is required.', 400);
  }

  try {
    const documentType = getDocumentType(file);
    if (!documentType) {
      throw new AppError('Unsupported document type.', 400);
    }

    const rawText = await extractTextByDocumentType({
      filePath: file.path,
      documentType
    });
    const chunks = splitIntoChunks(rawText);

    if (!chunks.length) {
      throw new AppError('No readable text was found in the uploaded document.', 400);
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
  processDocumentUpload,
  processMultipleDocumentUploads: async (files) => {
    if (!Array.isArray(files) || !files.length) {
      throw new AppError('At least one supported document file is required.', 400);
    }

    const uploadedDocuments = [];
    for (const file of files) {
      uploadedDocuments.push(await processDocumentUpload(file));
    }

    return uploadedDocuments;
  }
};
