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

  // Data an ApiError attaches on purpose for the client (e.g. a phone
  // verification token on PROFILE_REQUIRED). Never set for unexpected errors.
  if (err instanceof Error && err.statusCode && err.statusCode < 500 &&
      err.data && typeof err.data === 'object' && !Array.isArray(err.data)) {
    response.data = err.data;
  }

  res.status(error.statusCode).json(response);
};

export default errorMiddleware;
