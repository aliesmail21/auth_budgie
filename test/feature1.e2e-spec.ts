import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Feature 1: Auth, Account, Onboarding & Devices (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = `e2e_user_${Date.now()}@example.com`;
  const testPassword = 'StrongP@ssw0rd123!';
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'health/(.*)', 'docs', 'docs/(.*)'],
    });

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Cleanup created test records
    try {
      const user = await prisma.user.findUnique({ where: { email: testEmail } });
      if (user) {
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch {
      // Ignore cleanup error if already removed
    }

    if (app) {
      await app.close();
    }
  });

  describe('1. Registration Flow', () => {
    it('should reject registration with weak password (HTTP 400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'weak@example.com',
          password: 'weak',
        })
        .expect(400);

      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should successfully register a new account (HTTP 201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          displayName: 'E2E Test User',
          deviceName: 'Pixel 8 Pro',
          deviceType: 'mobile',
        })
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.emailVerified).toBe(false);
      expect(res.body.user.accountStatus).toBe('PENDING_VERIFICATION');
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();

      accessToken = res.body.tokens.accessToken;
      refreshToken = res.body.tokens.refreshToken;
    });

    it('should reject registration with duplicate email (HTTP 409 CONFLICT)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(409);

      expect(res.body.errorCode).toBe('CONFLICT');
    });
  });

  describe('2. Login & Authentication', () => {
    it('should reject invalid password (HTTP 400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword999!',
        })
        .expect(400);

      expect(res.body.errorCode).toBe('BAD_REQUEST');
    });

    it('should login successfully and return new tokens (HTTP 200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceName: 'iPhone 15 Pro',
          deviceType: 'mobile',
        })
        .expect(200);

      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();

      // Use this second session's tokens for subsequent operations
      accessToken = res.body.tokens.accessToken;
      refreshToken = res.body.tokens.refreshToken;
    });
  });

  describe('3. Token Refresh & Reuse Detection', () => {
    let rotatedRefreshToken: string;

    it('should refresh tokens and rotate refresh token (HTTP 200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(refreshToken);

      accessToken = res.body.accessToken;
      rotatedRefreshToken = res.body.refreshToken;
    });

    it('should detect reuse of old refresh token and revoke the session (HTTP 401)', async () => {
      // Re-send the old refresh token that was already rotated
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(res.body.errorCode).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('token reuse');

      // Subsequent attempt with rotated token should now also fail because session was revoked
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rotatedRefreshToken })
        .expect(401);
    });
  });

  describe('4. Account & Onboarding Lifecycle', () => {
    beforeAll(async () => {
      // Re-login to get a fresh active session
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceName: 'Active Session Device',
        })
        .expect(200);

      accessToken = loginRes.body.tokens.accessToken;
      refreshToken = loginRes.body.tokens.refreshToken;
    });

    it('should get current profile (GET /api/v1/account/me)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/account/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(testEmail);
      expect(res.body.onboardingCompleted).toBe(false);
    });

    it('should reject invalid timezone on Step 1 (HTTP 400)', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/account/onboarding/step-1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          baseCurrencyCode: 'EGP',
          timezone: 'Invalid/NonExistent_Zone',
        })
        .expect(400);
    });

    it('should save Onboarding Step 1 (currency & timezone)', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/account/onboarding/step-1')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          baseCurrencyCode: 'EGP',
          timezone: 'Africa/Cairo',
        })
        .expect(200);

      expect(res.body.step1.baseCurrencyCode).toBe('EGP');
      expect(res.body.step1.timezone).toBe('Africa/Cairo');
      expect(res.body.step1.isCompleted).toBe(true);
    });

    it('should save Onboarding Step 2 (opening balance & date)', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/account/onboarding/step-2')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          openingBalanceMinor: '1000000', // EGP 10,000.00 in minor units
          openingBalanceDate: new Date('2026-10-30').toISOString(),
        })
        .expect(200);

      expect(res.body.step2.openingBalanceMinor).toBe('1000000');
      expect(res.body.step2.isCompleted).toBe(true);
    });

    it('should complete onboarding Step 3 and finalize setup', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/account/onboarding/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          language: 'ar',
          locale: 'ar-EG',
          digitsPreference: 'eastern_arabic',
        })
        .expect(200);

      expect(res.body.onboardingCompleted).toBe(true);
      expect(res.body.language).toBe('ar');
      expect(res.body.locale).toBe('ar-EG');
      expect(res.body.baseCurrencyCode).toBe('EGP');
      expect(res.body.openingBalanceMinor).toBe('1000000');
    });

    it('should patch profile preferences (PATCH /api/v1/account/me)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/account/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          displayName: 'Updated Name',
          language: 'en',
        })
        .expect(200);

      expect(res.body.displayName).toBe('Updated Name');
      expect(res.body.language).toBe('en');
    });
  });

  describe('5. Device Management', () => {
    it('should list active devices for the user (GET /api/v1/account/devices)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/account/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const current = res.body.find((d: { isCurrent: boolean }) => d.isCurrent);
      expect(current).toBeDefined();
      expect(current.id).toBeDefined();
    });

    it('should revoke a session by ID', async () => {
      // Create a secondary device session by logging in again
      const secondLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceName: 'Secondary Tablet',
        })
        .expect(200);

      // List devices to get secondary session id
      const devicesRes = await request(app.getHttpServer())
        .get('/api/v1/account/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const secondarySession = devicesRes.body.find(
        (d: { deviceName: string; id: string }) => d.deviceName === 'Secondary Tablet',
      );
      expect(secondarySession).toBeDefined();

      // Revoke the secondary device
      const revokeRes = await request(app.getHttpServer())
        .delete(`/api/v1/account/devices/${secondarySession.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(revokeRes.body.message).toContain('revoked successfully');

      // Secondary session access token should now be immediately rejected
      await request(app.getHttpServer())
        .get('/api/v1/account/me')
        .set('Authorization', `Bearer ${secondLogin.body.tokens.accessToken}`)
        .expect(401);
    });
  });

  describe('6. Logout', () => {
    it('should logout from current session and invalidate bearer token', async () => {
      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(logoutRes.body.message).toContain('logged out');

      // Subsequent authenticated requests using this token must now be rejected
      await request(app.getHttpServer())
        .get('/api/v1/account/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should support logout-everywhere route and revoke all sessions', async () => {
      // Login again
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceName: 'Multi Session Device',
        })
        .expect(200);

      const token = loginRes.body.tokens.accessToken;

      const logoutEverywhereRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout-everywhere')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(logoutEverywhereRes.body.message).toContain('logged out of all devices');

      await request(app.getHttpServer())
        .get('/api/v1/account/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });
});
