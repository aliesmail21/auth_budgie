# Architecture Blueprint: Budgie Backend

## 1. Architectural Strategy: Modular Monolith

Budgie uses a **Modular Monolith** architecture. This pattern was deliberately selected to balance developer velocity, maintainability, strong operational boundaries, and cost efficiency.

```
+--------------------------------------------------------------------------+
|                             Budgie Backend                               |
|                                                                          |
|  +--------------------+  +--------------------+  +--------------------+  |
|  |    Health & Ops    |  |    Auth/Users      |  |   Transactions     |  |
|  |     (Operational)  |  |   (Future Module)  |  |   (Future Module)  |  |
|  +---------+----------+  +---------+----------+  +---------+----------+  |
|            |                       |                       |             |
|            +-----------------------+-----------------------+             |
|                                    |                                     |
|                                    v                                     |
|             +----------------------------------------------+             |
|             |          Infrastructure / Database           |             |
|             |          (PrismaService, PostgreSQL)         |             |
|             +----------------------------------------------+             |
+--------------------------------------------------------------------------+
```

### Why Modular Monolith?

- **High Cohesion, Low Coupling**: Features are encapsulated in distinct vertical modules, but deploy as a single unit without the distributed systems overhead of microservices (no service meshes, network hops, distributed transactions, or multi-repo drift).
- **Authoritative Calculations**: In a personal finance management app, transaction consistency and balance calculation integrity require single-database ACID guarantees.
- **Future Decomposition Path**: Because each module enforces strict internal boundaries, any module can be separated into an independent service later if scaling requirements demand it.

---

## 2. Layered Clean Architecture within Modules

When business modules are introduced (e.g. Accounts, Transactions, Budgets), each module must strictly adhere to the four Clean Architecture concentric boundaries:

```
[ Presentation (HTTP Controllers, DTOs, Zod Pipes) ]
       │
       ▼
[ Application (Use Cases, Commands/Queries, Orchestration) ]
       │
       ▼
[ Domain (Entities, Value Objects, Core Financial Rules) ]
       ▲
       │
[ Infrastructure (Prisma Repositories, Technical Adapters) ]
```

### Layer Responsibilities

1. **Domain Layer**:
   - Contains pure business logic, calculations, entities, value objects, and domain events.
   - Built upon shared primitives in `src/common/domain/` (`BaseEntity<TId>`, `ValueObject<TProps>`, `Result<T, E>`, and `Money`).
   - **Zero external dependencies**: Must not import NestJS, Express, Prisma, HTTP libraries, or third-party SDKs.
   - Authoritative financial logic (e.g. currency conversion, split calculations, balance math) lives here.

2. **Application Layer**:
   - Contains use case handlers (commands, queries), application services, and port interfaces.
   - Coordinates domain entities and invokes infrastructure ports (e.g., `TransactionRepository` interface).
   - Independent of HTTP transport details.

3. **Infrastructure Layer**:
   - Implements ports defined by the application layer (e.g., Prisma repository implementations, payment or exchange rate adapters).
   - Encapsulates database queries, transactions, and technical integrations.
   - Exposes clean domain objects to the application layer.

4. **Presentation Layer**:
   - Houses NestJS HTTP controllers, Zod request schemas, and response view models.
   - Responsible for input validation, HTTP status mapping, and authentication guard enforcement.
   - Controllers must remain thin, delegating work immediately to application use cases.

---

## 3. Dependency Direction & Inversion Rules

1. **Inward Dependencies**: Outer layers (Presentation, Infrastructure) depend on inner layers (Application, Domain). Inner layers **never** depend on outer layers.
2. **Database Isolation**: No controller or application service may issue Prisma queries directly. All database access must pass through repository abstractions or infrastructure boundaries.
3. **Cross-Module Communication**:
   - Modules must not import internal services, entities, or database tables from other modules.
   - Modules communicate solely via exported public application services or domain events.
   - If Module A needs data from Module B, Module B exports a dedicated facade/service (`AccountsPublicService`), or fires an in-memory event.
4. **No Circular Module Imports**: NestJS module dependency trees must form a directed acyclic graph (DAG). Circular dependencies (`forwardRef`) indicate an architectural boundary violation and are prohibited.

---

## 4. Technical Cross-Cutting Concerns

- **Configuration**: All environment variables pass through `src/config/env.schema.ts` (Zod validated on boot).
- **Validation**: Strict boundary validation using `ZodValidationPipe` at presentation inputs.
- **Observability**: Structured JSON logging with Pino, automatic `x-request-id` propagation, and sensitive field redaction.
- **Security**: Strict CORS whitelisting, Helmet security headers, rate limiting via `@nestjs/throttler`, and request payload size limits.
- **Error Handling**: `AllExceptionsFilter` traps all exceptions, logs internal errors once with correlation IDs, and returns consistent, sanitized JSON payloads to clients without leaking infrastructure details.
