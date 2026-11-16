import { validateEnv, ValidatedEnv } from './env.schema';

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  server: {
    port: number;
    host: string;
    requestTimeoutMs: number;
  };
  database: {
    url: string;
  };
  security: {
    corsAllowedOrigins: string[];
    rateLimit: {
      ttlMs: number;
      limit: number;
    };
  };
  logging: {
    level: string;
  };
  swagger: {
    enabled: boolean;
  };
  auth: {
    jwtAccessSecret: string;
    jwtAccessExpirationSeconds: number;
    refreshTokenExpirationDays: number;
  };
  email: {
    appUrl: string;
    from: string;
    transport: 'log' | 'smtp' | 'mock';
    smtp?: {
      host?: string;
      port?: number;
      user?: string;
      pass?: string;
    };
  };
}

export function configuration(): AppConfig {
  const env: ValidatedEnv = validateEnv(process.env);

  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',
    server: {
      port: env.PORT,
      host: env.HOST,
      requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
    },
    database: {
      url: env.DATABASE_URL,
    },
    security: {
      corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS,
      rateLimit: {
        ttlMs: env.RATE_LIMIT_TTL_MS,
        limit: env.RATE_LIMIT_MAX,
      },
    },
    logging: {
      level: env.LOG_LEVEL,
    },
    swagger: {
      enabled: env.SWAGGER_ENABLED,
    },
    auth: {
      jwtAccessSecret: env.JWT_ACCESS_SECRET,
      jwtAccessExpirationSeconds: env.JWT_ACCESS_EXPIRATION_SECONDS,
      refreshTokenExpirationDays: env.REFRESH_TOKEN_EXPIRATION_DAYS,
    },
    email: {
      appUrl: env.APP_URL,
      from: env.EMAIL_FROM,
      transport: env.EMAIL_TRANSPORT,
      smtp: env.SMTP_HOST
        ? {
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
    },
  };
}
