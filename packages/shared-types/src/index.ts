export type MemoryId = string;

export type EntryType = 'note' | 'self_talk' | 'conversation_summary';

export interface MemoryRecord {
  id: MemoryId;
  userId: string;
  content: string;
  createdAt: string;
}

export interface CreateMemoryRequest {
  entryType: 'note' | 'self_talk';
  content: string;
  occurredAt?: string;
  tags?: string[];
  idempotencyKey?: string;
}

export interface CreateInternalMemoryRequest {
  entryType: 'conversation_summary';
  content: string;
  occurredAt?: string;
  sourceReferences?: string[];
  idempotencyKey?: string;
}

export interface CreateMemoryResponse {
  id: string;
  createdAt: string;
}

export interface ListMemoriesQuery {
  from?: string;
  to?: string;
  entryType?: EntryType;
  keyword?: string;
  cursor?: string;
  pageSize?: number;
}

export interface MemoryListItem {
  id: string;
  entryType: EntryType;
  content: string;
  occurredAt: string;
  createdAt: string;
  tags?: string[];
}

export interface ListMemoriesResponse {
  items: MemoryListItem[];
  nextCursor?: string;
}

export interface SearchMemoriesRequest {
  query: string;
  topK?: number;
  filters?: {
    from?: string;
    to?: string;
    entryType?: EntryType;
  };
}

export interface SearchMemoryResult {
  id: string;
  entryType: EntryType;
  content: string;
  occurredAt: string;
  score: number;
}

export interface SearchMemoriesResponse {
  results: SearchMemoryResult[];
}

export interface RequestContext {
  tenantId: string;
  userId: string;
}

export interface AskCitation {
  memoryId: string;
  entryType: EntryType;
  excerpt: string;
}

export interface AskMessageRequest {
  sessionId?: string;
  message: string;
  topK?: number;
  filters?: SearchMemoriesRequest['filters'];
}

export interface AskMessageResponse {
  sessionId: string;
  answer: string;
  citations: AskCitation[];
  confidence: number;
  lowConfidenceFlag: boolean;
}

export const EMBEDDING_QUEUE_NAME = 'embedding-jobs' as const;
export const EMBEDDING_JOB_NAME = 'embed-entry' as const;

export interface EmbeddingJobPayload {
  entryId: string;
  tenantId: string;
  userId: string;
  content: string;
}

export const EMBEDDING_DIMENSIONS = 384 as const;
