# worker-embeddings

Optional Python BullMQ consumer for **async** embedding indexing. Also exposes a small internal HTTP server for memory-service query embedding.

**Not started by `pnpm dev`.** For local development, use memory-service **inline mode** with OpenAI (`text-embedding-3-small`, 1536 dims) instead.

> **Note:** This worker currently uses local `sentence-transformers/all-MiniLM-L6-v2` (384 dims). The database schema expects **1536-dim** vectors. Do not use worker mode until the worker is updated for OpenAI-compatible 1536-dim output.

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

Or via Docker Compose:

```bash
cd infra/docker && docker compose up -d worker-embeddings
```

This starts both the BullMQ worker and the embedding HTTP server (default port `8090`).

## When to use

| Scenario | Use worker? |
|----------|-------------|
| Local dev with OpenAI 1536-dim embeddings | No — set `EMBEDDING_STORAGE_MODE=inline` on memory-service |
| Async indexing at scale (decouple write latency) | Yes — after updating worker for 1536-dim OpenAI output |
| Deploy without Redis | No — use inline mode |

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

### memory-service wiring (worker mode only)

```env
EMBEDDING_STORAGE_MODE=worker
EMBEDDING_BASE_URL=http://localhost:8090/v1
```

When changing models, update the PostgreSQL `entry_embeddings.embedding` column to match the model output size and re-embed existing vectors.

## HTTP API

### OpenAI-compatible embeddings

`POST /v1/embeddings`

Request:

```json
{
  "input": "hello",
  "model": "sentence-transformers/all-MiniLM-L6-v2"
}
```

Batch input is supported via `"input": ["hello", "world"]`.

Response:

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.1, 0.2, "..."]
    }
  ],
  "model": "sentence-transformers/all-MiniLM-L6-v2",
  "usage": {
    "prompt_tokens": 1,
    "total_tokens": 1
  }
}
```

Example:

```bash
curl -s http://localhost:8090/v1/embeddings \
  -H 'Content-Type: application/json' \
  -d '{"input":"hello","model":"sentence-transformers/all-MiniLM-L6-v2"}'
```

### Legacy internal API

`POST /embed` (legacy shim)

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
