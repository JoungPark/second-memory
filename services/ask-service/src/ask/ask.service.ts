import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AskCitation,
  AskMessageRequest,
  AskMessageResponse,
  RequestContext,
  SearchMemoryResult,
} from '@second-memory/shared-types';
import { OpenAiCompatibleService } from '../llm/openai-compatible.service';
import type { ChatMessage } from '../llm/llm.types';
import { MemoryClientService } from '../memory/memory-client.service';
import { SessionStoreService } from '../sessions/session-store.service';
import { buildSystemPrompt, truncateExcerpt } from './prompts';

const DEFAULT_TOP_K = 5;

@Injectable()
export class AskService {
  private readonly confidenceThreshold: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly memoryClient: MemoryClientService,
    private readonly sessionStore: SessionStoreService,
    private readonly llmService: OpenAiCompatibleService,
  ) {
    this.confidenceThreshold = this.configService.get<number>('confidenceThreshold', 0.35);
  }

  async sendMessage(
    context: RequestContext,
    request: AskMessageRequest,
  ): Promise<AskMessageResponse> {
    const session = this.sessionStore.resolveSession(context, request.sessionId);
    const topK = Math.min(Math.max(request.topK ?? DEFAULT_TOP_K, 1), 50);

    const searchResponse = await this.memoryClient.searchMemories(context, {
      query: request.message,
      topK,
      filters: request.filters,
    });

    const confidence = this.computeConfidence(searchResponse.results);
    const lowConfidenceFlag = confidence < this.confidenceThreshold;
    const citations = this.buildCitations(searchResponse.results);
    const messages = this.buildChatMessages(
      session.turns,
      request.message,
      searchResponse.results,
      lowConfidenceFlag,
    );

    const completion = await this.llmService.chat(messages);

    this.sessionStore.appendTurn(session, {
      role: 'user',
      content: request.message,
    });
    this.sessionStore.appendTurn(session, {
      role: 'assistant',
      content: completion.content,
    });

    return {
      sessionId: session.sessionId,
      answer: completion.content,
      citations,
      confidence,
      lowConfidenceFlag,
    };
  }

  private computeConfidence(results: SearchMemoryResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    const maxScore = Math.max(...results.map((result) => result.score));
    return Math.min(Math.max(maxScore, 0), 1);
  }

  private buildCitations(results: SearchMemoryResult[]): AskCitation[] {
    return results.map((result) => ({
      memoryId: result.id,
      entryType: result.entryType,
      excerpt: truncateExcerpt(result.content),
    }));
  }

  private buildChatMessages(
    priorTurns: Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: string,
    memories: SearchMemoryResult[],
    lowConfidence: boolean,
  ): ChatMessage[] {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt({ memories, lowConfidence }),
      },
    ];

    for (const turn of priorTurns) {
      messages.push({
        role: turn.role,
        content: turn.content,
      });
    }

    messages.push({
      role: 'user',
      content: userMessage,
    });

    return messages;
  }
}
