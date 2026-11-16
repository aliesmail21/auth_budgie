import { TokenCleanupService } from './token-cleanup.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('TokenCleanupService', () => {
  let service: TokenCleanupService;
  let mockPrisma: {
    emailVerificationToken: { deleteMany: jest.Mock };
    passwordResetToken: { deleteMany: jest.Mock };
    refreshToken: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      emailVerificationToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
      passwordResetToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      refreshToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 12 }),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    service = new TokenCleanupService(mockPrisma as unknown as PrismaService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should clean up expired tokens across all token tables', async () => {
    const result = await service.cleanupExpiredTokens();

    expect(result.expiredVerificationTokens).toBe(5);
    expect(result.expiredPasswordResetTokens).toBe(3);
    expect(result.expiredRefreshTokens).toBe(12);

    expect(mockPrisma.emailVerificationToken.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalled();
  });

  it('should initialize and destroy background recurring timer cleanly', () => {
    expect(() => service.onModuleInit()).not.toThrow();
    expect(() => service.onModuleDestroy()).not.toThrow();
  });
});
