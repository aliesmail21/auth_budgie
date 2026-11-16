import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AppError } from '../../../../common/errors/app-error';
import {
  OnboardingStep1Dto,
  OnboardingStep2Dto,
  OnboardingCompleteDto,
} from '../../presentation/dto/account.dto';
import {
  UserProfileResponse,
  OnboardingStateResponse,
  mapUserToProfileResponse,
} from '../account-types';
import { ProfileService } from './profile.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
  ) {}

  /**
   * Retrieves the current onboarding state and preview data.
   */
  async getOnboarding(userId: string): Promise<OnboardingStateResponse> {
    const user = await this.profileService.findActiveUserOrThrow(userId);

    const step1Completed = Boolean(user.baseCurrencyCode && user.timezone);
    const step2Completed = user.openingBalanceMinor !== null && user.openingBalanceDate !== null;

    return {
      onboardingCompleted: user.onboardingCompleted,
      step1: {
        baseCurrencyCode: user.baseCurrencyCode,
        timezone: user.timezone,
        isCompleted: step1Completed,
      },
      step2: {
        openingBalanceMinor:
          user.openingBalanceMinor !== null ? user.openingBalanceMinor.toString() : null,
        openingBalanceDate: user.openingBalanceDate ? user.openingBalanceDate.toISOString() : null,
        isCompleted: step2Completed,
      },
      step3: {
        language: user.language,
        locale: user.locale,
        digitsPreference: user.digitsPreference,
      },
    };
  }

  /**
   * Onboarding Step 1: Base currency and operating timezone.
   */
  async updateStep1(userId: string, dto: OnboardingStep1Dto): Promise<OnboardingStateResponse> {
    await this.profileService.findActiveUserOrThrow(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        baseCurrencyCode: dto.baseCurrencyCode,
        timezone: dto.timezone,
      },
    });

    return this.getOnboarding(userId);
  }

  /**
   * Onboarding Step 2: Opening balance baseline (stored in integer minor units).
   */
  async updateStep2(userId: string, dto: OnboardingStep2Dto): Promise<OnboardingStateResponse> {
    await this.profileService.findActiveUserOrThrow(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        openingBalanceMinor: dto.openingBalanceMinor,
        openingBalanceDate: dto.openingBalanceDate,
      },
    });

    return this.getOnboarding(userId);
  }

  /**
   * Onboarding Step 3 & Final Confirmation: Validates steps 1 & 2 and activates onboarding.
   */
  async completeOnboarding(
    userId: string,
    dto: OnboardingCompleteDto,
  ): Promise<UserProfileResponse> {
    const user = await this.profileService.findActiveUserOrThrow(userId);

    if (!user.baseCurrencyCode || !user.timezone) {
      throw AppError.badRequest(
        'Incomplete onboarding: please complete Step 1 (currency & timezone) first.',
      );
    }

    if (user.openingBalanceMinor === null || !user.openingBalanceDate) {
      throw AppError.badRequest(
        'Incomplete onboarding: please complete Step 2 (opening balance) first.',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        language: dto.language,
        locale: dto.locale,
        digitsPreference: dto.digitsPreference,
        onboardingCompleted: true,
      },
    });

    return mapUserToProfileResponse(updated);
  }
}
