import { z } from 'zod';

export const NodeEnv = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export type NodeEnvType = (typeof NodeEnv)[keyof typeof NodeEnv];

export const envSchema = z.object({
  NODE_ENV: z
    .enum([NodeEnv.DEVELOPMENT, NodeEnv.PRODUCTION, NodeEnv.TEST])
    .default(NodeEnv.DEVELOPMENT),
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(65535)),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (val) => val.startsWith('postgresql://') || val.startsWith('postgres://'),
      'DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://',
    ),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173')
    .transform((val) =>
      val
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  RATE_LIMIT_TTL_MS: z
    .string()
    .default('60000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  REQUEST_TIMEOUT_MS: z
    .string()
    .default('15000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  SWAGGER_ENABLED: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) {
        return process.env.NODE_ENV !== NodeEnv.PRODUCTION;
      }
      return val === 'true' || val === '1';
    }),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters')
    .default('budgie_dev_access_secret_key_minimum_32_characters_long_1234'),
  JWT_ACCESS_EXPIRATION_SECONDS: z
    .string()
    .default('900')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  REFRESH_TOKEN_EXPIRATION_DAYS: z
    .string()
    .default('30')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  APP_URL: z.string().default('http://localhost:3000'),
  EMAIL_FROM: z.string().default('noreply@budgie.app'),
  EMAIL_TRANSPORT: z.enum(['log', 'smtp', 'mock']).default('log'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Validates environment variables against envSchema.
 * Ensures that validation errors are sanitized so secret values are never leaked in error messages.
 */
export function validateEnv(config: Record<string, unknown>): ValidatedEnv {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const sanitizedIssues = result.error.issues.map((issue) => {
      const fieldPath = issue.path.join('.');
      return `  - [${fieldPath}]: ${issue.message}`;
    });

    const errorMessage = [
      'Invalid environment configuration detected on startup:',
      ...sanitizedIssues,
      'Check your environment variables or .env file.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  return result.data;
}
