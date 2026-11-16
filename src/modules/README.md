# Business Modules Directory

This directory is designated for feature modules in the Budgie modular monolith.

## Architectural Boundaries

Each feature module must follow Clean Architecture boundaries:

```text
modules/<feature-name>/
├── domain/            # Framework-independent domain entities, value objects, and business rules
├── application/       # Use cases, application services, commands/queries, and repository interfaces
├── infrastructure/    # Database repository implementations (Prisma), external API adapters
└── presentation/      # HTTP controllers, Zod request DTOs, response mappers
```

## Modular Monolith Rules

1. **Isolation**: A module must not directly access internal classes or private services of another module. Cross-module collaboration must occur strictly through public module interfaces or exported services.
2. **Persistence Boundary**: Database access via Prisma must remain encapsulated within the module's `infrastructure/` boundary.
3. **No Premature Complexity**: Keep modules cohesive. Do not build microservice abstractions, message brokers, or distributed events until requirements justify them.
4. **Independent Testability**: Domain and application layers must be unit testable in isolation without running an HTTP server or database.
