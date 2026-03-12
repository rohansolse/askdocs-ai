const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AppError = require('../utils/appError');
const { isSupportedUpload, SUPPORTED_EXTENSION_LABEL } = require('../config/documentTypes');

const uploadDirectory = path.resolve(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirectory),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!isSupportedUpload(file)) {
    cb(
      new AppError(`Unsupported file type. Allowed types: ${SUPPORTED_EXTENSION_LABEL}.`, 400)
    );
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

module.exports = upload;
