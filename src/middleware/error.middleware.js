import {
  getErrorStatusCode,
  sanitizeErrorDetails,
  toFriendlyError
} from '../utils/friendlyError.js';

const errorMiddleware = (err, req, res, next) => {
  let error = { ...err };
  error.statusCode = getErrorStatusCode(err);
  error.message = toFriendlyError(err);

  if (err.name === 'CastError') {
    error.message = toFriendlyError(err);
    error.statusCode = getErrorStatusCode(err);
  }

  if (err.code === 11000) {
    error.message = toFriendlyError(err);
    error.statusCode = getErrorStatusCode(err);
  }

  if (err.name === 'ValidationError') {
    error.message = toFriendlyError(err);
    error.statusCode = getErrorStatusCode(err);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message
  };

  const details = sanitizeErrorDetails(err.errors);
  if (details?.length) {
    response.errors = details;
  }

  res.status(error.statusCode).json(response);
};

export default errorMiddleware;
