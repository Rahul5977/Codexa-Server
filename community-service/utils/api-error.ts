type ErrorDetails = Record<string, unknown> | unknown[]

export class ApiError extends Error {
  public statusCode: number
  public success: false
  public errors: ErrorDetails

  constructor(statusCode: number, message: string, errors: ErrorDetails = []) {
    super(message)
    this.statusCode = statusCode
    this.success = false
    this.errors = errors
  }

  static badRequest(message = 'Bad request', errors: ErrorDetails = []) {
    return new ApiError(400, message, errors)
  }

  static unauthorized(message = 'Unauthorized', errors: ErrorDetails = []) {
    return new ApiError(401, message, errors)
  }

  static forbidden(message = 'Forbidden', errors: ErrorDetails = []) {
    return new ApiError(403, message, errors)
  }

  static notFound(message = 'Not found', errors: ErrorDetails = []) {
    return new ApiError(404, message, errors)
  }
}
