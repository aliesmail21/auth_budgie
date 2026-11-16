import { Injectable } from '@nestjs/common';
import {
  UpdateProfileDto,
  OnboardingStep1Dto,
  OnboardingStep2Dto,
  OnboardingCompleteDto,
} from '../presentation/dto/account.dto';
import { ProfileService } from './services/profile.service';
import { OnboardingService } from './services/onboarding.service';
import { UserProfileResponse, OnboardingStateResponse } from './account-types';

export { UserProfileResponse, OnboardingStateResponse } from './account-types';

/**
 * Facade service for Account & Profile management.
 * Orchestrates calls between ProfileService and OnboardingService while maintaining
 * a unified, stable contract for controllers and consumers.
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly profileService: ProfileService,
    private readonly onboardingService: OnboardingService,
  ) {}

  /**
   * Retrieves the authenticated user profile.
   */
  async getMe(userId: string): Promise<UserProfileResponse> {
    return this.profileService.getMe(userId);
  }

  /**
   * Updates user editable profile preferences.
   */
  async updateMe(userId: string, dto: UpdateProfileDto): Promise<UserProfileResponse> {
    return this.profileService.updateMe(userId, dto);
  }

  /**
   * Retrieves the current onboarding state and preview data.
   */
  async getOnboarding(userId: string): Promise<OnboardingStateResponse> {
    return this.onboardingService.getOnboarding(userId);
  }

  /**
   * Onboarding Step 1: Base currency and operating timezone.
   */
  async updateStep1(userId: string, dto: OnboardingStep1Dto): Promise<OnboardingStateResponse> {
    return this.onboardingService.updateStep1(userId, dto);
  }

  /**
   * Onboarding Step 2: Opening balance baseline (stored in integer minor units).
   */
  async updateStep2(userId: string, dto: OnboardingStep2Dto): Promise<OnboardingStateResponse> {
    return this.onboardingService.updateStep2(userId, dto);
  }

  /**
   * Onboarding Step 3 & Final Confirmation: Validates steps 1 & 2 and activates onboarding.
   */
  async completeOnboarding(
    userId: string,
    dto: OnboardingCompleteDto,
  ): Promise<UserProfileResponse> {
    return this.onboardingService.completeOnboarding(userId, dto);
  }
}
