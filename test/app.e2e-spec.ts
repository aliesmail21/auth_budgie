import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Post, Body, UsePipes, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { z } from 'zod';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';
import { AppError } from '../src/common/errors/app-error';

const sampleInputSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
});

@Controller('test-validation')
class TestValidationController {
  @Post()
  @UsePipes(new ZodValidationPipe(sampleInputSchema))
  handle(@Body() body: unknown): { success: boolean; data: unknown } {
    return { success: true, data: body };
  }

  @Post('unauthorized')
  triggerUnauthorized(): void {
    throw AppError.unauthorized('Invalid credentials');
  }

  @Post('forbidden')
  triggerForbidden(): void {
    throw AppError.forbidden('Access denied');
  }

  @Post('conflict')
  triggerConflict(): void {
    throw AppError.conflict('Email already in use');
  }
}

describe('Budgie Backend - Application Foundation (e2e)', () => {
  let app: INestApplication;
  let mockPrismaPing: jest.Mock;

  beforeAll(async () => {
    // Provide safe test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test_user:test_pass@localhost:5432/budgie_test';
    process.env.PORT = '3001';
    process.env.HOST = '127.0.0.1';
    process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000';
    process.env.LOG_LEVEL = 'warn';
    process.env.SWAGGER_ENABLED = 'false';

    mockPrismaPing = jest.fn().mockResolvedValue(true);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestValidationController],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        ping: mockPrismaPing,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'health/(.*)', 'docs', 'docs/(.*)'],
    });

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /health/live (Liveness Probe)', () => {
    it('should return HTTP 200 with status ok and ISO timestamp', async () => {
      const response = await request(app.getHttpServer()).get('/health/live').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('GET /health/ready (Readiness Probe)', () => {
    it('should return HTTP 200 with database check up when database is healthy', async () => {
      mockPrismaPing.mockResolvedValueOnce(true);

      const response = await request(app.getHttpServer()).get('/health/ready').expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        checks: {
          database: 'up',
        },
      });
    });

    it('should return HTTP 503 with database check down when database is unreachable', async () => {
      mockPrismaPing.mockResolvedValueOnce(false);

      const response = await request(app.getHttpServer()).get('/health/ready').expect(503);

      expect(response.body).toEqual({
        status: 'down',
        timestamp: expect.any(String),
        checks: {
          database: 'down',
        },
      });
    });
  });

  describe('Request Correlation & ID Handling', () => {
    it('should preserve and reflect client-provided x-request-id in response header', async () => {
      const customId = 'client-trace-id-998877';

      const response = await request(app.getHttpServer())
        .get('/health/live')
        .set('x-request-id', customId)
        .expect(200);

      expect(response.headers['x-request-id']).toBe(customId);
    });

    it('should generate an x-request-id if none is provided', async () => {
      const response = await request(app.getHttpServer()).get('/health/live').expect(200);

      const headerId = response.headers['x-request-id'];
      expect(typeof headerId).toBe('string');
      expect((headerId as string).length).toBeGreaterThan(0);
    });
  });

  describe('HTTP Boundary Validation with Zod', () => {
    it('should successfully validate and pass valid payload', async () => {
      const payload = { amount: 150.5, currency: 'USD' };

      const response = await request(app.getHttpServer())
        .post('/api/v1/test-validation')
        .send(payload)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: payload,
      });
    });

    it('should return HTTP 400 with structured validation errors when payload is invalid', async () => {
      const invalidPayload = { amount: -25, currency: 'TOOLONG' };

      const response = await request(app.getHttpServer())
        .post('/api/v1/test-validation')
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        path: '/api/v1/test-validation',
      });
      expect(Array.isArray(response.body.details)).toBe(true);
      expect(response.body.details.length).toBe(2);
    });
  });

  describe('Global Error Handling Envelope', () => {
    it('should return predictable JSON error response for unmapped routes', async () => {
      const customId = 'error-test-trace-id';

      const response = await request(app.getHttpServer())
        .get('/api/v1/non-existent-resource')
        .set('x-request-id', customId)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        path: '/api/v1/non-existent-resource',
        requestId: customId,
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should format 401 UNAUTHORIZED responses in standard envelope', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/test-validation/unauthorized')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
        message: 'Invalid credentials',
        path: '/api/v1/test-validation/unauthorized',
      });
    });

    it('should format 403 FORBIDDEN responses in standard envelope', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/test-validation/forbidden')
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        message: 'Access denied',
        path: '/api/v1/test-validation/forbidden',
      });
    });

    it('should format 409 CONFLICT responses in standard envelope', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/test-validation/conflict')
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        errorCode: 'CONFLICT',
        message: 'Email already in use',
        path: '/api/v1/test-validation/conflict',
      });
    });
  });
});
