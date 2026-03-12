const env = require('../config/env');

const normalizeText = (text) => text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();

const splitIntoChunks = (text, options = {}) => {
  const chunkSize = options.chunkSize || env.chunking.size;
  const overlap = options.overlap || env.chunking.overlap;
  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks = [];
  let currentChunk = '';

  const flushChunk = () => {
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    currentChunk = '';
  };

  for (const paragraph of paragraphs) {
    const candidate = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;

    if (candidate.length <= chunkSize) {
      currentChunk = candidate;
      continue;
    }

    if (currentChunk) {
      flushChunk();
    }

    if (paragraph.length <= chunkSize) {
      currentChunk = paragraph;
      continue;
    }

    let startIndex = 0;
    while (startIndex < paragraph.length) {
      const endIndex = startIndex + chunkSize;
      const slice = paragraph.slice(startIndex, endIndex).trim();

      if (slice) {
        chunks.push(slice);
      }

      if (endIndex >= paragraph.length) {
        startIndex = paragraph.length;
      } else {
        startIndex = Math.max(endIndex - overlap, startIndex + 1);
      }
    }
  }

  flushChunk();

  if (chunks.length <= 1 || overlap <= 0) {
    return chunks;
  }

  return chunks.map((chunk, index) => {
    if (index === 0) {
      return chunk;
    }

    const previousChunk = chunks[index - 1];
    const prefix = previousChunk.slice(-overlap).trim();
    return prefix ? `${prefix}\n${chunk}` : chunk;
  });
};

module.exports = {
  splitIntoChunks
};

