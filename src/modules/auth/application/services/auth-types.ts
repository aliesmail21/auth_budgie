import { AppConfigService } from '../../../../config/app-config.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthUserResponse {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  accountStatus: string;
  onboardingCompleted: boolean;
}

export interface AuthResponse {
  user: AuthUserResponse;
  tokens: AuthTokens;
}

export function calculateSessionExpiration(config: AppConfigService): Date {
  const days = config.refreshTokenExpirationDays;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function calculateRefreshTokenExpiration(
  config: AppConfigService,
  sessionAbsoluteExpiration: Date,
): Date {
  const days = config.refreshTokenExpirationDays;
  const standardExpiration = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return standardExpiration < sessionAbsoluteExpiration
    ? standardExpiration
    : sessionAbsoluteExpiration;
}
