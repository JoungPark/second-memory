# Memory Service

NestJS service for storing, listing, and searching user memories.

## Run locally

```bash
# from repo root
pnpm install
pnpm --filter @second-memory/server-db db:generate
pnpm --filter @second-memory/memory-service dev
```

Default port: `3001`

## Swagger UI

Interactive API docs are available at [http://localhost:3001/docs](http://localhost:3001/docs).

- Use the **Authorize** button to set a Firebase Bearer token for `/v1/*` routes.
- Internal routes under `/internal/v1/*` require `x-tenant-id` and `x-user-id` headers.

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
