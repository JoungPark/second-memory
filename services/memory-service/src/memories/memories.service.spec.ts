import { Test, TestingModule } from '@nestjs/testing';
import type { RequestContext } from '@second-memory/shared-types';
import { OutboxRelayService } from '../queue/outbox-relay.service';
import { MemoriesRepository } from './memories.repository';
import { MemoriesService } from './memories.service';

describe('MemoriesService', () => {
  let service: MemoriesService;
  let repository: jest.Mocked<MemoriesRepository>;
  let outboxRelay: jest.Mocked<OutboxRelayService>;

  const context: RequestContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      list: jest.fn(),
      search: jest.fn(),
    } as unknown as jest.Mocked<MemoriesRepository>;
    outboxRelay = {
      relayPendingEvents: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<OutboxRelayService>;

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
      ],
    }).compile();

    service = module.get(MemoriesService);
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

  it('searches memories via repository search', async () => {
    repository.search.mockResolvedValue({
      results: [
        {
          id: 'memory-1',
          entryType: 'note',
          content: 'Project kickoff notes',
          occurredAt: '2026-08-11T00:00:00.000Z',
          score: 0.5,
        },
      ],
    });

    const results = await service.searchMemories(context, {
      query: 'kickoff',
      topK: 5,
    });

    expect(results.results).toHaveLength(1);
    expect(results.results[0]?.content).toContain('kickoff');
  });
});
