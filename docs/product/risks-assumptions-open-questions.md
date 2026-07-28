# Risks, Assumptions, and Open Questions

## Risks

1. AI may produce plausible but incorrect memory statements.
2. Sensitive personal data requires strict protection and retention controls.
3. Retrieval quality may degrade as data size grows.
4. Inference cost may rise with frequent summary generation.

## Assumptions

1. Text-first capture is sufficient for V1.
2. PostgreSQL plus pgvector can support initial scale and quality goals.
3. Solo development benefits from operational simplicity over early optimization.

## Open Questions

1. What confidence threshold should trigger clarification instead of direct answer?
2. How much citation detail should be shown by default?
3. Should sentiment trend summaries be V1 or V1.1?
4. What data retention controls should users configure?

## Decision Log Template

Use this template for key product decisions:

1. Question
2. Decision
3. Date
4. Rationale
5. Impacted documents
