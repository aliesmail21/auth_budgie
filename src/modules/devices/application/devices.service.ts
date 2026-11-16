import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AppError } from '../../../common/errors/app-error';
import { DeviceSessionResponse } from './devices-types';

export { DeviceSessionResponse } from './devices-types';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists all active (unrevoked and unexpired) device sessions for the authenticated user.
   */
  async listDevices(userId: string, currentSessionId: string): Promise<DeviceSessionResponse[]> {
    const now = new Date();

    const sessions = await this.prisma.deviceSession.findMany({
      where: {
        userId,
        revokedAt: null,
        absoluteExpiresAt: { gt: now },
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      deviceType: s.deviceType,
      deviceIdentifier: s.deviceIdentifier,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      lastUsedAt: s.lastUsedAt.toISOString(),
      isCurrent: s.id === currentSessionId,
    }));
  }

  /**
   * Revokes a specific device session belonging to the authenticated user.
   * Strictly enforces ownership authorization.
   */
  async revokeDevice(userId: string, sessionIdToRevoke: string): Promise<{ message: string }> {
    const session = await this.prisma.deviceSession.findUnique({
      where: { id: sessionIdToRevoke },
    });

    // Enforce ownership: if not found or belongs to another user, 404
    if (!session || session.userId !== userId) {
      throw AppError.notFound('Device session not found.');
    }

    if (session.revokedAt !== null) {
      return { message: 'Device session is already revoked.' };
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.deviceSession.update({
        where: { id: sessionIdToRevoke },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId: sessionIdToRevoke, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return { message: 'Device session revoked successfully.' };
  }
}
