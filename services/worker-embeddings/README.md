# worker-embeddings

Python BullMQ consumer that generates embeddings with sentence-transformers and stores vectors in PostgreSQL (pgvector). Also exposes a small internal HTTP server for memory-service query embedding.

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/)
- PostgreSQL with pgvector and Redis running (see `infra/docker`)

## Setup

```bash
cd services/worker-embeddings
cp .env.example .env
uv sync
```

The HuggingFace model (`sentence-transformers/all-MiniLM-L6-v2`) is downloaded on first embed.

## Run

```bash
uv run python -m worker_embeddings.main
```

Or from the monorepo root:

```bash
pnpm --filter @second-memory/worker-embeddings dev
```

This starts both the BullMQ worker and the embedding HTTP server (default port `8090`).

## Job contract

Keep in sync with `packages/shared-types/src/index.ts`:

- Queue: `embedding-jobs`
- Job name: `embed-entry`
- Payload: `{ entryId, tenantId, userId, content }`

## Embedding configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | HuggingFace model name |
| `EMBEDDING_HTTP_HOST` | `0.0.0.0` | HTTP server bind address |
| `EMBEDDING_HTTP_PORT` | `8090` | HTTP server port |

### memory-service wiring

Point memory-service at the worker HTTP server:

```env
EMBEDDING_BASE_URL=http://localhost:8090
```

When changing models, update the PostgreSQL `entry_embeddings.embedding` column to match the model output size and re-embed existing vectors.

## Internal HTTP API

`POST /embed`

Request:

```json
{ "text": "hello" }
```

Response:

```json
{ "embedding": [0.1, 0.2, "..."] }
```

Example:

```bash
curl -s http://localhost:8090/embed \
  -H 'Content-Type: application/json' \
  -d '{"text":"hello"}'
```
