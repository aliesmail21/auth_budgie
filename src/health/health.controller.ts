import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService, LivenessResult, ReadinessResult } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get(['live', 'liveness'])
  @ApiOperation({
    summary: 'Process liveness probe',
    description:
      'Returns HTTP 200 indicating that the backend process is running and accepting HTTP requests.',
  })
  @ApiResponse({
    status: 200,
    description: 'Process is live and operational.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-10-28T11:45:00.000Z' },
      },
    },
  })
  getLive(): LivenessResult {
    return this.healthService.getLiveness();
  }

  @Get(['', 'ready', 'readiness'])
  @ApiOperation({
    summary: 'Dependency readiness probe',
    description:
      'Verifies external dependency connectivity (PostgreSQL). Returns 200 if ready, 503 if dependencies are unreachable.',
  })
  @ApiResponse({
    status: 200,
    description: 'All critical dependencies are healthy.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-10-28T11:45:00.000Z' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'up' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more critical dependencies are down.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'down' },
        timestamp: { type: 'string', example: '2026-10-28T11:45:00.000Z' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'down' },
          },
        },
      },
    },
  })
  async getReady(@Res({ passthrough: true }) res: Response): Promise<ReadinessResult> {
    const { isHealthy, result } = await this.healthService.getReadiness();

    if (!isHealthy) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }
}
