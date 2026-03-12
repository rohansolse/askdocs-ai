const errorHandler = (error, req, res, next) => {
  const statusCode =
    error.code === 'LIMIT_FILE_SIZE' ? 400 : error.statusCode || 500;
  const message =
    error.code === 'LIMIT_FILE_SIZE'
      ? 'File size exceeds the 20MB upload limit.'
      : error.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'test') {
    console.error(error);
  }

  res.status(statusCode).json({
    message
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
