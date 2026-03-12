const axios = require('axios');
const env = require('../config/env');
const AppError = require('../utils/appError');

const ollamaClient = axios.create({
  baseURL: env.ollama.baseUrl,
  timeout: 120000
});

const getEmbedding = async (input) => {
  try {
    const response = await ollamaClient.post('/api/embeddings', {
      model: env.ollama.embedModel,
      prompt: input
    });

    if (!Array.isArray(response.data.embedding)) {
      throw new AppError('Invalid embedding response from Ollama.', 502);
    }

    return response.data.embedding;
  } catch (error) {
    throw new AppError(
      error.response?.data?.error ||
        error.message ||
        'Failed to generate embeddings from Ollama.',
      502
    );
  }
};

const generateChatCompletion = async (messages) => {
  try {
    const response = await ollamaClient.post('/api/chat', {
      model: env.ollama.chatModel,
      messages,
      stream: false,
      options: {
        temperature: 0.1
      }
    });

    const content = response.data?.message?.content;
    if (!content) {
      throw new AppError('Invalid chat response from Ollama.', 502);
    }

    return content.trim();
  } catch (error) {
    throw new AppError(
      error.response?.data?.error ||
        error.message ||
        'Failed to generate chat completion from Ollama.',
      502
    );
  }
};

module.exports = {
  getEmbedding,
  generateChatCompletion
};
