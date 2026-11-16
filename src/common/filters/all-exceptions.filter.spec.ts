import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
    getHeader: jest.Mock;
    setHeader: jest.Mock;
  };
  let mockRequest: {
    url: string;
    headers: Record<string, string>;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeader: jest.fn().mockReturnValue(undefined),
      setHeader: jest.fn().mockReturnThis(),
    };
    mockRequest = {
      url: '/test-url',
      headers: {
        'x-request-id': 'req-test-123',
      },
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should handle HttpException and map status and message correctly', () => {
    const exception = new HttpException('Resource not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        errorCode: ErrorCode.NOT_FOUND,
        message: 'Resource not found',
        path: '/test-url',
        requestId: 'req-test-123',
      }),
    );
  });

  it('should handle AppError domain exceptions', () => {
    const exception = AppError.badRequest('Custom domain failure', { item: 'budget' });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errorCode: ErrorCode.BAD_REQUEST,
        message: 'Custom domain failure',
        details: { item: 'budget' },
        requestId: 'req-test-123',
      }),
    );
  });

  it('should mask internal errors (500) and not leak stack trace or internal message', () => {
    const exception = new Error('Database password was incorrect or syntax error in SELECT *');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected internal server error occurred.',
        path: '/test-url',
        requestId: 'req-test-123',
      }),
    );
    // Ensure internal error details are not in json response
    const jsonCallArg = mockResponse.json.mock.calls[0][0];
    expect(jsonCallArg.details).toBeUndefined();
    expect(JSON.stringify(jsonCallArg)).not.toContain('Database password');
  });

  it('should normalize array messages from HttpException into details array and set string message', () => {
    const exception = new HttpException(
      {
        message: ['field1 is required', 'field2 must be positive'],
        error: 'Bad Request',
        statusCode: 400,
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errorCode: ErrorCode.BAD_REQUEST,
        message: 'Validation failed',
        details: ['field1 is required', 'field2 must be positive'],
        path: '/test-url',
        requestId: 'req-test-123',
      }),
    );
  });

  it('should map UNAUTHORIZED, FORBIDDEN, CONFLICT, and UNPROCESSABLE_ENTITY correctly', () => {
    const unauthorizedErr = AppError.unauthorized('Invalid token');
    filter.catch(unauthorizedErr, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        errorCode: ErrorCode.UNAUTHORIZED,
        message: 'Invalid token',
      }),
    );

    const forbiddenErr = AppError.forbidden('Access denied');
    filter.catch(forbiddenErr, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        errorCode: ErrorCode.FORBIDDEN,
        message: 'Access denied',
      }),
    );

    const conflictErr = AppError.conflict('Resource already exists');
    filter.catch(conflictErr, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        errorCode: ErrorCode.CONFLICT,
        message: 'Resource already exists',
      }),
    );

    const unprocessableErr = AppError.unprocessableEntity('Cannot process ledger entry');
    filter.catch(unprocessableErr, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(422);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        errorCode: ErrorCode.UNPROCESSABLE_ENTITY,
        message: 'Cannot process ledger entry',
      }),
    );
  });
});
