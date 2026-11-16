import { User } from '@prisma/client';

export interface UserProfileResponse {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  accountStatus: string;
  baseCurrencyCode: string | null;
  openingBalanceMinor: string | null;
  openingBalanceDate: string | null;
  timezone: string | null;
  language: string | null;
  locale: string | null;
  digitsPreference: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface OnboardingStateResponse {
  onboardingCompleted: boolean;
  step1: {
    baseCurrencyCode: string | null;
    timezone: string | null;
    isCompleted: boolean;
  };
  step2: {
    openingBalanceMinor: string | null;
    openingBalanceDate: string | null;
    isCompleted: boolean;
  };
  step3: {
    language: string | null;
    locale: string | null;
    digitsPreference: string | null;
  };
}

/**
 * Maps a Prisma User database record to the public UserProfileResponse DTO.
 */
export function mapUserToProfileResponse(user: User): UserProfileResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    accountStatus: user.accountStatus,
    baseCurrencyCode: user.baseCurrencyCode,
    openingBalanceMinor:
      user.openingBalanceMinor !== null && user.openingBalanceMinor !== undefined
        ? user.openingBalanceMinor.toString()
        : null,
    openingBalanceDate: user.openingBalanceDate ? user.openingBalanceDate.toISOString() : null,
    timezone: user.timezone,
    language: user.language,
    locale: user.locale,
    digitsPreference: user.digitsPreference,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}
