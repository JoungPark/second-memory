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

  async createMemory(
    context: RequestContext,
    request: CreateMemoryRequest,
  ): Promise<CreateMemoryResponse> {
    const response = await this.repository.create(context, request);

    // TODO: enqueue embedding jobs via outbox/BullMQ.
    return response;
  }

  async createInternalMemory(
    context: RequestContext,
    request: CreateInternalMemoryRequest,
  ): Promise<CreateMemoryResponse> {
    const response = await this.repository.create(context, request);

    // TODO: enqueue embedding jobs via outbox/BullMQ.
    return response;
  }

  async listMemories(
    context: RequestContext,
    query: ListMemoriesQuery,
  ): Promise<ListMemoriesResponse> {
    return this.repository.list(context, query);
  }

  async searchMemories(
    context: RequestContext,
    request: SearchMemoriesRequest,
  ): Promise<SearchMemoriesResponse> {
    return this.repository.search(context, request);
  }
}
