import type {
  CreateMemoryRequest,
  CreateMemoryResponse,
  ListMemoriesQuery,
  ListMemoriesResponse,
} from '@second-memory/shared-types';

import { authenticatedRequest } from './request.js';
import type { GetIdToken } from './types.js';

export interface MemoryApiClientOptions {
  baseUrl: string;
  getIdToken: GetIdToken;
}

export class MemoryApiClient {
  private readonly baseUrl: string;
  private readonly getIdToken: GetIdToken;

  constructor(options: MemoryApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getIdToken = options.getIdToken;
  }

  async createMemory(body: CreateMemoryRequest): Promise<CreateMemoryResponse> {
    const response = await this.request('/v1/memories', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return response.json() as Promise<CreateMemoryResponse>;
  }

  async listMemories(query: ListMemoriesQuery = {}): Promise<ListMemoriesResponse> {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }

    const queryString = params.toString();
    const path = queryString ? `/v1/memories?${queryString}` : '/v1/memories';
    const response = await this.request(path, { method: 'GET' });

    return response.json() as Promise<ListMemoriesResponse>;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    return authenticatedRequest(
      this.baseUrl,
      this.getIdToken,
      path,
      init,
      'Memory API',
    );
  }
}
