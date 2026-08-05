# User Stories V1

## US-001 Capture Memory

As a user, I want to save a note or self-talk quickly so I do not lose the moment.

Acceptance Criteria:

1. User can create an entry with required content and type: note or self_talk.
2. Newly created entry appears in timeline.
3. Empty content is rejected with clear validation error.
4. The flow is available on both web and mobile clients.

## US-002 Browse Timeline

As a user, I want to browse memories by time so I can review my past.

Acceptance Criteria:

1. User can view memories sorted newest first.
2. History shows notes and conversation summaries in a single mixed list.
3. Default history list shows recent 10 items.
4. User can filter by date range and entry type.
5. Pagination or infinite scroll does not duplicate entries.
6. The flow is available on both web and mobile clients.

## US-003 Ask AI for Recall

As a user, I want to ask a question about my past so I can retrieve relevant memories.

Acceptance Criteria:

1. System returns an answer grounded in retrieved entries.
2. Response includes references to source memories when available.
3. System signals low confidence and suggests clarification when retrieval confidence is low.
4. During ask mode, the system does not persist full turn-by-turn transcripts.
5. When user taps END, system stores only summary_text and references.
6. The flow is available on both web and mobile clients.
7. Ask/chat flow keeps conversation context temporarily and clears it on END or timeout.
8. END summary persistence is retried safely without duplicate summary records.

## US-004 Privacy Boundary

As a user, I want my memories isolated so my data remains private.

Acceptance Criteria:

1. User can only access tenant-scoped and user-scoped data.
2. Cross-tenant access attempts are denied.
3. Denied access events are audit logged.
4. The same authorization boundaries apply on both web and mobile clients.
5. Public APIs accept only valid Firebase ID tokens.
6. Firebase uid is mapped to internal USER.id and tenant scope before authorization checks.
