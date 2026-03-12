const path = require('path');

const DOCUMENT_TYPE_BY_EXTENSION = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.txt': 'text',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image'
};

const DOCUMENT_TYPE_BY_MIME = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'text',
  'image/png': 'image',
  'image/jpeg': 'image'
};

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg'
]);

const SUPPORTED_EXTENSION_LABEL = '.pdf, .docx, .txt, .png, .jpg, .jpeg';

const getDocumentType = (file) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  return DOCUMENT_TYPE_BY_EXTENSION[extension] || DOCUMENT_TYPE_BY_MIME[file.mimetype] || null;
};

const isSupportedUpload = (file) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  return Boolean(DOCUMENT_TYPE_BY_EXTENSION[extension]) || ALLOWED_MIME_TYPES.has(file.mimetype);
};

module.exports = {
  ALLOWED_MIME_TYPES,
  SUPPORTED_EXTENSION_LABEL,
  getDocumentType,
  isSupportedUpload
};
