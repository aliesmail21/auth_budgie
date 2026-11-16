import { AuthService } from './auth.service';
import { RegistrationService } from './services/registration.service';
import { AuthenticationService } from './services/authentication.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { SessionService } from './services/session.service';
import { PasswordManagementService } from './services/password-management.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AppConfigService } from '../../../config/app-config.service';
import { PasswordHasherService } from '../infrastructure/password-hasher.service';
import { TokenService } from '../infrastructure/token.service';
import { EmailService } from '../infrastructure/email.service';
import { AppError } from '../../../common/errors/app-error';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    deviceSession: {
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findMany: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    emailVerificationToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    passwordResetToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mockConfig: Partial<AppConfigService>;
  let mockPasswordHasher: Partial<PasswordHasherService>;
  let mockTokenService: Partial<TokenService>;
  let mockEmailService: Partial<EmailService>;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      deviceSession: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      emailVerificationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (arg) => {
        if (typeof arg === 'function') {
          return arg(mockPrisma);
        }
        return Promise.all(arg);
      }),
    };

    mockConfig = {
      refreshTokenExpirationDays: 30,
    };

    mockPasswordHasher = {
      hashPassword: jest.fn().mockResolvedValue('argon2id$hashed_pass'),
      verifyPassword: jest.fn().mockResolvedValue(true),
    };

    mockTokenService = {
      generateAccessToken: jest.fn().mockReturnValue({
        accessToken: 'mock-jwt-token',
        expiresIn: 900,
      }),
      generateOpaqueToken: jest.fn().mockReturnValue('mock-opaque-token'),
      hashToken: jest.fn().mockImplementation((t) => `hashed_${t}`),
    };

    mockEmailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    const registrationService = new RegistrationService(
      mockPrisma as unknown as PrismaService,
      mockConfig as AppConfigService,
      mockPasswordHasher as PasswordHasherService,
      mockTokenService as TokenService,
      mockEmailService as EmailService,
    );
    const authenticationService = new AuthenticationService(
      mockPrisma as unknown as PrismaService,
      mockConfig as AppConfigService,
      mockPasswordHasher as PasswordHasherService,
      mockTokenService as TokenService,
    );
    const tokenRefreshService = new TokenRefreshService(
      mockPrisma as unknown as PrismaService,
      mockConfig as AppConfigService,
      mockTokenService as TokenService,
    );
    const sessionService = new SessionService(
      mockPrisma as unknown as PrismaService,
    );
    const passwordManagementService = new PasswordManagementService(
      mockPrisma as unknown as PrismaService,
      mockPasswordHasher as PasswordHasherService,
      mockTokenService as TokenService,
      mockEmailService as EmailService,
    );
    const emailVerificationService = new EmailVerificationService(
      mockPrisma as unknown as PrismaService,
      mockTokenService as TokenService,
      mockEmailService as EmailService,
    );

    service = new AuthService(
      registrationService,
      authenticationService,
      tokenRefreshService,
      sessionService,
      passwordManagementService,
      emailVerificationService,
    );
  });

  describe('register', () => {
    it('should successfully register a user and return access/refresh tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User One',
        emailVerified: false,
        accountStatus: 'PENDING_VERIFICATION',
        onboardingCompleted: false,
      });
      mockPrisma.deviceSession.create.mockResolvedValue({
        id: 'session-1',
      });

      const result = await service.register({
        email: 'User@Example.Com',
        password: 'StrongP@ssw0rd123',
        displayName: 'User One',
      });

      expect(result.user.email).toBe('user@example.com');
      expect(result.tokens.accessToken).toBe('mock-jwt-token');
      expect(mockPasswordHasher.hashPassword).toHaveBeenCalledWith('StrongP@ssw0rd123');
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw conflict error if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'user@example.com',
        deletedAt: null,
      });

      await expect(
        service.register({
          email: 'user@example.com',
          password: 'StrongP@ssw0rd123',
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('login', () => {
    it('should authenticate user and create new session', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'argon2id$hashed_pass',
        accountStatus: 'ACTIVE',
        deletedAt: null,
      });
      (mockPasswordHasher.verifyPassword as jest.Mock).mockResolvedValue(true);
      mockPrisma.deviceSession.create.mockResolvedValue({ id: 'session-1' });

      const result = await service.login({
        email: 'user@example.com',
        password: 'StrongP@ssw0rd123',
      });

      expect(result.tokens.accessToken).toBe('mock-jwt-token');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should throw bad request on invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'argon2id$hashed_pass',
        deletedAt: null,
      });
      (mockPasswordHasher.verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(AppError);
    });

    it('should reject login for suspended accounts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'argon2id$hashed_pass',
        accountStatus: 'SUSPENDED',
        deletedAt: null,
      });
      (mockPasswordHasher.verifyPassword as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'StrongP@ssw0rd123',
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('refresh token & reuse detection', () => {
    it('should detect token reuse, revoke the entire session, and throw unauthorized', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-old',
        sessionId: 'session-1',
        usedAt: new Date('2026-01-01'), // Already used!
        revokedAt: null,
        session: { id: 'session-1' },
      });

      await expect(service.refresh('reused-token-raw')).rejects.toThrow(AppError);

      // Verify session was revoked in DB
      expect(mockPrisma.deviceSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('should rotate token successfully on valid refresh', async () => {
      const future = new Date(Date.now() + 10000000);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-valid',
        sessionId: 'session-1',
        usedAt: null,
        revokedAt: null,
        expiresAt: future,
        session: {
          id: 'session-1',
          revokedAt: null,
          absoluteExpiresAt: future,
          user: { id: 'user-1', accountStatus: 'ACTIVE', deletedAt: null },
        },
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'token-new' });

      const tokens = await service.refresh('valid-token-raw');

      expect(tokens.accessToken).toBe('mock-jwt-token');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'token-valid' },
          data: expect.objectContaining({ replacedByTokenId: 'token-new' }),
        }),
      );
    });
  });

  describe('logout & logout everywhere', () => {
    it('should revoke device session on logout', async () => {
      const res = await service.logout('session-1');
      expect(res.message).toBe('Successfully logged out.');
      expect(mockPrisma.deviceSession.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'session-1' } }),
      );
    });

    it('should revoke all user sessions on logoutEverywhere', async () => {
      mockPrisma.deviceSession.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);

      const res = await service.logoutEverywhere('user-1');
      expect(res.message).toBe('Successfully logged out of all devices.');
      expect(mockPrisma.deviceSession.updateMany).toHaveBeenCalled();
    });
  });

  describe('password recovery', () => {
    it('should return generic message when email does not exist (no account enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await service.forgotPassword('nonexistent@example.com');
      expect(res.message).toContain('If an account exists');
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('should create token and send email when email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        deletedAt: null,
      });

      const res = await service.forgotPassword('user@example.com');
      expect(res.message).toContain('If an account exists');
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should reject when new password is identical to current password', async () => {
      await expect(
        service.changePassword('user-1', 'session-1', {
          currentPassword: 'SamePassword123!',
          newPassword: 'SamePassword123!',
        }),
      ).rejects.toThrow(AppError);
    });

    it('should reject when current password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'argon2id$current_hash',
        deletedAt: null,
      });
      (mockPasswordHasher.verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', 'session-1', {
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(AppError);
    });

    it('should update password and revoke other sessions when valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'argon2id$current_hash',
        deletedAt: null,
      });
      (mockPasswordHasher.verifyPassword as jest.Mock).mockResolvedValue(true);
      (mockPasswordHasher.hashPassword as jest.Mock).mockResolvedValue('argon2id$new_hash');
      mockPrisma.deviceSession.findMany.mockResolvedValue([{ id: 'other-session-2' }]);

      const res = await service.changePassword('user-1', 'session-1', {
        currentPassword: 'CorrectPassword123!',
        newPassword: 'BrandNewPassword123!',
      });

      expect(res.message).toContain('Password changed successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ passwordHash: 'argon2id$new_hash' }),
        }),
      );
      expect(mockPrisma.deviceSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['other-session-2'] } } }),
      );
    });
  });

  describe('resetPassword', () => {
    it('should reject expired or invalid reset token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(AppError);
    });

    it('should reset password, mark token used, and revoke all sessions when valid', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'user-1', deletedAt: null },
      });
      mockPrisma.deviceSession.findMany.mockResolvedValue([{ id: 's1' }]);

      const res = await service.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'NewPassword123!',
      });

      expect(res.message).toContain('Password reset successfully');
      expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'token-1' } }),
      );
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.deviceSession.updateMany).toHaveBeenCalled();
    });
  });

  describe('verifyEmail & resendVerification', () => {
    it('should reject invalid or expired verification token', async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(AppError);
    });

    it('should activate account and mark email verified when token is valid', async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'token-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'user-1', emailVerified: false, accountStatus: 'PENDING_VERIFICATION' },
      });

      const res = await service.verifyEmail('valid-token');
      expect(res.message).toContain('verified successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ emailVerified: true, accountStatus: 'ACTIVE' }),
        }),
      );
    });

    it('should return already verified message if user already verified', async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'token-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'user-1', emailVerified: true },
      });

      const res = await service.verifyEmail('valid-token');
      expect(res.message).toContain('already been verified');
    });

    it('should resend verification email for unverified user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        emailVerified: false,
        deletedAt: null,
      });

      const res = await service.resendVerification('user@example.com');
      expect(res.message).toContain('verification email has been dispatched');
      expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalled();
    });

    it('should reject resend verification if account is already verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        emailVerified: true,
        deletedAt: null,
      });

      await expect(service.resendVerification('user@example.com')).rejects.toThrow(AppError);
    });
  });
});
