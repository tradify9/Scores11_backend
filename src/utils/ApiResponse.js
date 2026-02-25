class ApiResponse {
  constructor(statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
  }

  static success(res, message, data, statusCode = 200) {
    return res.status(statusCode).json(new ApiResponse(statusCode, message, data));
  }

  static created(res, message = 'Created successfully', data) {
    return res.status(201).json(new ApiResponse(201, message, data));
  }

  static error(res, message, statusCode = 500) {
    return res.status(statusCode).json(new ApiResponse(statusCode, message, null));
  }
}

export default ApiResponse;
