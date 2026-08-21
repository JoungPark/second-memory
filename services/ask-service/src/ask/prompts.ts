import type { SearchMemoryResult } from '@second-memory/shared-types';

const EXCERPT_MAX_LENGTH = 200;

export function buildSystemPrompt(options: {
  memories: SearchMemoryResult[];
  lowConfidence: boolean;
}): string {
  const groundingBlock = formatGroundingBlock(options.memories);
  const lowConfidenceGuidance = options.lowConfidence
    ? 'Retrieval confidence is low. Acknowledge uncertainty, ask a clarifying question when helpful, and avoid inventing details.'
    : 'Answer directly when the retrieved memories provide enough evidence.';

  return [
    'You are a personal memory assistant for Second Memory.',
    'Answer using retrieved memories and information provided by the user in the current conversation.',
    'If the memories do not contain enough evidence, ask a clarifying question.',
    'Never fabricate dates, events, or details that are not supported by the memories.',
    lowConfidenceGuidance,
    '',
    groundingBlock,
  ].join('\n');
}

export function formatGroundingBlock(memories: SearchMemoryResult[]): string {
  if (memories.length === 0) {
    return 'Retrieved memories:\n- None matched the query.';
  }

  const lines = memories.map((memory) => {
    const date = memory.occurredAt.slice(0, 10);
    return `- [id=${memory.id}] (${memory.entryType}, ${date}): "${truncateExcerpt(memory.content)}"`;
  });

  return ['Retrieved memories:', ...lines].join('\n');
}

export function truncateExcerpt(content: string, maxLength = EXCERPT_MAX_LENGTH): string {
  const normalized = content.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}
