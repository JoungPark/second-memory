import { Injectable } from '@nestjs/common';
import type {
  CreateInternalMemoryRequest,
  CreateMemoryRequest,
  CreateMemoryResponse,
  ListMemoriesQuery,
  ListMemoriesResponse,
  RequestContext,
  SearchMemoriesRequest,
  SearchMemoriesResponse,
} from '@second-memory/shared-types';
import { MemoriesRepository } from './memories.repository';

@Injectable()
export class MemoriesService {
  constructor(private readonly repository: MemoriesRepository) {}

  createMemory(
    context: RequestContext,
    request: CreateMemoryRequest,
  ): CreateMemoryResponse {
    const response = this.repository.create(context, request);

    // TODO: persist to PostgreSQL and enqueue embedding jobs via outbox/BullMQ.
    return response;
  }

  createInternalMemory(
    context: RequestContext,
    request: CreateInternalMemoryRequest,
  ): CreateMemoryResponse {
    const response = this.repository.create(context, request);

    // TODO: persist to PostgreSQL and enqueue embedding jobs via outbox/BullMQ.
    return response;
  }

  listMemories(
    context: RequestContext,
    query: ListMemoriesQuery,
  ): ListMemoriesResponse {
    return this.repository.list(context, query);
  }

  searchMemories(
    context: RequestContext,
    request: SearchMemoriesRequest,
  ): SearchMemoriesResponse {
    return this.repository.search(context, request);
  }
}
