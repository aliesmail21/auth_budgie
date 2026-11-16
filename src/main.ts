import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import express from 'express';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const appConfig = app.get(AppConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Enable graceful shutdown hooks for SIGTERM / SIGINT handling
  app.enableShutdownHooks();

  // Security HTTP Headers
  app.use(helmet());

  // Strict Request Body Size Limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // CORS Configuration
  const allowedOrigins = appConfig.corsAllowedOrigins;
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin '${origin}' not permitted by CORS policy.`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    credentials: true,
  });

  // Global API Prefix (excludes health checks and documentation endpoints)
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/(.*)', 'docs', 'docs/(.*)'],
  });

  // OpenAPI / Swagger Documentation
  const swaggerEnabled = appConfig.swaggerEnabled;
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Budgie Backend API')
      .setDescription(
        'Authoritative backend for the Budgie personal finance management system. Provides secure APIs for web and offline-first mobile clients.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter your access token',
          in: 'header',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = appConfig.port;
  const host = appConfig.host;

  await app.listen(port, host);

  logger.log(`Budgie Backend initialized in ${appConfig.nodeEnv} mode at http://${host}:${port}`);
  if (swaggerEnabled) {
    logger.log(`OpenAPI documentation accessible at http://${host}:${port}/docs`);
  }
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  // Log critical startup failure to stderr
  process.stderr.write(`FATAL: Application failed to start: ${message}\n`);
  process.exit(1);
});
