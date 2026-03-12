const env = require('../config/env');

const normalizeText = (text) => text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
const getOverlapPrefix = (text, overlap) =>
  overlap > 0 ? text.slice(Math.max(0, text.length - overlap)).trim() : '';
const splitOversizedSegment = (segment, chunkSize, overlap) => {
  const chunks = [];
  let startIndex = 0;

  while (startIndex < segment.length) {
    const endIndex = startIndex + chunkSize;
    const chunk = segment.slice(startIndex, endIndex).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (endIndex >= segment.length) {
      break;
    }

    startIndex = Math.max(endIndex - overlap, startIndex + 1);
  }

  return chunks;
};

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
  let currentChunkIsCarryover = false;

  const flushChunk = () => {
    if (currentChunk.trim() && !currentChunkIsCarryover) {
      const flushedChunk = currentChunk.trim();
      chunks.push(flushedChunk);
      currentChunk = getOverlapPrefix(flushedChunk, overlap);
      currentChunkIsCarryover = Boolean(currentChunk);
      return;
    }

    currentChunk = '';
    currentChunkIsCarryover = false;
  };

  for (const paragraph of paragraphs) {
    const joiner = currentChunkIsCarryover ? '\n' : '\n\n';
    const candidate = currentChunk ? `${currentChunk}${joiner}${paragraph}` : paragraph;

    if (candidate.length <= chunkSize) {
      currentChunk = candidate;
      currentChunkIsCarryover = false;
      continue;
    }

    if (currentChunk) {
      flushChunk();
    }

    if (paragraph.length <= chunkSize) {
      currentChunk = paragraph;
      currentChunkIsCarryover = false;
      continue;
    }

    const oversizedChunks = splitOversizedSegment(paragraph, chunkSize, overlap);
    for (const oversizedChunk of oversizedChunks) {
      if (currentChunk) {
        const nestedCandidate = `${currentChunk}\n${oversizedChunk}`;
        if (nestedCandidate.length <= chunkSize) {
          currentChunk = nestedCandidate;
          currentChunkIsCarryover = false;
          continue;
        }
      }

      if (currentChunk) {
        flushChunk();
      }

      currentChunk = oversizedChunk;
      currentChunkIsCarryover = false;
    }
  }

  flushChunk();
  return chunks;
};

module.exports = {
  splitIntoChunks
};
