import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_CHAT_MODEL } from '../config/configuration';
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
}

@Injectable()
export class OpenAiCompatibleService {
  private readonly logger = new Logger(OpenAiCompatibleService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly lambdaWeb: boolean;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('llm.baseUrl', 'https://api.openai.com/v1').replace(/\/$/, '');
    this.apiKey = this.configService.get<string>('llm.apiKey', '');
    this.model = this.configService.get<string>('llm.model', DEFAULT_CHAT_MODEL);
    this.lambdaWeb = this.configService.get<boolean>('lambdaWeb', false);
  }

  async chat(messages: ChatMessage[]): Promise<ChatCompletionResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    let payload: OpenAiChatCompletionResponse;
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          messages,
        }),
        ...(this.lambdaWeb ? { signal: AbortSignal.timeout(25_000), redirect: 'error' as const } : {}),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error();
      }
      payload = (await response.json()) as OpenAiChatCompletionResponse;
    } catch {
      throw new ServiceUnavailableException('LLM request failed');
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
