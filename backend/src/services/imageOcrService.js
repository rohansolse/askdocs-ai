const { execFile } = require('child_process');
const { promisify } = require('util');
const env = require('../config/env');
const AppError = require('../utils/appError');
const { logTiming, measureAsync } = require('../utils/performance');

const execFileAsync = promisify(execFile);

const extractTextFromImage = async (filePath, options = {}) => {
  const enabled = options.enabled ?? env.imageOcr.enabled;

  if (!enabled) {
    logTiming('ocr', 0, {
      document: options.documentLabel,
      type: 'image',
      skipped: true
    });
    throw new AppError(
      'Image OCR is disabled for this upload. Enable OCR to process PNG or JPEG files.',
      400
    );
  }

  return measureAsync(
    'ocr',
    async () => {
      try {
        const { stdout } = await execFileAsync('tesseract', [filePath, 'stdout', '-l', 'eng'], {
          maxBuffer: 20 * 1024 * 1024
        });

        return (stdout || '').replace(/\u0000/g, ' ').trim();
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new AppError(
            'Tesseract OCR is not installed. Install the local `tesseract` binary to process image documents.',
            500
          );
        }

        throw new AppError(
          error.stderr?.trim() || error.message || 'Failed to extract text from the image document.',
          500
        );
      }
    },
    {
      document: options.documentLabel,
      type: 'image'
    }
  );
};

module.exports = {
  extractTextFromImage
};
