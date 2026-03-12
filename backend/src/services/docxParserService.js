const mammoth = require('mammoth');

const extractTextFromDocx = async (filePath) => {
  const result = await mammoth.extractRawText({
    path: filePath
  });

  return (result.value || '').replace(/\u0000/g, ' ').trim();
};

module.exports = {
  extractTextFromDocx
};
