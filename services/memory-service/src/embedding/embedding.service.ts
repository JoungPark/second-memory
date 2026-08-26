import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EmbeddingObject {
  embedding?: number[];
}

interface OpenAiEmbeddingResponse {
  data?: EmbeddingObject[];
  error?: {
    message?: string;
  };
  detail?: string;
}

export class EmbeddingUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbeddingUnavailableError';
  }
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService
      .get<string>('embedding.baseUrl', 'https://api.openai.com/v1')
      .replace(/\/$/, '');
    this.apiKey = this.configService.get<string>('embedding.apiKey', '');
    this.model = this.configService.get<string>(
      'embedding.model',
      'text-embedding-3-small',
    );
  }

  async embedText(text: string): Promise<number[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          input: text,
          model: this.model,
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new EmbeddingUnavailableError(
        `Could not reach embedding service at ${this.baseUrl}: ${message}`,
      );
    }

    let payload: OpenAiEmbeddingResponse;

    try {
      payload = (await response.json()) as OpenAiEmbeddingResponse;
    } catch {
      throw new EmbeddingUnavailableError(
        `Embedding service returned non-JSON response (${response.status})`,
      );
    }

    if (!response.ok) {
      const message =
        payload.error?.message ?? payload.detail ?? response.statusText;
      throw new EmbeddingUnavailableError(
        `Embedding request failed (${response.status}): ${message}`,
      );
    }

    const embedding = payload.data?.[0]?.embedding;

    if (!embedding) {
      throw new EmbeddingUnavailableError('Embedding response did not include a vector');
    }

    const normalized = this.normalize(embedding.map((value) => Number(value)));

    this.logger.debug(
      JSON.stringify({
        event: 'query_embedding',
        model: this.model,
        dimensions: normalized.length,
      }),
    );

    return normalized;
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

    if (magnitude === 0) {
      return vector;
    }

    return vector.map((value) => value / magnitude);
  }
}
