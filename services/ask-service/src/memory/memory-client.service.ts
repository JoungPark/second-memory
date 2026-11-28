import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CreateInternalMemoryRequest,
  CreateMemoryResponse,
  RequestContext,
  SearchMemoriesRequest,
  SearchMemoriesResponse,
} from '@second-memory/shared-types';
import { InternalApiClient, REQUEST_CONTEXT_HEADERS } from '@second-memory/nest-auth';

@Injectable()
export class MemoryClientService {
  private readonly baseUrl: string;
  private readonly timeoutMs?: number;

  constructor(
    config: ConfigService,
    private readonly internalApi: InternalApiClient,
  ) {
    this.baseUrl = config.get<string>('memoryServiceUrl', 'http://localhost:3001').replace(/\/$/, '');
    this.timeoutMs = config.get<boolean>('lambdaWeb') ? 25_000 : undefined;
  }

  searchMemories(context: RequestContext, request: SearchMemoriesRequest): Promise<SearchMemoriesResponse> {
    return this.post('/internal/v1/memories/search', request, context);
  }

  createInternalMemory(context: RequestContext, request: CreateInternalMemoryRequest): Promise<CreateMemoryResponse> {
    return this.post('/internal/v1/memories', request, context);
  }

  private async post<T>(path: string, request: object, context: RequestContext): Promise<T> {
    try {
      return await this.internalApi.post(this.baseUrl + path, request, this.timeoutMs, {
        [REQUEST_CONTEXT_HEADERS.tenantId]: context.tenantId,
        [REQUEST_CONTEXT_HEADERS.userId]: context.userId,
      });
    } catch {
      throw new ServiceUnavailableException('Memory service unavailable');
    }
  }
}
