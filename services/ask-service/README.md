# Ask Service

NestJS RAG/chat orchestration service for Second Memory (Milestone B).

## Responsibilities

- Authenticate users via Firebase ID tokens
- Maintain in-memory ask sessions with TTL
- Retrieve memories from Memory Service for grounding
- Call an OpenAI-compatible LLM to compose answers with citations

## Prerequisites

- PostgreSQL (same database as memory-service for user lookup)
- Memory Service running on port `3001`
- Firebase project configured
- OpenAI-compatible LLM endpoint (OpenAI, Groq, Ollama, etc.)

## Environment

Copy `.env.example` to `.env` and adjust values as needed.

Both `memory-service` and `ask-service` share `DATABASE_URL` via `@second-memory/server-db` (Firebase uid mapping lives in the shared `users` table).

## Run locally

```bash
# from repo root
pnpm install
pnpm --filter @second-memory/server-db db:generate
pnpm --filter @second-memory/ask-service dev
```

Default port: `3002`

## API

### `POST /v1/ask/messages`

Request:

```json
{
  "sessionId": "optional-existing-session-id",
  "message": "What did I write about travel?",
  "topK": 5,
  "filters": {
    "entryType": "note"
  }
}
```

Response:

```json
{
  "sessionId": "generated-or-existing-session-id",
  "answer": "Grounded answer with [id=memory-id] citations",
  "citations": [
    {
      "memoryId": "memory-id",
      "entryType": "note",
      "excerpt": "Short excerpt..."
    }
  ],
  "confidence": 0.8,
  "lowConfidenceFlag": false
}
```

### `GET /health`

Returns service and database health.

## LLM providers

The service uses a thin OpenAI-compatible client. Examples:

```bash
# OpenAI cloud
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Groq
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=gsk_...
OPENAI_MODEL=llama-3.3-70b-versatile

# Local Ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=llama3.2
```

## Smoke test

```bash
curl -X POST http://localhost:3002/v1/ask/messages \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What did I write about travel?"}'
```

## Notes

- Ask sessions are stored in memory only and are lost on service restart.
- Milestone B does not include `POST /v1/ask/end` or client SDK wiring.
- Memory search uses vector similarity via memory-service (keyword fallback when embeddings are unavailable or not yet indexed).
