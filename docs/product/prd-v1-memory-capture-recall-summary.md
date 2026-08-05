# PRD V1: Memory Capture and Recall

- Product: Second Memory
- Date: 2026-07-28
- Status: Draft

## Objectives

1. Reduce friction for capturing note and self-talk entries.
2. Provide trustworthy AI recall grounded in user memories.
3. Preserve continuity with compact conversation summaries instead of full ask-turn storage.

## Personas

1. Solo Reflector
- Records emotions and events daily.
- Wants weekly and monthly understanding of trends.

2. Busy Professional
- Captures quick notes in context.
- Wants fast recall of what happened recently.

## Supported Platforms

1. V1 supports both web and mobile clients.
2. Core journeys (capture and recall) are required on both platforms.
3. Minor UX differences are acceptable if they preserve the same outcome.

## Service Architecture (V1)

1. Memory Service owns durable memory storage and retrieval primitives.
2. Ask Service owns ask/chat orchestration with temporary session context.
3. Ask Service persists END summaries by calling Memory Service APIs.
4. Full ask turn-by-turn transcripts are not persisted in V1.

## User Journeys

1. Capture Journey
- User opens default mode and writes a note or self-talk entry.
- System stores the entry with timestamp and optional tags.

2. Recall Journey
- User asks a natural-language question.
- System retrieves top-k relevant entries and returns a grounded answer.

3. Ask Session Wrap-up Journey
- User taps END in ask mode.
- Ask Service summarizes the ask session, then Memory Service stores it as conversation_summary.

4. History Journey
- User views a mixed history of notes and conversation summaries.
- System returns the most recent N items (default N=10).

## Functional Requirements

1. Memory Capture
- User can create an entry with required content and type: note or self_talk.
- System stores timestamp and optional tags.

2. Timeline and Filtering
- User can list notes and conversation summaries in one time-ordered history.
- Default history window returns recent 10 items.
- User can filter by date range, entry type, and keyword.

3. AI Recall
- User asks memory question in natural language.
- System retrieves relevant notes and conversation summaries and generates grounded answer.
- Response includes references (entry id or timestamp) when available.
- System can use prior details from earlier captures and summaries to answer follow-up questions.

4. Ask Session Summary
- System stores only summary-level output when ask mode ends.
- Stored fields are summary_text and references.
- System does not persist full ask-turn transcripts in V1.
- Ask Service must call Memory Service for durable summary persistence.

5. Conversation Summary Storage
- Conversation summaries are tenant-scoped and user-scoped.
- Notes and conversation summaries are shown at the same level in history.
- Conversation summaries are stored in the same entry model using entry_type=conversation_summary.

## Out of Scope for V1

1. Multimedia capture/retrieval is out of scope for V1 (for example, images, audio, and video).

## Non-Functional Requirements

1. Security and Privacy
- Enforce tenant and user scoping in all read/write paths.
- Validate Firebase ID tokens on all public API requests before service access.
- Resolve Firebase uid to internal USER.id and tenant context for authorization checks.

2. Latency
- Recall endpoint target: p95 under 4 seconds.

3. Reliability
- No cross-tenant memory leakage.
- END summary persistence supports idempotent retries across Ask Service to Memory Service calls.

4. Cost Control
- Monitor token usage per recall and per END summary generation.

## Dependencies

1. Firebase Authentication integration (ID token verification + USER.firebase_uid mapping).
2. PostgreSQL and pgvector.
3. Worker queue for embedding generation.
4. LLM provider integration.

## Release Readiness

1. All Must stories accepted.
2. Retrieval quality baseline reached.
3. Ask mode END reliably stores summary_text and references.
4. Observability dashboards for latency, errors, and AI cost are available.
