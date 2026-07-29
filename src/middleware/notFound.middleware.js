const notFoundMiddleware = (req, res, next) => {
  const error = new Error('This item is no longer available.');
  error.statusCode = 404;
  next(error);
};

export default notFoundMiddleware;
