import { OnboardingService } from './onboarding.service';
import { ProfileService } from './profile.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AppError } from '../../../../common/errors/app-error';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let profileService: ProfileService;
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
    const prisma = mockPrisma as unknown as PrismaService;
    profileService = new ProfileService(prisma);
    service = new OnboardingService(prisma, profileService);
  });

  describe('updateStep1', () => {
    it('should save step 1 currency and timezone', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
        baseCurrencyCode: 'EGP',
        timezone: 'Africa/Cairo',
        openingBalanceMinor: null,
        openingBalanceDate: null,
        language: null,
        locale: null,
        digitsPreference: null,
        onboardingCompleted: false,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const state = await service.updateStep1('user-1', {
        baseCurrencyCode: 'EGP',
        timezone: 'Africa/Cairo',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { baseCurrencyCode: 'EGP', timezone: 'Africa/Cairo' },
      });
      expect(state.step1.isCompleted).toBe(true);
      expect(state.step1.baseCurrencyCode).toBe('EGP');
    });
  });

  describe('completeOnboarding', () => {
    it('should reject completeOnboarding if step 1 or step 2 is incomplete', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
        baseCurrencyCode: null,
        timezone: null,
        openingBalanceMinor: null,
        openingBalanceDate: null,
        onboardingCompleted: false,
      });

      await expect(
        service.completeOnboarding('user-1', {
          language: 'en',
          locale: 'en-US',
          digitsPreference: 'western',
        }),
      ).rejects.toThrow(AppError);
    });

    it('should finalize onboarding when prerequisites are satisfied', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
        baseCurrencyCode: 'USD',
        timezone: 'UTC',
        openingBalanceMinor: BigInt(100000),
        openingBalanceDate: new Date('2026-01-01'),
        onboardingCompleted: false,
      });

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test',
        emailVerified: true,
        emailVerifiedAt: null,
        accountStatus: 'ACTIVE',
        baseCurrencyCode: 'USD',
        timezone: 'UTC',
        openingBalanceMinor: BigInt(100000),
        openingBalanceDate: new Date('2026-01-01'),
        language: 'en',
        locale: 'en-US',
        digitsPreference: 'western',
        onboardingCompleted: true,
        createdAt: new Date(),
        lastLoginAt: null,
        deletedAt: null,
      });

      const profile = await service.completeOnboarding('user-1', {
        language: 'en',
        locale: 'en-US',
        digitsPreference: 'western',
      });

      expect(profile.onboardingCompleted).toBe(true);
    });
  });
});
