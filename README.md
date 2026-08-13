# second-memory

Your second memory - capture today, remember forever.

## Monorepo (V1)

This repository is a pnpm + Turborepo monorepo aligned with the V1 architecture docs.

### Implemented

| Workspace | Status | Description |
|-----------|--------|-------------|
| `apps/web` | Done | Next.js web client — auth, self-talk capture, ask UI |
| `apps/mobile` | Done | Expo mobile client — same flows as web |
| `services/memory-service` | Done | NestJS memory API — capture, list, search, outbox → BullMQ |
| `services/worker-embeddings` | Done | Python BullMQ worker — sentence-transformers → pgvector |
| `services/ask-service` | Planned | RAG/chat orchestration |
| `packages/*` | Partial | Shared types, client SDK, UI hooks |

## Repository Layout

```text
apps/
	web/                 # Next.js web client (done)
	mobile/              # Expo mobile client (done)

services/
	memory-service/      # NestJS memory APIs (done)
	ask-service/         # Retrieval orchestration service (planned)
	worker-embeddings/   # Python BullMQ embedding worker (done)

packages/
	shared-types/        # Shared contracts and DTOs
	shared-config/       # Shared lint/ts/build presets
	ui/                  # Shared UI hooks and components
	client-sdk/          # Typed client helpers

infra/
	docker/
		docker-compose.yml # Redis + PostgreSQL (+ optional worker)
```

## Tooling

- Workspace manager: pnpm workspaces
- Task runner: Turborepo
- Language baseline: TypeScript (apps/services except worker-embeddings, which is Python)

## Root Scripts

- `pnpm dev` runs `turbo run dev --parallel`
- `pnpm build` runs `turbo run build`
- `pnpm lint` runs `turbo run lint`
- `pnpm test` runs `turbo run test`

## Local Development

Start infrastructure, then run the services you need:

```bash
# 1. Postgres + Redis
cd infra/docker && docker compose up -d postgres redis

# 2. Memory service
cd services/memory-service
cp .env.example .env   # if needed
pnpm db:migrate
pnpm dev

# 3. Embedding worker (Python)
cd services/worker-embeddings
cp .env.example .env
uv sync
uv run python -m worker_embeddings.main

# 4. Web and/or mobile (from repo root)
pnpm --filter @second-memory/web dev
pnpm --filter @second-memory/mobile dev
```

Or run everything in parallel from the repo root:

```bash
pnpm dev
```

## Memory Service Database Setup

PostgreSQL persistence uses Prisma in `services/memory-service`.

```bash
cd infra/docker && docker compose up -d postgres
cd services/memory-service
cp .env.example .env   # if needed
pnpm db:migrate
pnpm dev
```

E2E tests require Postgres running and apply migrations automatically via `test/global-setup.ts`.

## Embedding Worker Setup

The embedding worker is a Python service using BullMQ and sentence-transformers.

```bash
cd infra/docker && docker compose up -d postgres redis
cd services/worker-embeddings
cp .env.example .env
uv sync
uv run python -m worker_embeddings.main
```

Or start it via Docker Compose:

```bash
cd infra/docker && docker compose up -d worker-embeddings
```

## Next Steps

1. Scaffold `services/ask-service` for RAG/chat orchestration.
2. Add vector search to `memory-service` `searchMemories` (replace keyword fallback).
3. Add shared ESLint and tsconfig presets in `packages/shared-config`.
