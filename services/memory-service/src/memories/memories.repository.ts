import { Injectable } from '@nestjs/common';
import type {
  CreateInternalMemoryRequest,
  CreateMemoryRequest,
  CreateMemoryResponse,
  EntryType,
  ListMemoriesQuery,
  ListMemoriesResponse,
  RequestContext,
  SearchMemoriesRequest,
  SearchMemoriesResponse,
} from '@second-memory/shared-types';
import { randomUUID } from 'node:crypto';

export interface StoredMemory {
  id: string;
  tenantId: string;
  userId: string;
  entryType: EntryType;
  content: string;
  occurredAt: string;
  createdAt: string;
  tags: string[];
  sourceReferences: string[];
  idempotencyKey?: string;
}

/**
 * In-memory store for local development until PostgreSQL integration lands.
 */
@Injectable()
export class MemoriesRepository {
  private readonly memories = new Map<string, StoredMemory>();
  private readonly idempotencyIndex = new Map<string, string>();

  create(
    context: RequestContext,
    request: CreateMemoryRequest | CreateInternalMemoryRequest,
  ): CreateMemoryResponse {
    if (request.idempotencyKey) {
      const existingId = this.findByIdempotencyKey(context, request.idempotencyKey);
      if (existingId) {
        return this.toCreateResponse(existingId);
      }
    }

    const now = new Date().toISOString();
    const memory: StoredMemory = {
      id: randomUUID(),
      tenantId: context.tenantId,
      userId: context.userId,
      entryType: request.entryType,
      content: request.content,
      occurredAt: request.occurredAt ?? now,
      createdAt: now,
      tags: 'tags' in request ? (request.tags ?? []) : [],
      sourceReferences:
        'sourceReferences' in request ? (request.sourceReferences ?? []) : [],
      idempotencyKey: request.idempotencyKey,
    };

    this.memories.set(memory.id, memory);

    if (memory.idempotencyKey) {
      this.idempotencyIndex.set(
        this.idempotencyKey(context, memory.idempotencyKey),
        memory.id,
      );
    }

    return {
      id: memory.id,
      createdAt: memory.createdAt,
    };
  }

  list(context: RequestContext, query: ListMemoriesQuery): ListMemoriesResponse {
    const pageSize = Math.min(Math.max(query.pageSize ?? 10, 1), 100);
    const filtered = [...this.memories.values()]
      .filter((memory) => this.matchesScope(context, memory))
      .filter((memory) => this.matchesFilters(memory, query))
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

    const startIndex = query.cursor ? filtered.findIndex((item) => item.id === query.cursor) + 1 : 0;
    const sliceStart = Math.max(startIndex, 0);
    const page = filtered.slice(sliceStart, sliceStart + pageSize);
    const nextCursor =
      sliceStart + pageSize < filtered.length ? page[page.length - 1]?.id : undefined;

    return {
      items: page.map((memory) => ({
        id: memory.id,
        entryType: memory.entryType,
        content: memory.content,
        occurredAt: memory.occurredAt,
        createdAt: memory.createdAt,
        tags: memory.tags.length > 0 ? memory.tags : undefined,
      })),
      nextCursor,
    };
  }

  search(context: RequestContext, request: SearchMemoriesRequest): SearchMemoriesResponse {
    const topK = Math.min(Math.max(request.topK ?? 5, 1), 50);
    const normalizedQuery = request.query.trim().toLowerCase();

    const results = [...this.memories.values()]
      .filter((memory) => this.matchesScope(context, memory))
      .filter((memory) => this.matchesSearchFilters(memory, request))
      .map((memory) => ({
        id: memory.id,
        entryType: memory.entryType,
        content: memory.content,
        occurredAt: memory.occurredAt,
        score: this.scoreMemory(memory.content, normalizedQuery),
      }))
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);

    return { results };
  }

  private findByIdempotencyKey(context: RequestContext, idempotencyKey: string): string | undefined {
    return this.idempotencyIndex.get(this.idempotencyKey(context, idempotencyKey));
  }

  private toCreateResponse(id: string): CreateMemoryResponse {
    const memory = this.memories.get(id);

    if (!memory) {
      throw new Error(`Missing memory for idempotency key resolution: ${id}`);
    }

    return {
      id: memory.id,
      createdAt: memory.createdAt,
    };
  }

  private idempotencyKey(context: RequestContext, key: string): string {
    return `${context.tenantId}:${context.userId}:${key}`;
  }

  private matchesScope(context: RequestContext, memory: StoredMemory): boolean {
    return memory.tenantId === context.tenantId && memory.userId === context.userId;
  }

  private matchesFilters(memory: StoredMemory, query: ListMemoriesQuery): boolean {
    if (query.entryType && memory.entryType !== query.entryType) {
      return false;
    }

    if (query.from && memory.occurredAt < query.from) {
      return false;
    }

    if (query.to && memory.occurredAt > query.to) {
      return false;
    }

    if (query.keyword && !memory.content.toLowerCase().includes(query.keyword.toLowerCase())) {
      return false;
    }

    return true;
  }

  private matchesSearchFilters(
    memory: StoredMemory,
    request: SearchMemoriesRequest,
  ): boolean {
    const filters = request.filters;

    if (!filters) {
      return true;
    }

    if (filters.entryType && memory.entryType !== filters.entryType) {
      return false;
    }

    if (filters.from && memory.occurredAt < filters.from) {
      return false;
    }

    if (filters.to && memory.occurredAt > filters.to) {
      return false;
    }

    return true;
  }

  private scoreMemory(content: string, query: string): number {
    const normalizedContent = content.toLowerCase();

    if (normalizedContent === query) {
      return 1;
    }

    if (normalizedContent.includes(query)) {
      return query.length / normalizedContent.length;
    }

    return 0;
  }
}
