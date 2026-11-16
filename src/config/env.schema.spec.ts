import { validateEnv, envSchema, NodeEnv } from './env.schema';

describe('Environment Configuration Validation', () => {
  const validBaseEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    HOST: '0.0.0.0',
    DATABASE_URL: 'postgresql://postgres:secret@localhost:5432/budgie',
    CORS_ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:5173',
    LOG_LEVEL: 'info',
  };

  it('should successfully parse valid configuration', () => {
    const config = validateEnv(validBaseEnv);

    expect(config.NODE_ENV).toBe(NodeEnv.DEVELOPMENT);
    expect(config.PORT).toBe(3000);
    expect(config.HOST).toBe('0.0.0.0');
    expect(config.DATABASE_URL).toBe(validBaseEnv.DATABASE_URL);
    expect(config.CORS_ALLOWED_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:5173']);
  });

  it('should apply safe default values when optional fields are omitted', () => {
    const minimalEnv = {
      DATABASE_URL: 'postgresql://postgres:secret@localhost:5432/budgie',
    };

    const config = validateEnv(minimalEnv);

    expect(config.NODE_ENV).toBe(NodeEnv.DEVELOPMENT);
    expect(config.PORT).toBe(3000);
    expect(config.HOST).toBe('0.0.0.0');
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.RATE_LIMIT_TTL_MS).toBe(60000);
    expect(config.RATE_LIMIT_MAX).toBe(100);
    expect(config.REQUEST_TIMEOUT_MS).toBe(15000);
  });

  it('should throw sanitized error without leaking raw secret when DATABASE_URL is missing', () => {
    const invalidEnv = {
      PORT: '3000',
    };

    expect(() => validateEnv(invalidEnv)).toThrow(
      /Invalid environment configuration detected on startup/,
    );
    expect(() => validateEnv(invalidEnv)).toThrow(/DATABASE_URL/);
  });

  it('should reject invalid DATABASE_URL protocol without leaking value', () => {
    const invalidEnv = {
      DATABASE_URL: 'mysql://root:supersecretpassword@localhost:3306/db',
    };

    try {
      validateEnv(invalidEnv);
      fail('Should have thrown validation error');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      expect(message).toContain('DATABASE_URL');
      expect(message).not.toContain('supersecretpassword');
    }
  });

  it('should correctly coerce SWAGGER_ENABLED boolean', () => {
    const schemaWithTrue = envSchema.parse({
      ...validBaseEnv,
      SWAGGER_ENABLED: 'true',
    });
    expect(schemaWithTrue.SWAGGER_ENABLED).toBe(true);

    const schemaWithFalse = envSchema.parse({
      ...validBaseEnv,
      SWAGGER_ENABLED: 'false',
    });
    expect(schemaWithFalse.SWAGGER_ENABLED).toBe(false);
  });
});
