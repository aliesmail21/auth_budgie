import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service';

export interface LivenessResult {
  status: 'ok';
  timestamp: string;
}

export interface ReadinessResult {
  status: 'ok' | 'down';
  timestamp: string;
  checks: {
    database: 'up' | 'down';
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prismaService: PrismaService) {}

  getLiveness(): LivenessResult {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<{ isHealthy: boolean; result: ReadinessResult }> {
    const isDbConnected = await this.prismaService.ping();

    const isHealthy = isDbConnected;
    const result: ReadinessResult = {
      status: isHealthy ? 'ok' : 'down',
      timestamp: new Date().toISOString(),
      checks: {
        database: isDbConnected ? 'up' : 'down',
      },
    };

    if (!isHealthy) {
      this.logger.warn('Readiness check reported degraded status: database is down.');
    }

    return { isHealthy, result };
  }
}
