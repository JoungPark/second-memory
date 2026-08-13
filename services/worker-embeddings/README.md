# worker-embeddings

Python BullMQ consumer that generates local embeddings with sentence-transformers and stores vectors in PostgreSQL (pgvector).

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

The first run downloads the embedding model (~80MB for `all-MiniLM-L6-v2`).

## Run

```bash
uv run python -m worker_embeddings.main
```

Or from the monorepo root:

```bash
pnpm --filter @second-memory/worker-embeddings dev
```

## Job contract

Keep in sync with `packages/shared-types/src/index.ts`:

- Queue: `embedding-jobs`
- Job name: `embed-entry`
- Payload: `{ entryId, tenantId, userId, content }`

## Embedding model

Default: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions).

Override with `EMBEDDING_MODEL`. The model output dimension must match `EMBEDDING_DIMENSIONS` in shared-types and the `entry_embeddings.embedding` column in PostgreSQL.
