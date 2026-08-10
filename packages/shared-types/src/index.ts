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
