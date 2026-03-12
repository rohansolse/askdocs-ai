const fs = require('fs/promises');
const { measureAsync } = require('../utils/performance');

const extractTextFromPlainTextFile = async (filePath, options = {}) =>
  measureAsync(
    'file parsing',
    async () => {
      const text = await fs.readFile(filePath, 'utf8');
      return text.replace(/\u0000/g, ' ').trim();
    },
    {
      document: options.documentLabel,
      type: 'text'
    }
  );

module.exports = {
  extractTextFromPlainTextFile
};
