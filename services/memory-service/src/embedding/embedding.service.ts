import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EmbedResponse {
  embedding?: number[];
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

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService
      .get<string>('embedding.baseUrl', 'http://localhost:8090')
      .replace(/\/$/, '');
  }

  async embedText(text: string): Promise<number[]> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new EmbeddingUnavailableError(
        `Could not reach embedding service at ${this.baseUrl}: ${message}`,
      );
    }

    let payload: EmbedResponse;

    try {
      payload = (await response.json()) as EmbedResponse;
    } catch {
      throw new EmbeddingUnavailableError(
        `Embedding service returned non-JSON response (${response.status})`,
      );
    }

    if (!response.ok) {
      const message = payload.detail ?? response.statusText;
      throw new EmbeddingUnavailableError(`Embedding request failed (${response.status}): ${message}`);
    }

    const embedding = payload.embedding;

    if (!embedding) {
      throw new EmbeddingUnavailableError('Embedding response did not include a vector');
    }

    const normalized = this.normalize(embedding.map((value) => Number(value)));

    this.logger.debug(
      JSON.stringify({
        event: 'query_embedding',
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
