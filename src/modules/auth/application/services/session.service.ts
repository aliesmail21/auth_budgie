import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs out the user from the current device session and revokes all active refresh tokens.
   */
  async logout(sessionId: string): Promise<{ message: string }> {
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.deviceSession.update({
        where: { id: sessionId },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return { message: 'Successfully logged out.' };
  }

  /**
   * Logs out the user from all devices by revoking all active sessions and refresh tokens.
   */
  async logoutEverywhere(userId: string): Promise<{ message: string }> {
    const now = new Date();

    const activeSessions = await this.prisma.deviceSession.findMany({
      where: { userId, revokedAt: null },
      select: { id: true },
    });

    const sessionIds = activeSessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      await this.prisma.$transaction([
        this.prisma.deviceSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now },
        }),
        this.prisma.refreshToken.updateMany({
          where: { sessionId: { in: sessionIds }, revokedAt: null },
          data: { revokedAt: now },
        }),
      ]);
    }

    return { message: 'Successfully logged out of all devices.' };
  }
}
