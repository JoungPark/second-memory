import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { RequestContext } from '@second-memory/shared-types';
import { OpenAiCompatibleService } from '../llm/openai-compatible.service';
import { MemoryClientService } from '../memory/memory-client.service';
import { SessionStoreService } from '../sessions/session-store.service';
import { AskService } from './ask.service';

describe('AskService', () => {
  let service: AskService;
  let memoryClient: jest.Mocked<MemoryClientService>;
  let sessionStore: jest.Mocked<SessionStoreService>;
  let llmService: jest.Mocked<OpenAiCompatibleService>;

  const context: RequestContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
  };

  const session = {
    sessionId: 'session-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    turns: [],
    expiresAt: Date.now() + 3600000,
  };

  beforeEach(async () => {
    memoryClient = {
      searchMemories: jest.fn(),
    } as unknown as jest.Mocked<MemoryClientService>;

    sessionStore = {
      resolveSession: jest.fn().mockReturnValue({ ...session, turns: [] }),
      appendTurn: jest.fn(),
    } as unknown as jest.Mocked<SessionStoreService>;

    llmService = {
      chat: jest.fn(),
    } as unknown as jest.Mocked<OpenAiCompatibleService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AskService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'confidenceThreshold') {
                return 0.35;
              }

              return defaultValue;
            }),
          },
        },
        {
          provide: MemoryClientService,
          useValue: memoryClient,
        },
        {
          provide: SessionStoreService,
          useValue: sessionStore,
        },
        {
          provide: OpenAiCompatibleService,
          useValue: llmService,
        },
      ],
    }).compile();

    service = module.get(AskService);
  });

  it('returns a grounded answer with citations and confidence', async () => {
    memoryClient.searchMemories.mockResolvedValue({
      results: [
        {
          id: 'memory-1',
          entryType: 'note',
          content: 'I visited Kyoto in spring.',
          occurredAt: '2026-01-15T00:00:00.000Z',
          score: 0.8,
        },
      ],
    });
    llmService.chat.mockResolvedValue({
      content: 'You visited Kyoto in spring. [id=memory-1]',
    });

    const response = await service.sendMessage(context, {
      message: 'Where did I travel?',
    });

    expect(response.sessionId).toBe('session-1');
    expect(response.answer).toContain('Kyoto');
    expect(response.citations).toHaveLength(1);
    expect(response.citations[0]?.memoryId).toBe('memory-1');
    expect(response.confidence).toBe(0.8);
    expect(response.lowConfidenceFlag).toBe(false);
    expect(sessionStore.appendTurn).toHaveBeenCalledTimes(2);
  });

  it('flags low confidence when retrieval scores are weak', async () => {
    memoryClient.searchMemories.mockResolvedValue({
      results: [
        {
          id: 'memory-2',
          entryType: 'self_talk',
          content: 'Maybe I should learn piano.',
          occurredAt: '2026-02-01T00:00:00.000Z',
          score: 0.1,
        },
      ],
    });
    llmService.chat.mockResolvedValue({
      content: 'I am not sure based on your memories.',
    });

    const response = await service.sendMessage(context, {
      message: 'What instrument did I buy?',
    });

    expect(response.confidence).toBe(0.1);
    expect(response.lowConfidenceFlag).toBe(true);
  });

  it('reuses an existing session when sessionId is provided', async () => {
    sessionStore.resolveSession.mockReturnValue({
      ...session,
      turns: [{ role: 'user', content: 'Earlier question' }],
    });
    memoryClient.searchMemories.mockResolvedValue({ results: [] });
    llmService.chat.mockResolvedValue({ content: 'No matching memories.' });

    await service.sendMessage(context, {
      sessionId: 'session-1',
      message: 'Follow up question',
    });

    expect(sessionStore.resolveSession).toHaveBeenCalledWith(context, 'session-1');
    expect(llmService.chat).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'Earlier question' }),
        expect.objectContaining({ role: 'user', content: 'Follow up question' }),
      ]),
    );
  });
});
