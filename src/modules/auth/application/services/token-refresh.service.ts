import { Injectable, Logger } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AppConfigService } from '../../../../config/app-config.service';
import { TokenService } from '../../infrastructure/token.service';
import { AppError } from '../../../../common/errors/app-error';
import { AuthTokens, calculateRefreshTokenExpiration } from './auth-types';

@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Refreshes authentication tokens using opaque token rotation with reuse detection.
   */
  async refresh(
    rawRefreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const tokenHash = this.tokenService.hashToken(rawRefreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        session: {
          include: {
            user: true,
          },
        },
      },
    });

    // Reuse Detection: If an already-used or revoked token is supplied, compromise detected!
    if (storedToken && (storedToken.usedAt !== null || storedToken.revokedAt !== null)) {
      this.logger.warn(
        `Security Alert: Refresh token reuse detected for session [${storedToken.sessionId}]. Revoking entire session.`,
      );

      // Invalidate the compromised session and all its tokens
      await this.prisma.$transaction([
        this.prisma.deviceSession.update({
          where: { id: storedToken.sessionId },
          data: { revokedAt: new Date() },
        }),
        this.prisma.refreshToken.updateMany({
          where: { sessionId: storedToken.sessionId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);

      throw AppError.unauthorized(
        'Invalid refresh token. Your device session was revoked due to suspected token reuse.',
      );
    }

    if (!storedToken) {
      throw AppError.unauthorized('Invalid or expired refresh token.');
    }

    const session = storedToken.session;
    const now = new Date();

    if (storedToken.expiresAt < now) {
      throw AppError.unauthorized('Refresh token has expired. Please log in again.');
    }

    if (session.revokedAt !== null || session.absoluteExpiresAt < now) {
      throw AppError.unauthorized(
        'Device session has been revoked or expired. Please log in again.',
      );
    }

    const user = session.user;
    if (user.deletedAt !== null) {
      throw AppError.unauthorized('Account has been deleted.');
    }

    if (
      user.accountStatus === AccountStatus.SUSPENDED ||
      user.accountStatus === AccountStatus.LOCKED
    ) {
      throw AppError.forbidden(`Your account is ${user.accountStatus.toLowerCase()}.`);
    }

    // Atomic Token Rotation
    const newRawRefreshToken = this.tokenService.generateOpaqueToken(48);
    const newRefreshTokenHash = this.tokenService.hashToken(newRawRefreshToken);
    const newExpiresAt = calculateRefreshTokenExpiration(this.config, session.absoluteExpiresAt);

    await this.prisma.$transaction(async (tx) => {
      // 1. Create new rotated token linked to previous parent
      const newToken = await tx.refreshToken.create({
        data: {
          sessionId: session.id,
          parentTokenId: storedToken.id,
          tokenHash: newRefreshTokenHash,
          expiresAt: newExpiresAt,
        },
      });

      // 2. Mark existing token as used and replaced
      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          usedAt: now,
          revokedAt: now,
          replacedByTokenId: newToken.id,
        },
      });

      // 3. Update session activity
      await tx.deviceSession.update({
        where: { id: session.id },
        data: {
          lastUsedAt: now,
          ipAddress: ipAddress || session.ipAddress,
          userAgent: userAgent || session.userAgent,
        },
      });
    });

    const { accessToken, expiresIn } = this.tokenService.generateAccessToken(user.id, session.id);

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }
}
