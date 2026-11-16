import { Injectable, Logger } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { TokenService } from '../../infrastructure/token.service';
import { EmailService } from '../../infrastructure/email.service';
import { normalizeEmail } from '../../domain/email-normalizer';
import { AppError } from '../../../../common/errors/app-error';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Verifies account email address and promotes account status to ACTIVE.
   */
  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    const tokenHash = this.tokenService.hashToken(rawToken);

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    const now = new Date();

    if (!tokenRecord || tokenRecord.usedAt !== null || tokenRecord.expiresAt < now) {
      throw AppError.badRequest('Invalid or expired email verification token.');
    }

    const user = tokenRecord.user;

    if (user.emailVerified) {
      // Already verified, mark token used and return message
      await this.prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: now },
      });
      return { message: 'Email address has already been verified.' };
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: now },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: now,
          accountStatus:
            user.accountStatus === AccountStatus.PENDING_VERIFICATION
              ? AccountStatus.ACTIVE
              : user.accountStatus,
        },
      }),
    ]);

    return { message: 'Email address verified successfully.' };
  }

  /**
   * Resends an email verification token if the account is not already verified.
   */
  async resendVerification(email?: string, userId?: string): Promise<{ message: string }> {
    let user;

    if (userId) {
      user = await this.prisma.user.findUnique({ where: { id: userId } });
    } else if (email) {
      const normalized = normalizeEmail(email);
      user = await this.prisma.user.findUnique({ where: { email: normalized } });
    } else {
      throw AppError.badRequest('Email is required.');
    }

    if (!user || user.deletedAt !== null) {
      return {
        message: 'If an account exists with this email, a verification link has been sent.',
      };
    }

    if (user.emailVerified) {
      throw AppError.badRequest('This account has already verified its email address.');
    }

    const rawToken = this.tokenService.generateOpaqueToken(32);
    const tokenHash = this.tokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    this.emailService.sendVerificationEmail(user.email, rawToken).catch((err: Error) => {
      this.logger.error(`Error sending verification email: ${err.message}`);
    });

    return { message: 'A new verification email has been dispatched.' };
  }
}
