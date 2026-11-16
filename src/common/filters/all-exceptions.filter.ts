import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCode, ErrorCodeType } from '../errors/error-codes';

interface ErrorResponseBody {
  statusCode: number;
  errorCode: ErrorCodeType | string;
  message: string;
  timestamp: string;
  path: string;
  requestId: string;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const rawRequestId =
      (request.headers['x-request-id'] as string) ||
      (request as unknown as { id?: string }).id ||
      'unknown';
    const requestId = this.sanitizeRequestId(rawRequestId);

    // Ensure the response header reflects the correlation ID
    if (!response.getHeader('x-request-id')) {
      response.setHeader('x-request-id', requestId);
    }

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: ErrorCodeType | string = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: unknown = undefined;

    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      errorCode = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const respObj = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(respObj.message)) {
          message = 'Validation failed';
          details = respObj.message;
        } else {
          message = typeof respObj.message === 'string' ? respObj.message : exception.message;
          details = respObj.details;
        }
        errorCode = (respObj.errorCode as string) || this.mapStatusToErrorCode(statusCode);
      } else {
        message = String(exceptionResponse);
        errorCode = this.mapStatusToErrorCode(statusCode);
      }
    } else if (exception instanceof Error) {
      // Unhandled server error: log once with full context and requestId
      this.logger.error(
        `Unhandled Exception [${requestId}]: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `Unknown non-error exception thrown [${requestId}]: ${JSON.stringify(exception)}`,
      );
    }

    // Never leak stack traces, database errors, or internal messages on 500s
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      message = 'An unexpected internal server error occurred.';
      errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
      details = undefined;
    }

    const responseBody: ErrorResponseBody = {
      statusCode,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      ...(details !== undefined ? { details } : {}),
    };

    response.status(statusCode).json(responseBody);
  }

  private mapStatusToErrorCode(status: number): ErrorCodeType | string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.UNPROCESSABLE_ENTITY;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      case HttpStatus.REQUEST_TIMEOUT:
        return ErrorCode.REQUEST_TIMEOUT;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SERVICE_UNAVAILABLE;
      default:
        return status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : 'HTTP_ERROR';
    }
  }

  private sanitizeRequestId(id: string): string {
    // Only permit safe alphanumeric characters and hyphens, up to 64 chars
    const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '');
    return cleaned.length > 0 && cleaned.length <= 64 ? cleaned : 'generated-' + Date.now();
  }
}
