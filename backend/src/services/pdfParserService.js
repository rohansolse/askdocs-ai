const fs = require('fs/promises');
const pdf = require('pdf-parse');

const extractTextFromPdf = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const parsed = await pdf(buffer);

  return (parsed.text || '').replace(/\u0000/g, ' ').trim();
};

module.exports = {
  extractTextFromPdf
};

