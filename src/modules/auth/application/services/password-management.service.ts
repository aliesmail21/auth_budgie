import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { PasswordHasherService } from '../../infrastructure/password-hasher.service';
import { TokenService } from '../../infrastructure/token.service';
import { EmailService } from '../../infrastructure/email.service';
import { normalizeEmail } from '../../domain/email-normalizer';
import { PasswordRules } from '../../domain/password.vo';
import { AppError } from '../../../../common/errors/app-error';
import { ChangePasswordDto, ResetPasswordDto } from '../../presentation/dto/auth.dto';

@Injectable()
export class PasswordManagementService {
  private readonly logger = new Logger(PasswordManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Changes the user's password, updates passwordChangedAt, and revokes all other device sessions.
   */
  async changePassword(
    userId: string,
    currentSessionId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    PasswordRules.validate(dto.newPassword);

    if (dto.currentPassword === dto.newPassword) {
      throw AppError.badRequest('New password cannot be identical to your current password.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt !== null) {
      throw AppError.notFound('User not found.');
    }

    const isCurrentPasswordValid = await this.passwordHasher.verifyPassword(
      user.passwordHash,
      dto.currentPassword,
    );

    if (!isCurrentPasswordValid) {
      throw AppError.badRequest('Current password is incorrect.');
    }

    const newPasswordHash = await this.passwordHasher.hashPassword(dto.newPassword);
    const now = new Date();

    // Revoke all other sessions for security
    const otherSessions = await this.prisma.deviceSession.findMany({
      where: {
        userId,
        id: { not: currentSessionId },
        revokedAt: null,
      },
      select: { id: true },
    });

    const otherSessionIds = otherSessions.map((s) => s.id);

    await this.prisma.$transaction(async (tx) => {
      // 1. Update password hash and timestamp
      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          passwordChangedAt: now,
        },
      });

      // 2. Revoke other sessions
      if (otherSessionIds.length > 0) {
        await tx.deviceSession.updateMany({
          where: { id: { in: otherSessionIds } },
          data: { revokedAt: now },
        });

        await tx.refreshToken.updateMany({
          where: { sessionId: { in: otherSessionIds }, revokedAt: null },
          data: { revokedAt: now },
        });
      }
    });

    return {
      message: 'Password changed successfully. Other active device sessions have been revoked.',
    };
  }

  /**
   * Initiates password recovery. Always returns a generic response to prevent email enumeration.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalized = normalizeEmail(email);

    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });

    // If user does not exist or is soft-deleted, return generic success message immediately
    if (!user || user.deletedAt !== null) {
      return {
        message:
          'If an account exists with this email address, a password reset link has been sent.',
      };
    }

    const rawToken = this.tokenService.generateOpaqueToken(32);
    const tokenHash = this.tokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.$transaction(async (tx) => {
      // Invalidate outstanding reset tokens for this user
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Create new token
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    // Send email asynchronously
    this.emailService.sendPasswordResetEmail(user.email, rawToken).catch((err: Error) => {
      this.logger.error(`Error sending password reset email: ${err.message}`);
    });

    return {
      message: 'If an account exists with this email address, a password reset link has been sent.',
    };
  }

  /**
   * Resets password using a validated reset token and revokes all active device sessions.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    PasswordRules.validate(dto.newPassword);
    const tokenHash = this.tokenService.hashToken(dto.token);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    const now = new Date();

    if (!resetToken || resetToken.usedAt !== null || resetToken.expiresAt < now) {
      throw AppError.badRequest('Invalid or expired password reset token.');
    }

    const user = resetToken.user;
    if (user.deletedAt !== null) {
      throw AppError.badRequest('Account has been deactivated.');
    }

    const newPasswordHash = await this.passwordHasher.hashPassword(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      // 1. Mark token as used
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      });

      // 2. Update password hash
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          passwordChangedAt: now,
        },
      });

      // 3. Revoke all active sessions and refresh tokens for user
      const sessions = await tx.deviceSession.findMany({
        where: { userId: user.id, revokedAt: null },
        select: { id: true },
      });

      const sessionIds = sessions.map((s) => s.id);

      if (sessionIds.length > 0) {
        await tx.deviceSession.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: now },
        });

        await tx.refreshToken.updateMany({
          where: { sessionId: { in: sessionIds }, revokedAt: null },
          data: { revokedAt: now },
        });
      }
    });

    return {
      message: 'Password reset successfully. Please log in with your new password.',
    };
  }
}
