const AppError = require('../utils/appError');
const { extractTextFromPdf } = require('./pdfParserService');
const { extractTextFromDocx } = require('./docxParserService');
const { extractTextFromPlainTextFile } = require('./textFileParserService');
const { extractTextFromImage } = require('./imageOcrService');

const extractTextByDocumentType = async ({ filePath, documentType, documentLabel, enableImageOcr }) => {
  switch (documentType) {
    case 'pdf':
      return extractTextFromPdf(filePath, { documentLabel });
    case 'docx':
      return extractTextFromDocx(filePath, { documentLabel });
    case 'text':
      return extractTextFromPlainTextFile(filePath, { documentLabel });
    case 'image':
      return extractTextFromImage(filePath, { documentLabel, enabled: enableImageOcr });
    default:
      throw new AppError('Unsupported document type.', 400);
  }
};

module.exports = {
  extractTextByDocumentType
};
