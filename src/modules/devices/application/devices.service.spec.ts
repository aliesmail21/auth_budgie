import { DevicesService } from './devices.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AppError } from '../../../common/errors/app-error';

describe('DevicesService', () => {
  let service: DevicesService;
  let mockPrisma: {
    deviceSession: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    refreshToken: {
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      deviceSession: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };
    service = new DevicesService(mockPrisma as unknown as PrismaService);
  });

  describe('listDevices', () => {
    it('should list active sessions and flag the current session', async () => {
      mockPrisma.deviceSession.findMany.mockResolvedValue([
        {
          id: 'session-1',
          deviceName: 'Pixel 8',
          deviceType: 'mobile',
          deviceIdentifier: null,
          ipAddress: '127.0.0.1',
          userAgent: 'Dart/Flutter',
          createdAt: new Date('2026-01-01'),
          lastUsedAt: new Date('2026-01-02'),
        },
        {
          id: 'session-2',
          deviceName: 'iPad Pro',
          deviceType: 'tablet',
          deviceIdentifier: null,
          ipAddress: '192.168.1.5',
          userAgent: 'Dart/Flutter',
          createdAt: new Date('2026-01-01'),
          lastUsedAt: new Date('2026-01-01'),
        },
      ]);

      const devices = await service.listDevices('user-1', 'session-1');

      expect(devices).toHaveLength(2);
      expect(devices[0]!.id).toBe('session-1');
      expect(devices[0]!.isCurrent).toBe(true);
      expect(devices[1]!.id).toBe('session-2');
      expect(devices[1]!.isCurrent).toBe(false);
    });
  });

  describe('revokeDevice', () => {
    it('should revoke a session if user owns it', async () => {
      mockPrisma.deviceSession.findUnique.mockResolvedValue({
        id: 'session-2',
        userId: 'user-1',
        revokedAt: null,
      });

      const res = await service.revokeDevice('user-1', 'session-2');

      expect(res.message).toContain('revoked successfully');
      expect(mockPrisma.deviceSession.update).toHaveBeenCalled();
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('should reject revocation and throw AppError if session belongs to another user', async () => {
      mockPrisma.deviceSession.findUnique.mockResolvedValue({
        id: 'session-victim',
        userId: 'other-user',
        revokedAt: null,
      });

      await expect(service.revokeDevice('user-attacker', 'session-victim')).rejects.toThrow(
        AppError,
      );
    });

    it('should throw AppError if session does not exist', async () => {
      mockPrisma.deviceSession.findUnique.mockResolvedValue(null);

      await expect(service.revokeDevice('user-1', 'nonexistent')).rejects.toThrow(AppError);
    });

    it('should return already revoked message if session was previously revoked', async () => {
      mockPrisma.deviceSession.findUnique.mockResolvedValue({
        id: 'session-2',
        userId: 'user-1',
        revokedAt: new Date(),
      });

      const res = await service.revokeDevice('user-1', 'session-2');
      expect(res.message).toContain('already revoked');
      expect(mockPrisma.deviceSession.update).not.toHaveBeenCalled();
    });
  });
});
