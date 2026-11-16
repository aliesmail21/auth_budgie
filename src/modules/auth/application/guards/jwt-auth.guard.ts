import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from '../../infrastructure/token.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AppError } from '../../../../common/errors/app-error';

export interface AuthenticatedUser {
  id: string;
  email: string;
  accountStatus: string;
}

export interface AuthenticatedSession {
  id: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  session?: AuthenticatedSession;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or malformed Authorization header.');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw AppError.unauthorized('Access token is missing.');
    }

    let payload: { sub: string; sessionId: string };
    try {
      payload = this.tokenService.verifyAccessToken(token);
    } catch {
      throw AppError.unauthorized('Invalid or expired access token.');
    }

    // Immediate session revocation check: verify the session is active in database
    const session = await this.prisma.deviceSession.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            accountStatus: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!session || session.revokedAt !== null) {
      throw AppError.unauthorized('Device session has been revoked. Please log in again.');
    }

    if (session.absoluteExpiresAt < new Date()) {
      throw AppError.unauthorized('Device session has expired. Please log in again.');
    }

    if (session.user.deletedAt !== null) {
      throw AppError.unauthorized('Account has been deleted.');
    }

    if (session.user.accountStatus === 'SUSPENDED' || session.user.accountStatus === 'LOCKED') {
      throw AppError.forbidden(`Account is ${session.user.accountStatus.toLowerCase()}.`);
    }

    // Attach validated identity to request
    request.user = {
      id: session.user.id,
      email: session.user.email,
      accountStatus: session.user.accountStatus,
    };

    request.session = {
      id: session.id,
    };

    return true;
  }
}
