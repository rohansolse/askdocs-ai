const fs = require('fs/promises');
const pdf = require('pdf-parse');
const { measureAsync } = require('../utils/performance');

const extractTextFromPdf = async (filePath, options = {}) =>
  measureAsync(
    'file parsing',
    async () => {
      const buffer = await fs.readFile(filePath);
      const parsed = await pdf(buffer);

      return (parsed.text || '').replace(/\u0000/g, ' ').trim();
    },
    {
      document: options.documentLabel,
      type: 'pdf'
    }
  );

module.exports = {
  extractTextFromPdf
};
