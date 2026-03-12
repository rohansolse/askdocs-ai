const { query } = require('../config/database');
const env = require('../config/env');

const toVectorLiteral = (embedding) => `[${embedding.join(',')}]`;

const listDocuments = async () => {
  const result = await query(
    `SELECT
      d.id,
      d.original_name AS "originalName",
      d.stored_name AS "storedName",
      d.uploaded_at AS "uploadedAt",
      COUNT(dc.id)::int AS "chunkCount"
    FROM documents d
    LEFT JOIN document_chunks dc ON dc.document_id = d.id
    GROUP BY d.id
    ORDER BY d.uploaded_at DESC`
  );

  return result.rows;
};

const searchSimilarChunks = async (embedding, options = {}) => {
  const limit = options.limit || env.rag.topK;
  const vector = toVectorLiteral(embedding);
  const result = await query(
    `SELECT
      dc.id,
      dc.document_id AS "documentId",
      dc.chunk_index AS "chunkIndex",
      dc.content,
      d.original_name AS "documentName",
      1 - (dc.embedding <=> $1::vector) AS similarity
    FROM document_chunks dc
    INNER JOIN documents d ON d.id = dc.document_id
    ORDER BY dc.embedding <=> $1::vector
    LIMIT $2`,
    [vector, limit]
  );

  return result.rows.filter((row) => Number(row.similarity) >= env.rag.minSimilarity);
};

module.exports = {
  listDocuments,
  searchSimilarChunks,
  toVectorLiteral
};

