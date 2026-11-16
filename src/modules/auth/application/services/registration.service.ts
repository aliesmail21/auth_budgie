import { Injectable, Logger } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AppConfigService } from '../../../../config/app-config.service';
import { PasswordHasherService } from '../../infrastructure/password-hasher.service';
import { TokenService } from '../../infrastructure/token.service';
import { EmailService } from '../../infrastructure/email.service';
import { normalizeEmail } from '../../domain/email-normalizer';
import { PasswordRules } from '../../domain/password.vo';
import { AppError } from '../../../../common/errors/app-error';
import { RegisterInput } from '../../presentation/dto/auth.dto';
import {
  AuthResponse,
  calculateSessionExpiration,
  calculateRefreshTokenExpiration,
} from './auth-types';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Registers a new user account, creates an initial device session, and issues authentication tokens.
   */
  async register(dto: RegisterInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const email = normalizeEmail(dto.email);
    PasswordRules.validate(dto.password);

    // Enforce email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing && existing.deletedAt === null) {
      throw AppError.conflict('An account with this email address already exists.');
    }

    const passwordHash = await this.passwordHasher.hashPassword(dto.password);
    const sessionExpiresAt = calculateSessionExpiration(this.config);
    const rawRefreshToken = this.tokenService.generateOpaqueToken(48);
    const refreshTokenHash = this.tokenService.hashToken(rawRefreshToken);
    const refreshTokenExpiresAt = calculateRefreshTokenExpiration(this.config, sessionExpiresAt);

    const rawVerificationToken = this.tokenService.generateOpaqueToken(32);
    const verificationTokenHash = this.tokenService.hashToken(rawVerificationToken);
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName: dto.displayName?.trim() || null,
          accountStatus: AccountStatus.PENDING_VERIFICATION,
          emailVerified: false,
        },
      });

      // 2. Create Verification Token
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: verificationTokenHash,
          expiresAt: verificationExpiresAt,
        },
      });

      // 3. Create Initial Device Session
      const session = await tx.deviceSession.create({
        data: {
          userId: user.id,
          deviceName: dto.deviceName || 'Flutter Mobile App',
          deviceType: dto.deviceType || 'mobile',
          deviceIdentifier: dto.deviceIdentifier || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          absoluteExpiresAt: sessionExpiresAt,
        },
      });

      // 4. Create Initial Refresh Token
      await tx.refreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash: refreshTokenHash,
          expiresAt: refreshTokenExpiresAt,
        },
      });

      return { user, session };
    });

    // Send verification email asynchronously
    this.emailService
      .sendVerificationEmail(result.user.email, rawVerificationToken)
      .catch((err: Error) => {
        this.logger.error(`Error sending verification email: ${err.message}`);
      });

    const { accessToken, expiresIn } = this.tokenService.generateAccessToken(
      result.user.id,
      result.session.id,
    );

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        emailVerified: result.user.emailVerified,
        accountStatus: result.user.accountStatus,
        onboardingCompleted: result.user.onboardingCompleted,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn,
        tokenType: 'Bearer',
      },
    };
  }
}
