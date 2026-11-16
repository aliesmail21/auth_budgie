import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../infrastructure/database/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let mockPrismaService: { ping: jest.Mock };

  beforeEach(async () => {
    mockPrismaService = {
      ping: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  describe('getLiveness', () => {
    it('should return status ok with current timestamp', () => {
      const live = service.getLiveness();
      expect(live.status).toBe('ok');
      expect(live.timestamp).toBeDefined();
      expect(new Date(live.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('getReadiness', () => {
    it('should return isHealthy true and status ok when database ping succeeds', async () => {
      mockPrismaService.ping.mockResolvedValue(true);

      const readiness = await service.getReadiness();
      expect(readiness.isHealthy).toBe(true);
      expect(readiness.result.status).toBe('ok');
      expect(readiness.result.checks.database).toBe('up');
    });

    it('should return isHealthy false and status down when database ping fails', async () => {
      mockPrismaService.ping.mockResolvedValue(false);

      const readiness = await service.getReadiness();
      expect(readiness.isHealthy).toBe(false);
      expect(readiness.result.status).toBe('down');
      expect(readiness.result.checks.database).toBe('down');
    });
  });
});
