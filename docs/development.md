# Developer Workflow & Team Conventions

This guide documents the day-to-day engineering practices for the Budgie Backend team.

---

## 1. Team Collaboration & Git Workflow

With two engineers actively collaborating, simplicity and clarity take precedence over cumbersome branching models.

### Branch Strategy

- **Base Branch**: `main` (always deployable, protected).
- **Feature Branches**: `feat/<short-description>` (e.g., `feat/accounts-domain`).
- **Fix Branches**: `fix/<short-description>` (e.g., `fix/readiness-probe-timeout`).
- **Chore/Refactor**: `chore/<short-description>` or `refactor/<short-description>`.

### Pull Request (PR) Rules

1. **Branch Lifespan**: Keep feature branches small (1–3 days max). Large features should be split into architectural steps (domain models -> persistence -> HTTP controllers).
2. **Pre-flight Checks**: Before opening a PR or requesting review, run:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run test:e2e
   ```
3. **Review Policy**: Every PR requires approval from the second developer before merge.
4. **Merge Method**: Use **Squash and Merge** or **Rebase and Merge** to maintain a linear, clean Git commit history.

---

## 2. Database Migrations Workflow (Prisma)

Migrations are the authoritative source of truth for the database schema. Manual database alterations or automatic sync (`db push`) in production are strictly forbidden.

### Creating a New Migration

1. Ensure your local PostgreSQL 17 service is running on Windows (e.g., via PowerShell: `Get-Service postgresql-x64-17` or starting it with `Start-Service postgresql-x64-17`).
2. Update `prisma/schema.prisma` with your model changes.
3. Run the development migration command:
   ```bash
   npm run prisma:migrate:dev -- --name describe_your_change
   ```
4. Prisma creates a SQL migration file in `prisma/migrations/<timestamp>_describe_your_change/migration.sql` and applies it to your local database.
5. Review the generated `.sql` file to verify index creation, column nullability, and foreign key constraints.
6. Commit the updated `schema.prisma` AND the new migration directory to Git.

### Applying Migrations in CI / Production

In automated deployment or CI environments, run:

```bash
npm run prisma:migrate:deploy
```

This applies pending migrations without running development checks or prompting for interactive input.

---

## 3. Naming & Code Conventions

### File & Folder Naming

- Use kebab-case for all source files and directories:
  - `account.service.ts`
  - `create-transaction.dto.ts`
  - `transaction.repository.interface.ts`
- Test files must match the target with `.spec.ts` (unit tests) or `.e2e-spec.ts` (integration/e2e tests).

### TypeScript Conventions

- **Strict Typing**: `strict: true` is enforced in `tsconfig.json`.
- **No `any`**: Do not use `any` to bypass the type system. Use `unknown` and narrow with type guards or Zod schemas.
- **No Non-Null Assertions**: Avoid `!` unless provably safe within a guarded boundary.
- **Explicit Return Types**: Strive for explicit return types on public methods, services, and controller actions.

---

## 4. Error-Handling Conventions

### Domain & Application Errors

Domain and application layers must throw subclasses of `AppError` (or plain domain exceptions mapped by presentation), never NestJS `HttpException`:

```typescript
import { AppError } from '../common/errors/app-error';

if (balance < withdrawalAmount) {
  throw AppError.badRequest('Insufficient funds for transaction', {
    availableBalance: balance,
    requestedAmount: withdrawalAmount,
  });
}
```

### Presentation & Global Filter

- HTTP controllers catch or let domain errors bubble to `AllExceptionsFilter`.
- `AllExceptionsFilter` automatically formats the error into the standardized JSON response envelope:
  ```json
  {
    "statusCode": 400,
    "errorCode": "BAD_REQUEST",
    "message": "Insufficient funds for transaction",
    "timestamp": "2026-10-28T12:00:00.000Z",
    "path": "/api/v1/transactions",
    "requestId": "9c8a24b1-8b21-4f9e-a89e-2244bb66aa00",
    "details": {
      "availableBalance": 50.0,
      "requestedAmount": 100.0
    }
  }
  ```
- Unhandled 500 exceptions are logged once with full stack trace and correlation ID, while returning a sanitized message to the client.

---

## 5. Testing Expectations

1. **Unit Tests (`*.spec.ts`)**:
   - Focus on domain logic, calculation algorithms, validation pipes, and application use cases.
   - Run in-memory with zero external service dependencies.
   - Run via: `npm run test`
2. **End-to-End Tests (`test/*.e2e-spec.ts`)**:
   - Verify HTTP contracts, routing, error filters, rate limiting, and database interactions.
   - Run via: `npm run test:e2e`
3. **Coverage Expectations**:
   - Run `npm run test:cov` before major releases to inspect test coverage metrics.
