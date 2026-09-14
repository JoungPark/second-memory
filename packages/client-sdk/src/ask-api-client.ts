import type {
  AskCloseRequest,
  AskEndRequest,
  AskEndResponse,
  AskMessageRequest,
  AskMessageResponse,
} from '@second-memory/shared-types';

import { authenticatedRequest } from './request.js';
import type { GetIdToken } from './types.js';

export interface AskApiClientOptions {
  baseUrl: string;
  getIdToken: GetIdToken;
}

export class AskApiClient {
  private readonly baseUrl: string;
  private readonly getIdToken: GetIdToken;

  constructor(options: AskApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getIdToken = options.getIdToken;
  }

  async sendMessage(body: AskMessageRequest): Promise<AskMessageResponse> {
    const response = await this.request('/v1/ask/messages', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return response.json() as Promise<AskMessageResponse>;
  }

  async endSession(body: AskEndRequest): Promise<AskEndResponse> {
    const response = await this.request('/v1/ask/end', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return response.json() as Promise<AskEndResponse>;
  }

  async closeSession(body: AskCloseRequest): Promise<void> {
    await this.request('/v1/ask/close', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    return authenticatedRequest(
      this.baseUrl,
      this.getIdToken,
      path,
      init,
      'Ask API',
    );
  }
}
