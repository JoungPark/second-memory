# AGENTS.md

## Rules

- Evaluate the user's proposal independently. Point out any concrete problems and explain relevant alternatives when they exist.
- Prefer small, focused files with a single responsibility. Split a file when it contains code that changes for different reasons.

## Repository map

Second Memory is a pnpm workspace managed by Turborepo. Run workspace commands from the repository root and use the pnpm version pinned in `package.json`.

- `apps/web` is the Next.js client. `apps/mobile` is the Expo client. Both implement the capture and ask flows.
- `services/memory-service` owns memory capture, retrieval, and embedding storage. `services/ask-service` orchestrates chat and calls memory-service for retrieval.
- `services/worker-embeddings` is the optional Python BullMQ worker. It uses `uv` and runs separately from `pnpm dev`.
- `packages/shared-types` holds shared contracts, `packages/client-sdk` holds API clients, and `packages/ui` holds shared hooks and components. `packages/nest-auth` holds Firebase auth and request context, and `packages/server-db` owns the Prisma schema and migrations.
- `infra/docker` holds local PostgreSQL and Redis configuration. See the root README and workspace READMEs for setup and environment variables.

## Development and verification

- Run `pnpm install` to install dependencies and `pnpm dev` to start the TypeScript apps and services. Use `pnpm --filter @second-memory/<workspace> dev` to start an individual workspace that exposes a `dev` script.
- Run `pnpm check` for lint and unit tests, `pnpm build` for workspace builds, and `pnpm format:check` to verify formatting. For scoped checks, use `pnpm --filter @second-memory/<workspace> lint` or `test` where the workspace defines that script.
- Run `pnpm build:packages` when consumers need updated shared package output. If the Prisma client needs regeneration, run `pnpm --filter @second-memory/server-db db:generate`. Edit source files and the Prisma schema directly. Treat `node_modules` and generated build output as disposable.
- Start local PostgreSQL with `docker compose -f infra/docker/docker-compose.yml up -d postgres`. Use `pnpm --filter @second-memory/server-db db:migrate` for local schema changes. Memory-service E2E tests use PostgreSQL and apply migrations during setup. Run them with `pnpm --filter @second-memory/memory-service test:e2e`.

## Cross-workspace changes

- For API contract changes, check the service DTOs, shared types, client SDK, and both clients for affected consumers.
- Keep Prisma schema changes and their migrations under `packages/server-db/prisma`. Check embedding dimensions across the database and embedding producers when changing models. The current schema expects 1536 dimensions and the optional local worker produces 384.
- Use workspace `.env.example` files to document configuration and keep local credentials out of Git.
- Each service owns its database. Keep cross-service access behind the service API.
- Put shared API contracts in `packages/shared-types`.
