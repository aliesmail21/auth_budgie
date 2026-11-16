import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  get nodeEnv(): string {
    return this.configService.get('nodeEnv', { infer: true });
  }

  get isProduction(): boolean {
    return this.configService.get('isProduction', { infer: true });
  }

  get isDevelopment(): boolean {
    return this.configService.get('isDevelopment', { infer: true });
  }

  get isTest(): boolean {
    return this.configService.get('isTest', { infer: true });
  }

  get port(): number {
    return this.configService.get('server.port', { infer: true });
  }

  get host(): string {
    return this.configService.get('server.host', { infer: true });
  }

  get requestTimeoutMs(): number {
    return this.configService.get('server.requestTimeoutMs', { infer: true });
  }

  get databaseUrl(): string {
    return this.configService.get('database.url', { infer: true });
  }

  get corsAllowedOrigins(): string[] {
    return this.configService.get('security.corsAllowedOrigins', { infer: true });
  }

  get rateLimitTtlMs(): number {
    return this.configService.get('security.rateLimit.ttlMs', { infer: true });
  }

  get rateLimitMax(): number {
    return this.configService.get('security.rateLimit.limit', { infer: true });
  }

  get logLevel(): string {
    return this.configService.get('logging.level', { infer: true });
  }

  get swaggerEnabled(): boolean {
    return this.configService.get('swagger.enabled', { infer: true });
  }

  get jwtAccessSecret(): string {
    return this.configService.get('auth.jwtAccessSecret', { infer: true });
  }

  get jwtAccessExpirationSeconds(): number {
    return this.configService.get('auth.jwtAccessExpirationSeconds', { infer: true });
  }

  get refreshTokenExpirationDays(): number {
    return this.configService.get('auth.refreshTokenExpirationDays', { infer: true });
  }

  get emailAppUrl(): string {
    return this.configService.get('email.appUrl', { infer: true });
  }

  get emailFrom(): string {
    return this.configService.get('email.from', { infer: true });
  }

  get emailTransport(): 'log' | 'smtp' | 'mock' {
    return this.configService.get('email.transport', { infer: true });
  }

  get smtpConfig(): { host?: string; port?: number; user?: string; pass?: string } | undefined {
    return this.configService.get('email.smtp', { infer: true });
  }
}
