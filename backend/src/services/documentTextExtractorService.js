const AppError = require('../utils/appError');
const { extractTextFromPdf } = require('./pdfParserService');
const { extractTextFromDocx } = require('./docxParserService');
const { extractTextFromPlainTextFile } = require('./textFileParserService');
const { extractTextFromImage } = require('./imageOcrService');

const extractTextByDocumentType = async ({ filePath, documentType }) => {
  switch (documentType) {
    case 'pdf':
      return extractTextFromPdf(filePath);
    case 'docx':
      return extractTextFromDocx(filePath);
    case 'text':
      return extractTextFromPlainTextFile(filePath);
    case 'image':
      return extractTextFromImage(filePath);
    default:
      throw new AppError('Unsupported document type.', 400);
  }
};

module.exports = {
  extractTextByDocumentType
};
