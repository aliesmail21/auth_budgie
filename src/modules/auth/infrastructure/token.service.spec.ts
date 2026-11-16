import { TokenService } from './token.service';
import { AppConfigService } from '../../../config/app-config.service';

describe('TokenService', () => {
  let tokenService: TokenService;
  let mockAppConfig: Partial<AppConfigService>;

  beforeEach(() => {
    mockAppConfig = {
      jwtAccessSecret: 'test_super_secret_key_minimum_32_characters_long_123',
      jwtAccessExpirationSeconds: 900,
    };
    tokenService = new TokenService(mockAppConfig as AppConfigService);
  });

  it('should generate and verify JWT access tokens', () => {
    const { accessToken, expiresIn } = tokenService.generateAccessToken('user-123', 'session-456');

    expect(accessToken).toBeDefined();
    expect(expiresIn).toBe(900);

    const decoded = tokenService.verifyAccessToken(accessToken);
    expect(decoded.sub).toBe('user-123');
    expect(decoded.sessionId).toBe('session-456');
  });

  it('should generate opaque random tokens and compute matching sha256 hashes', () => {
    const raw1 = tokenService.generateOpaqueToken(32);
    const raw2 = tokenService.generateOpaqueToken(32);

    expect(raw1).not.toBe(raw2);

    const hash1 = tokenService.hashToken(raw1);
    const hash2 = tokenService.hashToken(raw1);

    expect(hash1).toBe(hash2);
    expect(tokenService.safeCompare(hash1, raw1)).toBe(true);
    expect(tokenService.safeCompare(hash1, raw2)).toBe(false);
  });
});
