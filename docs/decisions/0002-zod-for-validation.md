# ADR 0002: Zod for Request and Configuration Validation

## Status

Accepted

## Context

Validation is needed at two critical boundaries:

1. Environment variables on application bootstrap.
2. Incoming HTTP payloads (body, query, params) from web and mobile clients.

Traditionally, NestJS applications rely on `class-validator` and `class-transformer` with decorators. However, decorator-based validation couples runtime validation with class definitions, requires experimental decorator metadata reflection, and makes recursive or discriminated union validation cumbersome.

## Decision

We adopted **Zod** for both environment variable validation (`src/config/env.schema.ts`) and HTTP request payload validation (`src/common/pipes/zod-validation.pipe.ts`).

## Consequences

### Positive

- Unified validation paradigm across environment config and HTTP boundaries.
- Type inference directly from schemas (`z.infer<typeof schema>`), eliminating duplicate TypeScript interface maintenance.
- Sanitized startup failure reporting without leaking secret credentials.
- Easy validation of complex nested structures and refined business invariants.

### Negative / Trade-offs

- Requires integration with NestJS via a custom `ZodValidationPipe` rather than using the default `ValidationPipe`.
- OpenAPI schema generation requires explicit swagger decorators or schema mappings.
