# User Stories V1

## US-001 Capture Memory

As a user, I want to save a feeling, thought, event, or memo quickly so I do not lose the moment.

Acceptance Criteria:

1. User can create memory with required content and memory type.
2. Newly created entry appears in timeline.
3. Empty content is rejected with clear validation error.
4. The flow is available on both web and mobile clients.

## US-002 Browse Timeline

As a user, I want to browse memories by time so I can review my past.

Acceptance Criteria:

1. User can view memories sorted newest first.
2. User can filter by date range and memory type.
3. Pagination or infinite scroll does not duplicate entries.
4. The flow is available on both web and mobile clients.

## US-003 Ask AI for Recall

As a user, I want to ask a question about my past so I can retrieve relevant memories.

Acceptance Criteria:

1. System returns an answer grounded in retrieved entries.
2. Response includes references to source memories when available.
3. System signals low confidence and suggests clarification when retrieval confidence is low.
4. The flow is available on both web and mobile clients.

## US-004 Generate Summary

As a user, I want period summaries so I can reflect on patterns.

Acceptance Criteria:

1. User can request day/week/month/topic summaries.
2. Summary includes highlights and themes.
3. Summary includes references to source memories when available.
4. The flow is available on both web and mobile clients.

## US-005 Privacy Boundary

As a user, I want my memories isolated so my data remains private.

Acceptance Criteria:

1. User can only access tenant-scoped and user-scoped data.
2. Cross-tenant access attempts are denied.
3. Denied access events are audit logged.
4. The same authorization boundaries apply on both web and mobile clients.
