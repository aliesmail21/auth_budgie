# Budgie Backend

Production-oriented backend foundation for **Budgie**, a personal finance management system serving React web and Flutter mobile clients.

---

## 1. Project Overview & Architectural Principles

Budgie Backend is built as a **Modular Monolith** applying **Clean Architecture** principles. It serves as the authoritative engine for financial calculations, ledger integrity, data isolation, and client synchronization.

Key architectural boundaries:

- **Domain**: Pure business rules, calculation invariants, zero external dependencies.
- **Application**: Use cases, command/query handlers, orchestration.
- **Infrastructure**: PostgreSQL persistence via Prisma ORM, external adapters.
- **Presentation**: NestJS HTTP controllers, Zod validation pipes, and error filters.

---

## 2. Technology Stack

- **Runtime**: Node.js 22 LTS (pinned via `.nvmrc`)
- **Language**: TypeScript 5.7+ with strict type checking enabled
- **Backend Framework**: NestJS 11
- **Database & ORM**: PostgreSQL 17 & Prisma ORM 6.19
- **Validation**: Zod (for environment variables and HTTP boundary validation)
- **Logging**: Pino via `nestjs-pino` with request correlation IDs and sensitive data redaction
- **Security**: Helmet, strict CORS policy, `@nestjs/throttler` rate limiting, body size limits
- **Testing**: Jest, `ts-jest`, Supertest
- **API Documentation**: OpenAPI / Swagger (`/docs`)
- **Code Quality**: ESLint 9 & Prettier
- **Continuous Integration**: GitHub Actions (`.github/workflows/ci.yml`)
- **Package Manager**: npm

---

## 3. Prerequisites

Ensure you have the following installed locally:

- [Node.js](https://nodejs.org/) (v22.x LTS recommended; see `.nvmrc`)
- [npm](https://www.npmjs.com/) (v10+ or v11+)
- [PostgreSQL 17](https://www.postgresql.org/) (installed and running locally on Windows with a database named `budgie`)

---

## 4. Local Development Setup (From Fresh Clone)

Follow these steps sequentially to set up and run Budgie Backend locally:

### Step 1: Clone the repository and install dependencies

```bash
git clone <repository-url>
cd Budgie-Backend
npm ci
```

### Step 2: Configure Environment Variables

Copy the example environment configuration:

```bash
# On Linux/macOS
cp .env.example .env

# On Windows PowerShell
Copy-Item .env.example .env
```

Inspect `.env` to configure your local PostgreSQL connection credentials (pointing to `localhost:5432/budgie`).

### Step 3: Verify Local PostgreSQL 17 Service

Ensure that PostgreSQL 17 is running locally on Windows:

```powershell
Get-Service postgresql-x64-17
```

If the service is stopped, start it:

```powershell
Start-Service postgresql-x64-17
```

Ensure your `DATABASE_URL` in `.env` connects to your local `budgie` database on `localhost:5432`.

### Step 4: Generate the Prisma Client

Generate the TypeScript client bindings from the Prisma schema:

```bash
npm run prisma:generate
```

### Step 5: Apply Database Migrations

Apply any pending database migrations:

```bash
npm run prisma:migrate:dev
```

### Step 6: Start the Development Server

Run the NestJS application in watch mode with hot reload:

```bash
npm run start:dev
```

The server will boot at `http://localhost:3000`.

---

## 5. Available Scripts

| Command                         | Description                                              |
| :------------------------------ | :------------------------------------------------------- |
| `npm run start:dev`             | Starts the server in development watch mode              |
| `npm run start:debug`           | Starts the server with Node.js debug inspector attached  |
| `npm run build`                 | Compiles the production build into `./dist`              |
| `npm run start:prod`            | Runs the compiled production build from `./dist`         |
| `npm run lint`                  | Runs ESLint across all TypeScript files                  |
| `npm run format`                | Formats all source and test files using Prettier         |
| `npm run typecheck`             | Executes TypeScript type checking without emitting files |
| `npm run test`                  | Executes unit tests with Jest                            |
| `npm run test:watch`            | Runs unit tests in watch mode                            |
| `npm run test:cov`              | Executes unit tests and outputs coverage reports         |
| `npm run test:e2e`              | Runs end-to-end integration tests with Supertest         |
| `npm run prisma:generate`       | Generates the Prisma client from `schema.prisma`         |
| `npm run prisma:format`         | Formats `schema.prisma` to canonical style               |
| `npm run prisma:migrate:dev`    | Applies migrations in development mode                   |
| `npm run prisma:migrate:deploy` | Applies pending migrations in production or CI           |
| `npm run prisma:studio`         | Opens the Prisma Studio visual database browser          |

---

## 6. Operational Endpoints & API Documentation

### Interactive Swagger / OpenAPI Documentation

When enabled (`SWAGGER_ENABLED=true`), Swagger UI is available at:

```text
http://localhost:3000/docs
```

### Operational Health Endpoints

These endpoints are purposefully unversioned (exempt from the `/api/v1` prefix) for standard Kubernetes and load balancer health probing:

#### 1. Liveness Probe (`GET /health/live`)

Indicates whether the application process is running and accepting HTTP requests.

- **URL**: `http://localhost:3000/health/live`
- **Response** (HTTP 200):
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-28T12:00:00.000Z"
  }
  ```

#### 2. Readiness Probe (`GET /health/ready`)

Verifies external dependency connectivity (PostgreSQL).

- **URL**: `http://localhost:3000/health/ready`
- **Success Response** (HTTP 200 - All dependencies healthy):
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-28T12:00:00.000Z",
    "checks": {
      "database": "up"
    }
  }
  ```
- **Degraded Response** (HTTP 503 - Database unreachable):
  ```json
  {
    "status": "down",
    "timestamp": "2026-10-28T12:00:00.000Z",
    "checks": {
      "database": "down"
    }
  }
  ```

---

## 7. Standard Error Response Envelope

All API errors return a consistent, structured JSON envelope. Stack traces, SQL syntax details, and database credentials are never leaked to clients.

```json
{
  "statusCode": 400,
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "timestamp": "2026-10-28T12:00:00.000Z",
  "path": "/api/v1/resource",
  "requestId": "c1f7b820-2211-477c-a494-07aa88dd0011",
  "details": [
    {
      "field": "amount",
      "message": "Expected number, received string"
    }
  ]
}
```

---

## 8. Request Tracing & Correlation

Every incoming HTTP request is assigned a correlation ID:

- If a client supplies an `X-Request-Id` header (alphanumeric and hyphens, up to 64 characters), it is validated and propagated.
- If omitted or invalid, a secure UUID is generated automatically.
- The correlation ID is attached to all Pino structured log entries and returned in the `X-Request-Id` response header.

When debugging a customer or client incident:

1. Obtain the `X-Request-Id` from the client response header or error payload.
2. Search log output for `requestId`:
   ```bash
   # Example searching structured JSON logs
   grep "c1f7b820-2211-477c-a494-07aa88dd0011" app.log
   ```

---

## 9. Troubleshooting

### Problem: `Invalid environment configuration detected on startup`

- **Cause**: Required environment variables are missing or formatted incorrectly in `.env`.
- **Solution**: Check `.env.example` to ensure `DATABASE_URL` starts with `postgresql://` and that `PORT` is a valid positive integer.

### Problem: `Database ping check failed` or Readiness probe returns 503

- **Cause**: Local PostgreSQL 17 service is stopped, unreachable on port 5432, or connection credentials in `.env` are incorrect.
- **Solution**: Verify the PostgreSQL Windows service is running (`Get-Service postgresql-x64-17` or `Start-Service postgresql-x64-17`). Check the `DATABASE_URL` in `.env` to ensure credentials, port, and database name `budgie` are correct.

### Problem: `Cannot find module '@prisma/client'`

- **Cause**: The Prisma client has not been generated for the current schema.
- **Solution**: Run `npm run prisma:generate`.
#   a u t h _ b u d g i e  
 