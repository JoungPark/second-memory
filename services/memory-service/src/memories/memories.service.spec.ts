import { Test, TestingModule } from '@nestjs/testing';
import type { RequestContext } from '@second-memory/shared-types';
import { MemoriesRepository } from './memories.repository';
import { MemoriesService } from './memories.service';

describe('MemoriesService', () => {
  let service: MemoriesService;

  const context: RequestContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemoriesService, MemoriesRepository],
    }).compile();

    service = module.get(MemoriesService);
  });

  it('creates and lists memories for the scoped user', () => {
    const created = service.createMemory(context, {
      entryType: 'note',
      content: 'Remember to buy milk',
    });

    const listed = service.listMemories(context, {});

    expect(created.id).toBeDefined();
    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.content).toBe('Remember to buy milk');
  });

  it('returns the same entry for duplicate idempotency keys', () => {
    const first = service.createMemory(context, {
      entryType: 'self_talk',
      content: 'I felt calm today',
      idempotencyKey: 'capture-1',
    });

    const second = service.createMemory(context, {
      entryType: 'self_talk',
      content: 'I felt calm today',
      idempotencyKey: 'capture-1',
    });

    expect(second.id).toBe(first.id);
  });

  it('searches memories by keyword', () => {
    service.createMemory(context, {
      entryType: 'note',
      content: 'Project kickoff notes',
    });

    const results = service.searchMemories(context, {
      query: 'kickoff',
      topK: 5,
    });

    expect(results.results).toHaveLength(1);
    expect(results.results[0]?.content).toContain('kickoff');
  });
});
