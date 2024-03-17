class ApiError extends Error {
  constructor(
    message = "An error occurred while processing your request.",
    statusCode,
    error = [],
    stack
  ) { 
    super(message);
    this.statusCode = statusCode || 500;
    this.errors = error;
    this.data = null;
    this.message = message;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export {ApiError}