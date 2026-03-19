import ApiError from '../utils/ApiError.js';

export const validate = (schema) => {
  return (req, res, next) => {

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    });

    if (error) {

      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new ApiError(400, 'Validation failed', errors));
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

      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new ApiError(400, 'Validation failed', errors));
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

      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new ApiError(400, 'Validation failed', errors));
    }

    req.params = value;

    next();
  };
};

export default validate;