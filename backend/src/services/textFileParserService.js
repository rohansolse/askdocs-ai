const fs = require('fs/promises');

const extractTextFromPlainTextFile = async (filePath) => {
  const text = await fs.readFile(filePath, 'utf8');
  return text.replace(/\u0000/g, ' ').trim();
};

module.exports = {
  extractTextFromPlainTextFile
};
