import { ProfileService } from './profile.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AppError } from '../../../../common/errors/app-error';

describe('ProfileService', () => {
  let service: ProfileService;
  let mockPrisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new ProfileService(mockPrisma as unknown as PrismaService);
  });

  describe('getMe', () => {
    it('should return user profile when user exists and is active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        emailVerified: true,
        emailVerifiedAt: new Date('2026-01-01'),
        accountStatus: 'ACTIVE',
        baseCurrencyCode: 'EGP',
        openingBalanceMinor: BigInt(500000),
        openingBalanceDate: new Date('2026-01-01'),
        timezone: 'Africa/Cairo',
        language: 'en',
        locale: 'en-US',
        digitsPreference: 'western',
        onboardingCompleted: true,
        createdAt: new Date('2026-01-01'),
        lastLoginAt: new Date('2026-01-02'),
        deletedAt: null,
      });

      const profile = await service.getMe('user-1');

      expect(profile.id).toBe('user-1');
      expect(profile.email).toBe('user@example.com');
      expect(profile.openingBalanceMinor).toBe('500000');
    });

    it('should throw AppError.notFound if user is soft deleted', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: new Date(),
      });

      await expect(service.getMe('user-1')).rejects.toThrow(AppError);
    });
  });

  describe('updateMe', () => {
    it('should update profile fields successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Old Name',
        timezone: 'UTC',
        language: 'en',
        locale: 'en-US',
        digitsPreference: 'western',
        deletedAt: null,
        createdAt: new Date(),
        lastLoginAt: null,
        emailVerified: true,
        emailVerifiedAt: null,
        accountStatus: 'ACTIVE',
        baseCurrencyCode: 'USD',
        openingBalanceMinor: null,
        openingBalanceDate: null,
        onboardingCompleted: false,
      });

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'New Name',
        timezone: 'Africa/Cairo',
        language: 'ar',
        locale: 'ar-EG',
        digitsPreference: 'eastern_arabic',
        deletedAt: null,
        createdAt: new Date(),
        lastLoginAt: null,
        emailVerified: true,
        emailVerifiedAt: null,
        accountStatus: 'ACTIVE',
        baseCurrencyCode: 'USD',
        openingBalanceMinor: null,
        openingBalanceDate: null,
        onboardingCompleted: false,
      });

      const result = await service.updateMe('user-1', {
        displayName: 'New Name',
        timezone: 'Africa/Cairo',
        language: 'ar',
        locale: 'ar-EG',
        digitsPreference: 'eastern_arabic',
      });

      expect(result.displayName).toBe('New Name');
      expect(result.timezone).toBe('Africa/Cairo');
      expect(result.language).toBe('ar');
    });
  });
});
