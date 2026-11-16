import { AccountService } from './account.service';
import { ProfileService } from './services/profile.service';
import { OnboardingService } from './services/onboarding.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AppError } from '../../../common/errors/app-error';

describe('AccountService', () => {
  let service: AccountService;
  let profileService: ProfileService;
  let onboardingService: OnboardingService;
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
    onboardingService = new OnboardingService(prisma, profileService);
    service = new AccountService(profileService, onboardingService);
  });

  describe('getMe', () => {
    it('should return user profile when user exists', async () => {
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

    it('should throw AppError.notFound if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('missing')).rejects.toThrow(AppError);
    });
  });

  describe('onboarding flow', () => {
    it('should save step 1 currency and timezone', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
        baseCurrencyCode: 'EGP',
        timezone: 'Africa/Cairo',
        openingBalanceMinor: null,
        openingBalanceDate: null,
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
    });

    it('should reject completeOnboarding if step 1 or step 2 is incomplete', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
        baseCurrencyCode: 'EGP',
        timezone: 'Africa/Cairo',
        openingBalanceMinor: null, // missing step 2
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
        baseCurrencyCode: 'EGP',
        timezone: 'Africa/Cairo',
        openingBalanceMinor: BigInt(1000000),
        openingBalanceDate: new Date('2026-01-01'),
        onboardingCompleted: false,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User',
        emailVerified: false,
        emailVerifiedAt: null,
        accountStatus: 'ACTIVE',
        baseCurrencyCode: 'EGP',
        openingBalanceMinor: BigInt(1000000),
        openingBalanceDate: new Date('2026-01-01'),
        timezone: 'Africa/Cairo',
        language: 'ar',
        locale: 'ar-EG',
        digitsPreference: 'eastern_arabic',
        onboardingCompleted: true,
        createdAt: new Date('2026-01-01'),
        lastLoginAt: null,
        deletedAt: null,
      });

      const profile = await service.completeOnboarding('user-1', {
        language: 'ar',
        locale: 'ar-EG',
        digitsPreference: 'eastern_arabic',
      });

      expect(profile.onboardingCompleted).toBe(true);
      expect(profile.language).toBe('ar');
    });

    it('should save step 2 opening balance and date', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
        baseCurrencyCode: 'EGP',
        timezone: 'Africa/Cairo',
        openingBalanceMinor: BigInt(250000),
        openingBalanceDate: new Date('2026-10-30'),
        onboardingCompleted: false,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const state = await service.updateStep2('user-1', {
        openingBalanceMinor: BigInt(250000),
        openingBalanceDate: new Date('2026-10-30'),
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          openingBalanceMinor: BigInt(250000),
          openingBalanceDate: new Date('2026-10-30'),
        },
      });
      expect(state.step2.isCompleted).toBe(true);
      expect(state.step2.openingBalanceMinor).toBe('250000');
    });

    it('should retrieve current onboarding state', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
        baseCurrencyCode: 'USD',
        timezone: 'UTC',
        openingBalanceMinor: null,
        openingBalanceDate: null,
        language: 'en',
        locale: 'en-US',
        digitsPreference: 'western',
        onboardingCompleted: false,
      });

      const state = await service.getOnboarding('user-1');
      expect(state.step1.isCompleted).toBe(true);
      expect(state.step2.isCompleted).toBe(false);
      expect(state.onboardingCompleted).toBe(false);
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
        emailVerified: true,
        emailVerifiedAt: null,
        accountStatus: 'ACTIVE',
        baseCurrencyCode: 'USD',
        openingBalanceMinor: null,
        openingBalanceDate: null,
        onboardingCompleted: false,
        createdAt: new Date('2026-01-01'),
        lastLoginAt: null,
        deletedAt: null,
      });

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'New Name',
        timezone: 'Africa/Cairo',
        language: 'ar',
        locale: 'ar-EG',
        digitsPreference: 'eastern_arabic',
        emailVerified: true,
        emailVerifiedAt: null,
        accountStatus: 'ACTIVE',
        baseCurrencyCode: 'USD',
        openingBalanceMinor: null,
        openingBalanceDate: null,
        onboardingCompleted: false,
        createdAt: new Date('2026-01-01'),
        lastLoginAt: null,
        deletedAt: null,
      });

      const updated = await service.updateMe('user-1', {
        displayName: 'New Name',
        timezone: 'Africa/Cairo',
        language: 'ar',
        locale: 'ar-EG',
        digitsPreference: 'eastern_arabic',
      });

      expect(updated.displayName).toBe('New Name');
      expect(updated.timezone).toBe('Africa/Cairo');
      expect(updated.language).toBe('ar');
    });
  });
});
