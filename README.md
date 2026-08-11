# second-memory

Your second memory - capture today, remember forever.

## Monorepo Draft (V1)

This repository is scaffolded as a pnpm + Turborepo monorepo aligned with the V1 architecture docs.

## Repository Layout

```text
apps/
	web/                 # Placeholder for Next.js app
	mobile/              # Placeholder for Expo app

services/
	memory-service/      # Placeholder for NestJS memory APIs
	ask-service/         # Placeholder for retrieval orchestration service
	worker-embeddings/   # Placeholder for BullMQ embedding worker

packages/
	shared-types/        # Shared contracts and DTOs
	shared-config/       # Shared lint/ts/build presets
	ui/                  # Shared UI package placeholder
	client-sdk/          # Typed client helpers

infra/
	docker/
		docker-compose.yml # Redis + PostgreSQL for local MVP
```

## Tooling

- Workspace manager: pnpm workspaces
- Task runner: Turborepo
- Language baseline: TypeScript

## Root Scripts

- `pnpm dev` runs `turbo run dev --parallel`
- `pnpm build` runs `turbo run build`
- `pnpm lint` runs `turbo run lint`
- `pnpm test` runs `turbo run test`

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

## Next Steps

1. Scaffold `apps/web` with Next.js and `apps/mobile` with Expo.
2. Scaffold `services/*` with NestJS and BullMQ worker runtime.
3. Add shared ESLint and tsconfig presets in `packages/shared-config`.
4. Replace placeholder scripts with real build/lint/test/dev tasks.
