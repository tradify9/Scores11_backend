import ApiError from '../utils/ApiError.js';
import { friendlyValidationMessage, sanitizeErrorDetails } from '../utils/friendlyError.js';

export const validate = (schema) => {
  return (req, res, next) => {

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    });

    if (error) {
      console.error('Validation errors:', error.details);
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      const errorMessage = friendlyValidationMessage(error.details);
      return next(new ApiError(400, errorMessage, { details: sanitizeErrorDetails(errors) }));
    }

    req.body = value;

    next();
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {

    const { error, value } = schema.validate(req.query, {
      abortEarly: false
    });

    if (error) {
      console.error('Query validation errors:', error.details);
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      const errorMessage = friendlyValidationMessage(error.details, 'Query validation');
      return next(new ApiError(400, errorMessage, { details: sanitizeErrorDetails(errors) }));
    }

    req.query = value;

    next();
  };
};

export const validateParams = (schema) => {
  return (req, res, next) => {

    const { error, value } = schema.validate(req.params, {
      abortEarly: false
    });

    if (error) {
      console.error('Params validation errors:', error.details);
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      const errorMessage = friendlyValidationMessage(error.details, 'Params validation');
      return next(new ApiError(400, errorMessage, { details: sanitizeErrorDetails(errors) }));
    }

    req.params = value;

    next();
  };
};

export default validate;
