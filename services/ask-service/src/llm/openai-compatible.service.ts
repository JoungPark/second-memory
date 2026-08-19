import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatCompletionResult, ChatMessage } from './llm.types';

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
}

@Injectable()
export class OpenAiCompatibleService {
  private readonly logger = new Logger(OpenAiCompatibleService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService
      .get<string>('llm.baseUrl', 'https://api.openai.com/v1')
      .replace(/\/$/, '');
    this.apiKey = this.configService.get<string>('llm.apiKey', '');
    this.model = this.configService.get<string>('llm.model', 'gpt-4o-mini');
    this.temperature = this.configService.get<number>('llm.temperature', 0.2);
  }

  async chat(messages: ChatMessage[]): Promise<ChatCompletionResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: this.temperature,
      }),
    });

    const payload = (await response.json()) as OpenAiChatCompletionResponse;

    if (!response.ok) {
      const message = payload.error?.message ?? response.statusText;
      throw new ServiceUnavailableException(`LLM request failed (${response.status}): ${message}`);
    }

    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new ServiceUnavailableException('LLM returned an empty response');
    }

    if (payload.usage) {
      this.logger.log(
        JSON.stringify({
          event: 'llm_completion',
          model: this.model,
          promptTokens: payload.usage.prompt_tokens ?? 0,
          completionTokens: payload.usage.completion_tokens ?? 0,
          totalTokens: payload.usage.total_tokens ?? 0,
        }),
      );
    }

    return {
      content,
      usage: payload.usage
        ? {
            promptTokens: payload.usage.prompt_tokens ?? 0,
            completionTokens: payload.usage.completion_tokens ?? 0,
            totalTokens: payload.usage.total_tokens ?? 0,
          }
        : undefined,
    };
  }
}
