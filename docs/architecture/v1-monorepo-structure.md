# V1 Monorepo Structure: Second Memory

- Product: Second Memory
- Date: 2026-08-04
- Status: Draft
- Owner: Solo Builder (PO/Architect/Developer)

## 1. Purpose

This document defines the MVP monorepo layout, package boundaries, and workspace task model for pnpm workspaces and Turborepo.

## 2. Scope

In scope:

1. Top-level repository folder structure.
2. Ownership boundaries for apps, services, and shared packages.
3. Turborepo task mapping for development and CI.
4. MVP environment assumptions for Dockerized stateful dependencies.

Out of scope:

1. Detailed cloud-specific deployment manifests.
2. Team process and code ownership policy beyond technical boundaries.

## 3. Monorepo Principles

1. Single source of truth for shared contracts and reusable packages.
2. Clear separation between deployable units and shared libraries.
3. Fast local iteration using task graph caching and affected-only execution.
4. Enforced dependency direction from apps/services to shared packages, not the reverse.

## 4. MVP Top-Level Folder Structure

```text
second-memory/
  apps/
    web/                 # Next.js web client
    mobile/              # Expo mobile client

  services/
    memory-service/      # NestJS memory service
    ask-service/         # Ask orchestration service
    worker-embeddings/   # BullMQ worker for embedding jobs

  packages/
    shared-types/        # DTOs, API contracts, shared domain types
    server-db/           # Prisma schema, migrations, DatabaseModule, UsersModule
    nest-auth/           # Firebase auth, guards, request-context utilities
    shared-config/       # ESLint, TypeScript, lint/build presets
    ui/                  # Shared UI tokens/components where practical
    client-sdk/          # Typed API client helpers

  infra/
    docker/
      docker-compose.yml # MVP local/staging/pilot runtime
      redis/             # Redis config and persistence settings
      postgres/          # PostgreSQL init and migration bootstrap

  docs/
    architecture/
    product/

  turbo.json
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
  README.md
```

## 5. Folder Responsibilities and Boundaries

1. apps/
- Contains user-facing clients only.
- apps/web owns browser UX and web delivery concerns.
- apps/mobile owns mobile UX and platform integration through Expo.

2. services/
- Contains independently deployable backend units.
- services/memory-service owns capture/list/search and persistence boundaries.
- services/ask-service owns retrieval orchestration, LLM interaction, and ask session flow.
- services/worker-embeddings owns background embedding generation and retry handling (Python + BullMQ consumer).

3. packages/
- Contains non-deployable shared libraries.
- shared-types is the contract boundary shared by apps and services.
- server-db owns the canonical Prisma schema, migrations, DatabaseModule, and UsersModule.
- nest-auth owns Firebase authentication, request-context guards/decorators, and internal S2S context validation.
- shared-config centralizes linting/TypeScript/build conventions.
- ui is optional and should contain only reusable, product-consistent components.
- client-sdk wraps service APIs with typed request/response helpers.

4. infra/
- Contains infrastructure definitions and runnable local/staging/pilot stack assets.
- Docker artifacts for Redis and PostgreSQL live under infra/docker.

5. docs/
- Contains product, architecture, and operational documentation.

## 6. Dependency Direction Rules

1. apps/* can depend on packages/*.
2. services/* can depend on packages/*.
3. packages/* must not depend on apps/* or services/*.
4. Service-to-service integration should use explicit network contracts, not direct source imports.
5. Avoid cross-imports between deployable units unless moved into packages/shared-types or client-sdk.

## 7. Turborepo Task Model (MVP)

1. Core tasks
- dev: long-running development tasks for selected workspaces.
- lint: static checks across changed and dependent workspaces.
- test: unit/integration tests scoped by task graph.
- build: production artifacts for deployable units and required packages.

2. Typical pipeline intent
- lint and test run before build in CI.
- build depends on upstream package build outputs when required.
- cacheable tasks should define deterministic outputs to maximize reuse.

3. Local development focus
- Filtered task execution should target only touched apps/services plus required shared packages.
- Shared type/package changes should trigger dependent app/service tasks automatically.

## 8. Environment and Runtime Notes (MVP)

1. Redis and PostgreSQL run in Docker for:
- Local development
- Staging
- Initial production pilot

2. Worker messaging uses Redis + BullMQ.

3. Runtime implications
- Persistence and backup strategy must be explicit before pilot traffic.
- Resource limits for Redis/PostgreSQL containers must be set per environment tier.

4. Authentication runtime notes
- Firebase Authentication is the V1 identity provider.
- apps/web and apps/mobile own Firebase client configuration for sign-in flows.
- API Gateway/BFF verifies Firebase ID tokens and maps Firebase uid to internal USER.id.

## 9. Alignment with Other Architecture Docs

1. Technology decisions and revisit triggers: see v1-implementation-decisions.md.
2. System-level flows and service responsibilities: see v1-system-architecture.md.

## 10. Revisit Triggers

1. Need for independent scaling/lifecycle that monorepo boundaries no longer support cleanly.
2. Queue throughput or reliability requirements beyond Redis + BullMQ operational limits.
3. Operational/SLA needs that require migration from Dockerized stateful services to managed offerings.
4. Shared package sprawl causing unclear ownership or unstable dependency graph.
