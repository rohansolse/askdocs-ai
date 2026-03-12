const asyncHandler = require('../utils/asyncHandler');
const { processDocumentUpload } = require('../services/documentService');
const { listDocuments } = require('../services/vectorSearchService');

const uploadDocument = asyncHandler(async (req, res) => {
  const document = await processDocumentUpload(req.file);

  res.status(201).json({
    message: 'Document uploaded successfully.',
    document
  });
});

const getDocuments = asyncHandler(async (req, res) => {
  const documents = await listDocuments();

  res.json({
    documents
  });
});

module.exports = {
  uploadDocument,
  getDocuments
};

