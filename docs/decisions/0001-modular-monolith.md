# ADR 0001: Modular Monolith Architecture

## Status

Accepted

## Context

Budgie is a personal finance management application serving both a React web frontend and an offline-first Flutter mobile application. The system requires authoritative calculations, data isolation, and consistent transactional boundaries. We evaluated whether to adopt a microservices architecture or a modular monolith.

## Decision

We chose a **Modular Monolith** architecture built on NestJS with Clean Architecture principles within modules.

## Consequences

### Positive

- Direct in-memory method calls between module facades instead of RPC network hops.
- Single database transaction capabilities (ACID) essential for financial ledger integrity.
- Simplified operational model: single deployment pipeline, single deployment artifact, reduced hosting costs.
- Straightforward local developer environment.

### Negative / Trade-offs

- Requires discipline to prevent developers from bypassing module boundaries or introducing circular dependencies.
- Monolith builds recompile the entire repository (mitigated with incremental TypeScript builds).
