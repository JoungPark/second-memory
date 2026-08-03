# Metrics and Evaluation Plan

## Product KPIs

1. Capture activity: memories per active user per week.
2. Engagement continuity: users with entries in at least two different weeks.
3. Recall usage: ask-AI requests per active user.
4. Ask session completion: percentage of ask sessions ended with saved summary.

## AI Quality Metrics

1. Retrieval relevance at top-k.
2. Grounded answer rate.
3. Hallucination incident rate.
4. Citation coverage rate.

## System Metrics

1. Recall latency p50 and p95.
2. Error rate by endpoint.
3. Token cost per recall.
4. Token cost per END summary generation.

## Evaluation Cadence

1. Weekly sample review of recall responses.
2. Weekly threshold check for hallucination and relevance.
3. Monthly KPI trend review and backlog reprioritization.

## Initial Targets

1. Grounded answer rate >= 90% on sampled set.
2. Recall latency p95 < 4 seconds.
3. Hallucination incident rate < 3% on sampled set.
4. END summary save success rate >= 99%.
