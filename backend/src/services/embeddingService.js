const env = require('../config/env');
const AppError = require('../utils/appError');
const ollamaService = require('./ollamaService');

const generateEmbedding = async (text) => {
  const embedding = await ollamaService.getEmbedding(text);

  if (embedding.length !== env.ollama.embeddingDimension) {
    throw new AppError(
      `Embedding dimension mismatch. Expected ${env.ollama.embeddingDimension}, received ${embedding.length}.`,
      500
    );
  }

  return embedding;
};

module.exports = {
  generateEmbedding
};

