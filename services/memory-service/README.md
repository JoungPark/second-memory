# Memory Service

NestJS service for storing, listing, and searching user memories.

## Run locally

Copy `.env.example` to `.env` and configure PostgreSQL. Start User Service on port `3003` for authenticated capture and listing. Set `USER_SERVICE_URL` when using a different trusted endpoint.

```bash
# from repo root
pnpm install
pnpm build:packages
pnpm --filter @second-memory/memory-service db:migrate
pnpm --filter @second-memory/memory-service dev
```

Memory listens on port `3001` by default.

## Deploy to AWS

See the [CDK deployment README](../../infra/aws/README.md) for configuration, packaging, and deployment on Lambda Web Functions.

## E2E tests

Set `MEMORY_E2E_DATABASE_URL` to a disposable PostgreSQL database with pgvector
available. The suite applies migrations and deletes its database contents.
Run `pnpm --filter @second-memory/memory-service test:e2e` from the repository root.

## Swagger UI

Swagger UI is available at `/docs` in the local and public Lambda Web profiles. Fetch `/docs-json` for the OpenAPI document. [Local Swagger UI](http://localhost:3001/docs)

- Use **Authorize** with a Firebase ID token to call `/v1/memories`.
- The public Lambda Web docs cover `/health` and `/v1/memories`. The standalone development profile also exposes the internal routes for trusted callers using `x-tenant-id` and `x-user-id` headers.
- The [Phase 2 plan](../../docs/architecture/aws-migration-plan.md#2-deploy-and-verify-lambda-ask) calls for a separate private OpenAPI document for the IAM-authenticated AWS internal routes.

## API

### `POST /v1/memories`

Create a memory (requires Firebase auth).

### `GET /v1/memories`

List memories with optional filters (requires Firebase auth).

### `POST /internal/v1/memories`

Create an internal memory (requires `x-tenant-id` and `x-user-id` headers).

### `POST /internal/v1/memories/search`

Search memories by vector similarity (requires `x-tenant-id` and `x-user-id` headers).

### `GET /health`

Returns service and database health.
