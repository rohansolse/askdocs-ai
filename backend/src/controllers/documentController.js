const asyncHandler = require('../utils/asyncHandler');
const { processMultipleDocumentUploads } = require('../services/documentService');
const { listDocuments } = require('../services/vectorSearchService');

const uploadDocument = asyncHandler(async (req, res) => {
  const documents = await processMultipleDocumentUploads(req.files, {
    enableImageOcr: req.body?.enableImageOcr
  });

  res.status(201).json({
    message:
      documents.length === 1
        ? 'Document uploaded successfully.'
        : `${documents.length} documents uploaded successfully.`,
    documents
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
