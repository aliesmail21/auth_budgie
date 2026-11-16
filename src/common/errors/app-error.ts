import { ErrorCode, ErrorCodeType } from './error-codes';

export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: ErrorCodeType, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, ErrorCode.BAD_REQUEST, 400, details);
  }

  static unauthorized(message: string = 'Unauthorized', details?: unknown): AppError {
    return new AppError(message, ErrorCode.UNAUTHORIZED, 401, details);
  }

  static forbidden(message: string = 'Forbidden', details?: unknown): AppError {
    return new AppError(message, ErrorCode.FORBIDDEN, 403, details);
  }

  static notFound(message: string, details?: unknown): AppError {
    return new AppError(message, ErrorCode.NOT_FOUND, 404, details);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(message, ErrorCode.CONFLICT, 409, details);
  }

  static unprocessableEntity(message: string, details?: unknown): AppError {
    return new AppError(message, ErrorCode.UNPROCESSABLE_ENTITY, 422, details);
  }

  static internal(message: string = 'An unexpected internal error occurred'): AppError {
    return new AppError(message, ErrorCode.INTERNAL_SERVER_ERROR, 500);
  }
}
