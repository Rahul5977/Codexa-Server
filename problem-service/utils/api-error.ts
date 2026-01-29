type ErrorDetails = Record<string, unknown> | unknown[];

interface ApiErrorResponse {
  statusCode: number;
  message: string;
  success: false;
  errors: ErrorDetails;
  stack?: string;
}

class ApiError extends Error {
  public statusCode: number;
  public success: false;
  public errors: ErrorDetails;
  public isOperational: boolean;

  constructor(
    statusCode: number,
    message = "Something went wrong",
    errors: ErrorDetails = [],
    stack = "",
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.isOperational = true; // Distinguish operational errors from programming errors

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): ApiErrorResponse {
    return {
      statusCode: this.statusCode,
      message: this.message,
      success: this.success,
      errors: this.errors,
      ...(process.env.NODE_ENV === "development" && { stack: this.stack }),
    };
  }

  // Factory methods for common errors
  static badRequest(
    message = "Bad request",
    errors: ErrorDetails = [],
  ): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(
    message = "Unauthorized",
    errors: ErrorDetails = [],
  ): ApiError {
    return new ApiError(401, message, errors);
  }

  static forbidden(message = "Forbidden", errors: ErrorDetails = []): ApiError {
    return new ApiError(403, message, errors);
  }

  static notFound(
    message = "Resource not found",
    errors: ErrorDetails = [],
  ): ApiError {
    return new ApiError(404, message, errors);
  }

  static conflict(message = "Conflict", errors: ErrorDetails = []): ApiError {
    return new ApiError(409, message, errors);
  }

  static tooManyRequests(
    message = "Too many requests",
    errors: ErrorDetails = [],
  ): ApiError {
    return new ApiError(429, message, errors);
  }

  static internal(
    message = "Internal server error",
    errors: ErrorDetails = [],
  ): ApiError {
    return new ApiError(500, message, errors);
  }

  static serviceUnavailable(
    message = "Service unavailable",
    errors: ErrorDetails = [],
  ): ApiError {
    return new ApiError(503, message, errors);
  }
}

export { ApiError, type ApiErrorResponse, type ErrorDetails };
