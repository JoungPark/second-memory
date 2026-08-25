import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import type { EmbeddingStorageMode } from '../config/configuration';
import {
  EmbeddingService,
  EmbeddingUnavailableError,
} from '../embedding/embedding.service';
import { OutboxRelayService } from '../queue/outbox-relay.service';
import { MemoriesRepository } from './memories.repository';

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);
  private readonly storageMode: EmbeddingStorageMode;
  private readonly embeddingModel: string;

  constructor(
    private readonly repository: MemoriesRepository,
    private readonly outboxRelay: OutboxRelayService,
    private readonly embeddingService: EmbeddingService,
    private readonly configService: ConfigService,
  ) {
    this.storageMode = this.configService.get<EmbeddingStorageMode>(
      'embedding.storageMode',
      'worker',
    );
    this.embeddingModel = this.configService.get<string>(
      'embedding.model',
      'sentence-transformers/all-MiniLM-L6-v2',
    );
  }

  async createMemory(
    context: RequestContext,
    request: CreateMemoryRequest,
  ): Promise<CreateMemoryResponse> {
    return this.create(context, request);
  }

  async createInternalMemory(
    context: RequestContext,
    request: CreateInternalMemoryRequest,
  ): Promise<CreateMemoryResponse> {
    return this.create(context, request);
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
    const normalizedQuery = request.query.trim();

    if (!normalizedQuery) {
      return { results: [] };
    }

    let queryVector: number[] | undefined;

    try {
      queryVector = await this.embeddingService.embedText(normalizedQuery);
    } catch (error) {
      if (error instanceof EmbeddingUnavailableError) {
        this.logger.warn(
          JSON.stringify({
            event: 'memory_search_fallback',
            reason: 'embedding_unavailable',
            message: error.message,
            tenantId: context.tenantId,
            userId: context.userId,
          }),
        );
      } else {
        throw error;
      }
    }

    if (queryVector) {
      const vectorResults = await this.repository.searchByVector(
        context,
        request,
        queryVector,
      );

      if (vectorResults.length > 0) {
        return { results: vectorResults };
      }

      this.logger.warn(
        JSON.stringify({
          event: 'memory_search_fallback',
          reason: 'no_vector_results',
          tenantId: context.tenantId,
          userId: context.userId,
        }),
      );
    }

    return this.repository.searchByKeyword(context, request);
  }

  private async create(
    context: RequestContext,
    request: CreateMemoryRequest | CreateInternalMemoryRequest,
  ): Promise<CreateMemoryResponse> {
    console.log('create', this.storageMode);
    if (this.storageMode === 'inline') {
      return this.createInline(context, request);
    }

    const response = await this.repository.create(context, request);
    void this.outboxRelay.relayPendingEvents();
    return response;
  }

  private async createInline(
    context: RequestContext,
    request: CreateMemoryRequest | CreateInternalMemoryRequest,
  ): Promise<CreateMemoryResponse> {
    if (request.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(
        context,
        request.idempotencyKey,
      );
      if (existing) {
        return existing;
      }
    }

    let vector: number[];

    try {
      vector = await this.embeddingService.embedText(request.content);
    } catch (error) {
      if (error instanceof EmbeddingUnavailableError) {
        throw new ServiceUnavailableException(error.message);
      }

      throw error;
    }

    console.log('vector', vector);

    return this.repository.create(context, request, {
      vector,
      model: this.embeddingModel,
    });
  }
}
