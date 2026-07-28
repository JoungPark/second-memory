# PRD V1: Memory Capture, Recall, and Summary

- Product: Second Memory
- Date: 2026-07-28
- Status: Draft

## Objectives

1. Reduce friction for capturing feelings, thoughts, events, and memos.
2. Provide trustworthy AI recall grounded in user memories.
3. Generate concise summaries that help reflection and pattern recognition.

## Personas

1. Solo Reflector
- Records emotions and events daily.
- Wants weekly and monthly understanding of trends.

2. Busy Professional
- Captures quick notes in context.
- Wants fast recall of what happened recently.

## Supported Platforms

1. V1 supports both web and mobile clients.
2. Core journeys (capture, recall, summary) are required on both platforms.
3. Minor UX differences are acceptable if they preserve the same outcome.

## User Journeys

1. Capture Journey
- User writes a memory with optional tags.
- System stores memory and schedules embedding generation.

2. Recall Journey
- User asks a natural-language question.
- System retrieves top-k relevant memories and returns grounded answer.

3. Summary Journey
- User requests summary for day/week/month/topic.
- System returns concise summary with highlights and references when possible.

## Functional Requirements

1. Memory Capture
- User can create a memory with required content and memory type.
- System stores timestamp and optional tags.

2. Timeline and Filtering
- User can list memories by date range, memory type, and keyword.

3. AI Recall
- User asks memory question in natural language.
- System retrieves relevant memories and generates grounded answer.
- Response includes references (memory id or timestamp) when available.

4. AI Summary
- User can request day/week/month/topic summary.
- System returns summary and key highlights.

## Out of Scope for V1

1. Multimedia capture/retrieval is out of scope for V1 (for example, images, audio, and video).

## Non-Functional Requirements

1. Security and Privacy
- Enforce tenant and user scoping in all read/write paths.

2. Latency
- Recall endpoint target: p95 under 4 seconds.
- Summary endpoint target: p95 under 8 seconds.

3. Reliability
- No cross-tenant memory leakage.

4. Cost Control
- Monitor token usage per request and per summary.

## Dependencies

1. Authentication and authorization setup.
2. PostgreSQL and pgvector.
3. Worker queue for embedding generation.
4. LLM provider integration.

## Release Readiness

1. All Must stories accepted.
2. Retrieval quality baseline reached.
3. Observability dashboards for latency, errors, and AI cost are available.
