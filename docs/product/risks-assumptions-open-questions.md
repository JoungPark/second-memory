# Risks, Assumptions, and Open Questions

## Risks

1. AI may produce plausible but incorrect memory statements.
2. Sensitive personal data requires strict protection and retention controls.
3. Retrieval quality may degrade as data size grows.
4. Inference cost may rise from summary generation at ask-session END.
5. Ask-to-Memory dependency can cause summary write failures during transient outages.
6. Temporary ask-session state may be lost on Ask Service restarts.

## Assumptions

1. Text-first capture is sufficient for V1.
2. PostgreSQL plus pgvector can support initial scale and quality goals.
3. Solo development benefits from operational simplicity over early optimization.
4. V1 uses in-memory ask-session state with TTL and explicit cleanup on END.
5. Conversation summaries are persisted as entry_type=conversation_summary in the main entry model.

## Open Questions

1. What confidence threshold should trigger clarification instead of direct answer?
2. How much citation detail should be shown by default?
3. Should sentiment trend summaries be V1.1 or later?
4. Should users be able to manually edit or regenerate saved conversation summaries?
5. Do we need a DLQ-backed recovery job for failed END summary persistence in V1 or V1.1?

## Decision Log Template

Use this template for key product decisions:

1. Question
2. Decision
3. Date
4. Rationale
5. Impacted documents
