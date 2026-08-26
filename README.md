# second-memory

Your second memory - capture today, remember forever.

## Monorepo (V1)

This repository is a pnpm + Turborepo monorepo aligned with the V1 architecture docs.

### Implemented

| Workspace | Status | Description |
|-----------|--------|-------------|
| `apps/web` | Done | Next.js web client — auth, self-talk capture, ask UI |
| `apps/mobile` | Done | Expo mobile client — same flows as web |
| `services/memory-service` | Done | NestJS memory API — capture, list, vector search (keyword fallback), outbox → BullMQ |
| `services/worker-embeddings` | Optional | Python BullMQ worker — async embedding via local sentence-transformers (384 dims; not started by `pnpm dev`) |
| `services/ask-service` | Milestone B | NestJS RAG/chat orchestration — `/v1/ask/messages` |
| `packages/*` | Partial | Shared types, server-db, nest-auth, client SDK, UI hooks |

## Repository Layout

```text
apps/
	web/                 # Next.js web client (done)
	mobile/              # Expo mobile client (done)

services/
	memory-service/      # NestJS memory APIs (done)
	ask-service/         # NestJS RAG/chat orchestration (Milestone B)
	worker-embeddings/   # Python BullMQ embedding worker (done)

packages/
	shared-types/        # Shared contracts and DTOs
	server-db/           # Prisma schema, migrations, DatabaseModule, UsersModule
	nest-auth/           # Firebase auth, guards, request-context utilities
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

- `pnpm dev` runs `turbo run dev --parallel` (excludes `worker-embeddings`; start it separately when needed)
- `pnpm build` runs `turbo run build`
- `pnpm lint` runs `turbo run lint`
- `pnpm test` runs `turbo run test`

## Local Development

Start infrastructure, then run the services you need:

```bash
# 1. Postgres (+ Redis only if using worker storage mode)
cd infra/docker && docker compose up -d postgres

# 2. Database migrations + memory service
pnpm --filter @second-memory/server-db db:migrate
cd services/memory-service
cp .env.example .env   # set EMBEDDING_API_KEY for OpenAI
pnpm dev

# 3. Ask service
cd services/ask-service
cp .env.example .env   # if needed
pnpm dev

# 4. Web and/or mobile (from repo root)
pnpm --filter @second-memory/web dev
pnpm --filter @second-memory/mobile dev
```

Or run everything in parallel from the repo root (TypeScript apps only):

```bash
pnpm dev
```

### Optional: embedding worker (async BullMQ mode)

Only needed when `EMBEDDING_STORAGE_MODE=worker`. Not included in `pnpm dev`.

```bash
cd infra/docker && docker compose up -d postgres redis
pnpm --filter @second-memory/worker-embeddings dev
```

## Memory Service Database Setup

PostgreSQL persistence uses Prisma in `packages/server-db`.

```bash
cd infra/docker && docker compose up -d postgres
pnpm --filter @second-memory/server-db db:migrate
cd services/memory-service
cp .env.example .env   # if needed
pnpm dev
```

E2E tests require Postgres running and apply migrations automatically via `test/global-setup.ts`.

## Embedding Worker Setup (optional)

The embedding worker is a Python service for **async** BullMQ indexing (`EMBEDDING_STORAGE_MODE=worker`). It is **not** started by `pnpm dev`.

For local development, the recommended path is **inline mode** with OpenAI (`text-embedding-3-small`, 1536 dims) — see [Vector Search](#vector-search) below.

```bash
cd infra/docker && docker compose up -d postgres redis
pnpm --filter @second-memory/worker-embeddings dev
```

Or start it via Docker Compose:

```bash
cd infra/docker && docker compose up -d worker-embeddings
```

Note: the worker currently uses local `sentence-transformers/all-MiniLM-L6-v2` (384 dims), which does not match the 1536-dim pgvector schema. Use inline + OpenAI until the worker is updated.

## Vector Search

Internal memory search (`POST /internal/v1/memories/search`) embeds the query and ranks entries by cosine similarity using pgvector. By default, memory-service uses **inline mode** with OpenAI (`text-embedding-3-small`, 1536 dims). Set `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY`, and `EMBEDDING_MODEL` in memory-service `.env`. If the embedding service is down or entries are not yet embedded, search falls back to keyword matching.

### Embedding storage modes

Set `EMBEDDING_STORAGE_MODE` on memory-service to control how entry vectors are indexed:

| Mode | Value | Behavior |
|------|-------|----------|
| Inline (default) | `inline` | memory-service embeds via HTTP and writes to `entry_embeddings` synchronously on create. No Redis or queue consumer required. |
| Worker | `worker` | Async via outbox → BullMQ → `worker-embeddings`. Requires Redis and the Python worker. |

Use `inline` for local dev and deployments without Redis. Use `worker` only when you need async indexing and have updated the Python worker to produce 1536-dim vectors.

## Next Steps

1. Implement Milestone C: `POST /v1/ask/end` and client-sdk wiring.
2. Add shared ESLint and tsconfig presets in `packages/shared-config`.
