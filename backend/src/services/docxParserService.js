const mammoth = require('mammoth');
const { measureAsync } = require('../utils/performance');

const extractTextFromDocx = async (filePath, options = {}) =>
  measureAsync(
    'file parsing',
    async () => {
      const result = await mammoth.extractRawText({
        path: filePath
      });

      return (result.value || '').replace(/\u0000/g, ' ').trim();
    },
    {
      document: options.documentLabel,
      type: 'docx'
    }
  );

module.exports = {
  extractTextFromDocx
};
