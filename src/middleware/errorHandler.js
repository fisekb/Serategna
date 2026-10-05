function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  let statusCode = Number(err.statusCode || err.status) || 500;
  let message = err.message || 'Internal server error';
  let details;

  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'A record with one or more of these values already exists.';
    details = (err.errors || []).map(({ path, message: detail }) => ({ field: path, message: detail }));
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = (err.errors || []).map(({ path, message: detail }) => ({ field: path, message: detail }));
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 409;
    message = 'This record is still referenced by other records.';
  } else if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
    statusCode = 401;
    message = err.name === 'TokenExpiredError' ? 'Authentication token has expired.' : 'Authentication token is invalid.';
  }

  if (statusCode < 400 || statusCode > 599) {
    statusCode = 500;
  }

  if (statusCode >= 500) {
    console.error(err);
    if (isProduction) {
      message = 'Internal server error';
    }
  }

  const data = {};
  if (details) {
    data.errors = details;
  }
  if (!isProduction && statusCode >= 500) {
    data.stack = err.stack;
  }

  return res.status(statusCode).json({
    success: false,
    message,
    data: Object.keys(data).length > 0 ? data : null
  });
}

module.exports = errorHandler;
