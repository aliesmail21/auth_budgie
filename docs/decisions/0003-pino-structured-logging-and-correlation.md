# ADR 0003: Pino Structured Logging and Request Correlation

## Status

Accepted

## Context

A financial backend requires high-performance, structured logging and the ability to trace requests across web and mobile clients. Log output must avoid leaking sensitive credentials, authorization tokens, or personally identifiable information (PII).

## Decision

We integrated **Pino** via `nestjs-pino`, `pino-http`, and `pino-pretty`:

- Human-readable colorized logs in local development (`NODE_ENV=development`).
- High-throughput, machine-readable JSON logs in production (`NODE_ENV=production`).
- Automated correlation via `x-request-id` (validated or generated per request) attached to log records and response headers.
- Built-in redaction rules for sensitive headers and payload fields (`authorization`, `cookie`, `set-cookie`, `password`, `token`, `refreshToken`, `secret`, `apiKey`).

## Consequences

### Positive

- Substantially lower CPU overhead compared to Winston or default console loggers.
- End-to-end trace correlation using standard `x-request-id`.
- Enforced security redaction preventing accidental data leaks in log aggregation services (e.g., Datadog, CloudWatch).

### Negative / Trade-offs

- Local pretty-printing adds an asynchronous worker thread via `pino-pretty` (only in development).
