import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppConfigService } from '../../../config/app-config.service';

export interface JwtPayload {
  sub: string; // User UUID
  sessionId: string; // Device Session UUID
  iat?: number;
  exp?: number;
}

@Injectable()
export class TokenService {
  constructor(private readonly appConfig: AppConfigService) {}

  /**
   * Generates a short-lived JWT access token for mobile/API clients.
   */
  generateAccessToken(
    userId: string,
    sessionId: string,
  ): { accessToken: string; expiresIn: number } {
    const expiresIn = this.appConfig.jwtAccessExpirationSeconds;
    const payload: JwtPayload = {
      sub: userId,
      sessionId,
    };

    const accessToken = jwt.sign(payload, this.appConfig.jwtAccessSecret, {
      expiresIn: `${expiresIn}s`,
    });

    return {
      accessToken,
      expiresIn,
    };
  }

  /**
   * Verifies and decodes an access token.
   */
  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.appConfig.jwtAccessSecret) as JwtPayload;
  }

  /**
   * Generates a cryptographically secure random opaque token (e.g., for refresh or reset tokens).
   */
  generateOpaqueToken(byteLength: number = 48): string {
    return crypto.randomBytes(byteLength).toString('base64url');
  }

  /**
   * Computes a SHA-256 hash of a raw token for secure database storage.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Constant-time comparison of two token hashes to prevent timing attacks.
   */
  safeCompare(storedHash: string, suppliedToken: string): boolean {
    const computedHash = this.hashToken(suppliedToken);
    const a = Buffer.from(storedHash, 'utf8');
    const b = Buffer.from(computedHash, 'utf8');

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  }
}
