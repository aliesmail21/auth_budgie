import { Injectable } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AppConfigService } from '../../../../config/app-config.service';
import { PasswordHasherService } from '../../infrastructure/password-hasher.service';
import { TokenService } from '../../infrastructure/token.service';
import { normalizeEmail } from '../../domain/email-normalizer';
import { AppError } from '../../../../common/errors/app-error';
import { LoginInput } from '../../presentation/dto/auth.dto';
import {
  AuthResponse,
  calculateSessionExpiration,
  calculateRefreshTokenExpiration,
} from './auth-types';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Authenticates user credentials, spins up an independent device session, and issues tokens.
   */
  async login(dto: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const email = normalizeEmail(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.deletedAt !== null) {
      throw AppError.badRequest('Invalid email or password.');
    }

    const isPasswordValid = await this.passwordHasher.verifyPassword(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw AppError.badRequest('Invalid email or password.');
    }

    if (
      user.accountStatus === AccountStatus.SUSPENDED ||
      user.accountStatus === AccountStatus.LOCKED
    ) {
      throw AppError.forbidden(`Your account is ${user.accountStatus.toLowerCase()}.`);
    }

    const sessionExpiresAt = calculateSessionExpiration(this.config);
    const rawRefreshToken = this.tokenService.generateOpaqueToken(48);
    const refreshTokenHash = this.tokenService.hashToken(rawRefreshToken);
    const refreshTokenExpiresAt = calculateRefreshTokenExpiration(this.config, sessionExpiresAt);

    const session = await this.prisma.$transaction(async (tx) => {
      // Create dedicated device session
      const newSession = await tx.deviceSession.create({
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

      // Store hashed refresh token
      await tx.refreshToken.create({
        data: {
          sessionId: newSession.id,
          tokenHash: refreshTokenHash,
          expiresAt: refreshTokenExpiresAt,
        },
      });

      // Update last login timestamp
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return newSession;
    });

    const { accessToken, expiresIn } = this.tokenService.generateAccessToken(user.id, session.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        accountStatus: user.accountStatus,
        onboardingCompleted: user.onboardingCompleted,
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
