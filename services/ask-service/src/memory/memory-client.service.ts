import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  RequestContext,
  SearchMemoriesRequest,
  SearchMemoriesResponse,
} from '@second-memory/shared-types';
import { REQUEST_CONTEXT_HEADERS } from '@second-memory/nest-auth';

@Injectable()
export class MemoryClientService {
  private readonly memoryServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.memoryServiceUrl = this.configService
      .get<string>('memoryServiceUrl', 'http://localhost:3001')
      .replace(/\/$/, '');
  }

  async searchMemories(
    context: RequestContext,
    request: SearchMemoriesRequest,
  ): Promise<SearchMemoriesResponse> {
    const response = await fetch(`${this.memoryServiceUrl}/internal/v1/memories/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [REQUEST_CONTEXT_HEADERS.tenantId]: context.tenantId,
        [REQUEST_CONTEXT_HEADERS.userId]: context.userId,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new ServiceUnavailableException(
        `Memory service search failed (${response.status}): ${message}`,
      );
    }

    return response.json() as Promise<SearchMemoriesResponse>;
  }
}
