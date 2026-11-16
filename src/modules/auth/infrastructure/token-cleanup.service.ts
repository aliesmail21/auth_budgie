import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface CleanupResult {
  expiredVerificationTokens: number;
  expiredPasswordResetTokens: number;
  expiredRefreshTokens: number;
}

@Injectable()
export class TokenCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenCleanupService.name);
  private timer?: NodeJS.Timeout;
  // Recurring cleanup interval: 24 hours (in milliseconds)
  private readonly intervalMs = 24 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    // Schedule recurring cleanup every 24 hours
    this.timer = setInterval(() => {
      this.cleanupExpiredTokens().catch((err: Error) => {
        this.logger.error(`Periodic token cleanup error: ${err.message}`);
      });
    }, this.intervalMs);

    // Unref timer so it doesn't hold open process shutdown
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Performs the cleanup logic:
   * 1. Deletes email verification tokens that are used or expired.
   * 2. Deletes password reset tokens that are used or expired.
   * 3. Deletes refresh tokens that have expired and were revoked.
   */
  async cleanupExpiredTokens(): Promise<CleanupResult> {
    const now = new Date();

    const [verificationResult, resetResult, refreshResult] = await this.prisma.$transaction([
      this.prisma.emailVerificationToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
        },
      }),

      this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
        },
      }),

      this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: { lt: now },
          revokedAt: { not: null },
        },
      }),
    ]);

    const result = {
      expiredVerificationTokens: verificationResult.count,
      expiredPasswordResetTokens: resetResult.count,
      expiredRefreshTokens: refreshResult.count,
    };

    this.logger.log(
      `Token cleanup completed: Pruned ${result.expiredVerificationTokens} verification tokens, ` +
        `${result.expiredPasswordResetTokens} reset tokens, and ${result.expiredRefreshTokens} refresh tokens.`,
    );

    return result;
  }
}
