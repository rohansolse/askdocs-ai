const { execFile } = require('child_process');
const { promisify } = require('util');
const AppError = require('../utils/appError');

const execFileAsync = promisify(execFile);

const extractTextFromImage = async (filePath) => {
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
};

module.exports = {
  extractTextFromImage
};
