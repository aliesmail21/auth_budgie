import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export interface ApiStandardErrorsOptions {
  auth?: boolean;
  conflict?: boolean;
}

/**
 * Standard Swagger decorator documenting uniform API error response envelopes.
 * Defaults to 400 Bad Request, 404 Not Found, and 500 Internal Server Error.
 * Set `options.auth: true` to include 401 & 403.
 * Set `options.conflict: true` to include 409.
 */
export function ApiStandardErrors(
  options?: ApiStandardErrorsOptions,
): MethodDecorator & ClassDecorator {
  const decorators = [
    ApiResponse({
      status: 400,
      description: 'Bad Request / Input Validation Failed',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          errorCode: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Validation failed' },
          timestamp: { type: 'string', example: '2026-10-28T12:00:00.000Z' },
          path: { type: 'string', example: '/api/v1/resource' },
          requestId: { type: 'string', example: 'd8a1c9e2-4b2a-4a81-9b11-9a7f34c56e01' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'amount' },
                message: { type: 'string', example: 'Expected positive number' },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Resource Not Found',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          errorCode: { type: 'string', example: 'NOT_FOUND' },
          message: { type: 'string', example: 'Resource not found' },
          timestamp: { type: 'string', example: '2026-10-28T12:00:00.000Z' },
          path: { type: 'string', example: '/api/v1/resource/123' },
          requestId: { type: 'string', example: 'd8a1c9e2-4b2a-4a81-9b11-9a7f34c56e01' },
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error (details masked)',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 500 },
          errorCode: { type: 'string', example: 'INTERNAL_SERVER_ERROR' },
          message: {
            type: 'string',
            example: 'An unexpected internal server error occurred.',
          },
          timestamp: { type: 'string', example: '2026-10-28T12:00:00.000Z' },
          path: { type: 'string', example: '/api/v1/resource' },
          requestId: { type: 'string', example: 'd8a1c9e2-4b2a-4a81-9b11-9a7f34c56e01' },
        },
      },
    }),
  ];

  if (options?.auth) {
    decorators.push(
      ApiResponse({
        status: 401,
        description: 'Unauthorized / Missing or Invalid Authentication Token',
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 401 },
            errorCode: { type: 'string', example: 'UNAUTHORIZED' },
            message: { type: 'string', example: 'Unauthorized' },
            timestamp: { type: 'string', example: '2026-10-28T12:00:00.000Z' },
            path: { type: 'string', example: '/api/v1/resource' },
            requestId: { type: 'string', example: 'd8a1c9e2-4b2a-4a81-9b11-9a7f34c56e01' },
          },
        },
      }),
      ApiResponse({
        status: 403,
        description: 'Forbidden / Insufficient Permissions',
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 403 },
            errorCode: { type: 'string', example: 'FORBIDDEN' },
            message: { type: 'string', example: 'Forbidden resource' },
            timestamp: { type: 'string', example: '2026-10-28T12:00:00.000Z' },
            path: { type: 'string', example: '/api/v1/resource' },
            requestId: { type: 'string', example: 'd8a1c9e2-4b2a-4a81-9b11-9a7f34c56e01' },
          },
        },
      }),
    );
  }

  if (options?.conflict) {
    decorators.push(
      ApiResponse({
        status: 409,
        description: 'Conflict / Resource Already Exists or Version Mismatch',
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 409 },
            errorCode: { type: 'string', example: 'CONFLICT' },
            message: { type: 'string', example: 'Resource already exists' },
            timestamp: { type: 'string', example: '2026-10-28T12:00:00.000Z' },
            path: { type: 'string', example: '/api/v1/resource' },
            requestId: { type: 'string', example: 'd8a1c9e2-4b2a-4a81-9b11-9a7f34c56e01' },
          },
        },
      }),
    );
  }

  return applyDecorators(...decorators);
}
