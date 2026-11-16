import { Injectable } from '@nestjs/common';
import { RegistrationService } from './services/registration.service';
import { AuthenticationService } from './services/authentication.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { SessionService } from './services/session.service';
import { PasswordManagementService } from './services/password-management.service';
import { EmailVerificationService } from './services/email-verification.service';
import {
  RegisterInput,
  LoginInput,
  ChangePasswordDto,
  ResetPasswordDto,
} from '../presentation/dto/auth.dto';
import { AuthResponse, AuthTokens } from './services/auth-types';

export { AuthResponse, AuthTokens } from './services/auth-types';

@Injectable()
export class AuthService {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly authenticationService: AuthenticationService,
    private readonly tokenRefreshService: TokenRefreshService,
    private readonly sessionService: SessionService,
    private readonly passwordManagementService: PasswordManagementService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * Registers a new user account, creates an initial device session, and issues authentication tokens.
   */
  async register(dto: RegisterInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    return this.registrationService.register(dto, ipAddress, userAgent);
  }

  /**
   * Authenticates user credentials, spins up an independent device session, and issues tokens.
   */
  async login(dto: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    return this.authenticationService.login(dto, ipAddress, userAgent);
  }

  /**
   * Refreshes authentication tokens using opaque token rotation with reuse detection.
   */
  async refresh(
    rawRefreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    return this.tokenRefreshService.refresh(rawRefreshToken, ipAddress, userAgent);
  }

  /**
   * Logs out the user from the current device session and revokes all active refresh tokens.
   */
  async logout(sessionId: string): Promise<{ message: string }> {
    return this.sessionService.logout(sessionId);
  }

  /**
   * Logs out the user from all devices by revoking all active sessions and refresh tokens.
   */
  async logoutEverywhere(userId: string): Promise<{ message: string }> {
    return this.sessionService.logoutEverywhere(userId);
  }

  /**
   * Changes the user's password, updates passwordChangedAt, and revokes all other device sessions.
   */
  async changePassword(
    userId: string,
    currentSessionId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.passwordManagementService.changePassword(userId, currentSessionId, dto);
  }

  /**
   * Initiates password recovery. Always returns a generic response to prevent email enumeration.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.passwordManagementService.forgotPassword(email);
  }

  /**
   * Resets password using a validated reset token and revokes all active device sessions.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.passwordManagementService.resetPassword(dto);
  }

  /**
   * Verifies account email address and promotes account status to ACTIVE.
   */
  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    return this.emailVerificationService.verifyEmail(rawToken);
  }

  /**
   * Resends an email verification token if the account is not already verified.
   */
  async resendVerification(email?: string, userId?: string): Promise<{ message: string }> {
    return this.emailVerificationService.resendVerification(email, userId);
  }
}
