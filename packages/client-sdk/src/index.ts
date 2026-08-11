import type {
  CreateMemoryRequest,
  CreateMemoryResponse,
  ListMemoriesQuery,
  ListMemoriesResponse,
} from '@second-memory/shared-types';

export type GetIdToken = () => Promise<string | null>;

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
    const token = await this.getIdToken();

    if (!token) {
      throw new Error('Not authenticated. Sign in to obtain a Firebase ID token.');
    }

    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);

    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Memory API request failed (${response.status} ${response.statusText}): ${message}`,
      );
    }

    return response;
  }
}

export type { MemoryRecord } from '@second-memory/shared-types';

export interface ListMemoriesResponseLegacy {
  memories: import('@second-memory/shared-types').MemoryRecord[];
}
