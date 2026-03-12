const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../../.env')
});

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 3000),
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: toNumber(process.env.POSTGRES_PORT, 5432),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'docu_chat_ai'
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    chatModel: process.env.OLLAMA_CHAT_MODEL || 'llama3',
    embedModel: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
    embeddingDimension: toNumber(process.env.OLLAMA_EMBED_DIMENSION, 768)
  },
  rag: {
    topK: toNumber(process.env.RAG_TOP_K, 5),
    minSimilarity: toNumber(process.env.RAG_MIN_SIMILARITY, 0.35)
  },
  chunking: {
    size: toNumber(process.env.CHUNK_SIZE, 1200),
    overlap: toNumber(process.env.CHUNK_OVERLAP, 200)
  }
};

module.exports = env;
