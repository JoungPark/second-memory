import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { RequestContext } from '@second-memory/shared-types';
import { EmbeddingService, EmbeddingUnavailableError } from '../embedding/embedding.service';
import { OutboxRelayService } from '../queue/outbox-relay.service';
import { MemoriesRepository } from './memories.repository';
import { MemoriesService } from './memories.service';

describe('MemoriesService', () => {
  let service: MemoriesService;
  let repository: jest.Mocked<MemoriesRepository>;
  let outboxRelay: jest.Mocked<OutboxRelayService>;
  let embeddingService: {
    embedText: jest.Mock;
  };

  const context: RequestContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
  };

  const createService = async (storageMode: 'worker' | 'inline') => {
    repository = {
      create: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      list: jest.fn(),
      searchByVector: jest.fn(),
      searchByKeyword: jest.fn(),
    } as unknown as jest.Mocked<MemoriesRepository>;
    outboxRelay = {
      relayPendingEvents: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<OutboxRelayService>;
    embeddingService = {
      embedText: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoriesService,
        {
          provide: MemoriesRepository,
          useValue: repository,
        },
        {
          provide: OutboxRelayService,
          useValue: outboxRelay,
        },
        {
          provide: EmbeddingService,
          useValue: embeddingService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'embedding.storageMode') {
                return storageMode;
              }

              if (key === 'embedding.model') {
                return 'sentence-transformers/all-MiniLM-L6-v2';
              }

              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    return module.get(MemoriesService);
  };

  beforeEach(async () => {
    service = await createService('worker');
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates and lists memories for the scoped user', async () => {
    repository.create.mockResolvedValue({
      id: 'memory-1',
      createdAt: '2026-08-11T00:00:00.000Z',
    });
    repository.list.mockResolvedValue({
      items: [
        {
          id: 'memory-1',
          entryType: 'note',
          content: 'Remember to buy milk',
          occurredAt: '2026-08-11T00:00:00.000Z',
          createdAt: '2026-08-11T00:00:00.000Z',
        },
      ],
    });

    const created = await service.createMemory(context, {
      entryType: 'note',
      content: 'Remember to buy milk',
    });
    const listed = await service.listMemories(context, {});

    expect(created.id).toBe('memory-1');
    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.content).toBe('Remember to buy milk');
    expect(outboxRelay.relayPendingEvents).toHaveBeenCalled();
  });

  it('relays outbox events in worker mode', async () => {
    service = await createService('worker');
    repository.create.mockResolvedValue({
      id: 'memory-1',
      createdAt: '2026-08-11T00:00:00.000Z',
    });

    await service.createMemory(context, {
      entryType: 'note',
      content: 'Remember to buy milk',
    });

    expect(repository.create).toHaveBeenCalled();
    expect(outboxRelay.relayPendingEvents).toHaveBeenCalled();
  });

  it('embeds before insert and stores the vector in inline mode', async () => {
    service = await createService('inline');
    const vector = [1, 0, 0];
    embeddingService.embedText.mockResolvedValue(vector);
    repository.create.mockResolvedValue({
      id: 'memory-1',
      createdAt: '2026-08-11T00:00:00.000Z',
    });

    await service.createMemory(context, {
      entryType: 'note',
      content: 'Inline capture',
    });

    expect(embeddingService.embedText).toHaveBeenCalledWith('Inline capture');
    expect(repository.create).toHaveBeenCalledWith(
      context,
      {
        entryType: 'note',
        content: 'Inline capture',
      },
      {
        vector,
        model: 'sentence-transformers/all-MiniLM-L6-v2',
      },
    );
    expect(outboxRelay.relayPendingEvents).not.toHaveBeenCalled();
  });

  it('returns 503 without DB writes when inline embedding fails', async () => {
    service = await createService('inline');
    embeddingService.embedText.mockRejectedValue(
      new EmbeddingUnavailableError('Could not reach embedding service'),
    );

    await expect(
      service.createMemory(context, {
        entryType: 'note',
        content: 'Inline capture',
      }),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('skips embedding for duplicate idempotency keys in inline mode', async () => {
    service = await createService('inline');
    repository.findByIdempotencyKey.mockResolvedValue({
      id: 'memory-1',
      createdAt: '2026-08-11T00:00:00.000Z',
    });

    const response = await service.createMemory(context, {
      entryType: 'note',
      content: 'Inline capture',
      idempotencyKey: 'capture-1',
    });

    expect(response.id).toBe('memory-1');
    expect(embeddingService.embedText).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns the same entry for duplicate idempotency keys', async () => {
    repository.create.mockResolvedValue({
      id: 'memory-1',
      createdAt: '2026-08-11T00:00:00.000Z',
    });

    const first = await service.createMemory(context, {
      entryType: 'self_talk',
      content: 'I felt calm today',
      idempotencyKey: 'capture-1',
    });
    const second = await service.createMemory(context, {
      entryType: 'self_talk',
      content: 'I felt calm today',
      idempotencyKey: 'capture-1',
    });

    expect(second.id).toBe(first.id);
  });

  it('returns vector search results when embeddings are available', async () => {
    embeddingService.embedText.mockResolvedValue([1, 0, 0]);
    repository.searchByVector.mockResolvedValue([
      {
        id: 'memory-1',
        entryType: 'note',
        content: 'Trip to Kyoto',
        occurredAt: '2026-08-11T00:00:00.000Z',
        score: 0.92,
      },
    ]);

    const response = await service.searchMemories(context, {
      query: 'travel plans',
      topK: 5,
    });

    expect(response.results).toHaveLength(1);
    expect(embeddingService.embedText).toHaveBeenCalledWith('travel plans');
    expect(repository.searchByKeyword).not.toHaveBeenCalled();
  });

  it('falls back to keyword search when embedding API is unavailable', async () => {
    embeddingService.embedText.mockRejectedValue(
      new EmbeddingUnavailableError('Could not reach embedding API'),
    );
    repository.searchByKeyword.mockResolvedValue({
      results: [
        {
          id: 'memory-3',
          entryType: 'self_talk',
          content: 'I felt calm today',
          occurredAt: '2026-08-11T00:00:00.000Z',
          score: 0.5,
        },
      ],
    });

    const response = await service.searchMemories(context, {
      query: 'calm',
      topK: 5,
    });

    expect(response.results).toHaveLength(1);
    expect(repository.searchByVector).not.toHaveBeenCalled();
    expect(repository.searchByKeyword).toHaveBeenCalled();
  });

  it('returns empty results for blank queries without calling search backends', async () => {
    const response = await service.searchMemories(context, {
      query: '   ',
      topK: 5,
    });

    expect(response.results).toEqual([]);
    expect(embeddingService.embedText).not.toHaveBeenCalled();
    expect(repository.searchByVector).not.toHaveBeenCalled();
    expect(repository.searchByKeyword).not.toHaveBeenCalled();
  });
});
