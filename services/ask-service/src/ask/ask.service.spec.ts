import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { RequestContext } from '@second-memory/shared-types';
import { OpenAiCompatibleService } from '../llm/openai-compatible.service';
import { MemoryClientService } from '../memory/memory-client.service';
import { SessionStore, type SessionState, type SessionTransaction } from '../sessions/session-store';
import { AskService } from './ask.service';

describe('AskService', () => {
  let service: AskService;
  let memoryClient: jest.Mocked<MemoryClientService>;
  let sessionStore: jest.Mocked<SessionStore>;
  let state: SessionState;
  const save = jest.fn().mockResolvedValue(undefined);
  const remove = jest.fn().mockResolvedValue(undefined);
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
      createInternalMemory: jest.fn(),
    } as unknown as jest.Mocked<MemoryClientService>;

    state = { ...session, turns: [] };
    save.mockClear();
    remove.mockClear();
    sessionStore = {
      withSession: jest.fn(
        (
          _context: RequestContext,
          _id: string | undefined,
          operation: (session: SessionTransaction) => Promise<unknown>,
        ) => operation({ state, save, remove }),
      ) as jest.Mocked<SessionStore>['withSession'],
      deleteSession: jest.fn(),
    };

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
          provide: SessionStore,
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
    expect(save).toHaveBeenCalledTimes(1);
    expect(state.turns).toEqual([
      { role: 'user', content: 'Where did I travel?' },
      {
        role: 'assistant',
        content: 'You visited Kyoto in spring. [id=memory-1]',
        citedMemoryIds: ['memory-1'],
      },
    ]);
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
    state = {
      ...session,
      turns: [{ role: 'user', content: 'Earlier question' }],
    };
    memoryClient.searchMemories.mockResolvedValue({ results: [] });
    llmService.chat.mockResolvedValue({ content: 'No matching memories.' });

    await service.sendMessage(context, {
      sessionId: 'session-1',
      message: 'Follow up question',
    });

    expect(sessionStore.withSession).toHaveBeenCalledWith(context, 'session-1', expect.any(Function));
    expect(llmService.chat).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'Earlier question' }),
        expect.objectContaining({
          role: 'user',
          content: 'Follow up question',
        }),
      ]),
    );
  });

  it('summarizes and saves a conversation on endSession', async () => {
    state = {
      ...session,
      turns: [
        { role: 'user', content: 'Can I cancel my gym membership?' },
        {
          role: 'assistant',
          content: 'Your membership started on 2026-01-01.',
          citedMemoryIds: ['memory-1'],
        },
      ],
    };
    llmService.chat.mockResolvedValue({
      content: 'I asked about canceling my gym membership.',
    });
    memoryClient.createInternalMemory.mockResolvedValue({
      id: 'summary-1',
      createdAt: '2026-03-01T00:00:00.000Z',
    });

    const response = await service.endSession(context, {
      sessionId: 'session-1',
    });

    expect(response.summaryId).toBe('summary-1');
    expect(response.summaryText).toBe('I asked about canceling my gym membership.');
    expect(response.references).toEqual(['memory-1']);
    expect(memoryClient.createInternalMemory).toHaveBeenCalledWith(context, {
      entryType: 'conversation_summary',
      content: 'I asked about canceling my gym membership.',
      sourceReferences: ['memory-1'],
      idempotencyKey: 'session-1',
    });
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('rejects endSession for an empty conversation', async () => {
    await expect(service.endSession(context, { sessionId: 'session-1' })).rejects.toThrow(BadRequestException);
  });

  it('reuses the generated summary after a lost save response', async () => {
    state.turns.push({ role: 'user', content: 'Earlier question' });
    llmService.chat.mockResolvedValue({ content: 'Stable summary' });
    memoryClient.createInternalMemory.mockRejectedValueOnce(new Error('Connection closed')).mockResolvedValueOnce({
      id: 'summary-1',
      createdAt: '2026-03-01T00:00:00.000Z',
    });
    const request = { sessionId: state.sessionId };
    await expect(service.endSession(context, request)).rejects.toThrow('Connection closed');
    expect(remove).not.toHaveBeenCalled();
    await expect(service.endSession(context, request)).resolves.toMatchObject({
      summaryId: 'summary-1',
    });
    expect(llmService.chat).toHaveBeenCalledTimes(1);
    expect(memoryClient.createInternalMemory.mock.calls[0]).toEqual(memoryClient.createInternalMemory.mock.calls[1]);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('discards a session on closeSession', async () => {
    await service.closeSession(context, { sessionId: 'session-1' });

    expect(sessionStore.deleteSession).toHaveBeenCalledWith(context, 'session-1');
  });
});
