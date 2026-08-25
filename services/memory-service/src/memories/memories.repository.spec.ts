import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { RequestContext } from '@second-memory/shared-types';
import { PrismaService } from '@second-memory/server-db';
import { EntryEmbeddingStore } from '../embedding/entry-embedding.store';
import { MemoriesRepository } from './memories.repository';

describe('MemoriesRepository search', () => {
  let repository: MemoriesRepository;
  let prisma: {
    entry: {
      findMany: jest.Mock;
    };
    $queryRaw: jest.Mock;
  };
  let minSearchScore: number;

  const context: RequestContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
  };

  const createModule = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoriesRepository,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'search.minScore') {
                return minSearchScore;
              }

              return defaultValue;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: EntryEmbeddingStore,
          useValue: {
            store: jest.fn(),
          },
        },
      ],
    }).compile();

    return module.get(MemoriesRepository);
  };

  beforeEach(async () => {
    minSearchScore = 0;
    prisma = {
      entry: {
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    repository = await createModule();
  });

  it('returns vector search results', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 'memory-1',
        entry_type: 'note',
        content: 'Trip to Kyoto',
        occurred_at: new Date('2026-08-11T00:00:00.000Z'),
        score: 0.92,
      },
    ]);

    const response = await repository.searchByVector(
      context,
      {
        query: 'travel plans',
        topK: 5,
      },
      [1, 0, 0],
    );

    expect(response).toHaveLength(1);
    expect(response[0]).toEqual({
      id: 'memory-1',
      entryType: 'note',
      content: 'Trip to Kyoto',
      occurredAt: '2026-08-11T00:00:00.000Z',
      score: 0.92,
    });
    expect(prisma.entry.findMany).not.toHaveBeenCalled();
  });

  it('returns keyword search results', async () => {
    prisma.entry.findMany.mockResolvedValue([
      {
        id: 'memory-2',
        entryType: 'note',
        content: 'Project kickoff notes',
        occurredAt: new Date('2026-08-11T00:00:00.000Z'),
      },
    ]);

    const response = await repository.searchByKeyword(context, {
      query: 'kickoff',
      topK: 5,
    });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.content).toContain('kickoff');
    expect(prisma.entry.findMany).toHaveBeenCalled();
  });

  it('excludes keyword results below the configured minimum score', async () => {
    minSearchScore = 0.5;
    repository = await createModule();
    prisma.entry.findMany.mockResolvedValue([
      {
        id: 'memory-4',
        entryType: 'note',
        content: 'A short calm note',
        occurredAt: new Date('2026-08-11T00:00:00.000Z'),
      },
    ]);

    const response = await repository.searchByKeyword(context, {
      query: 'calm',
      topK: 5,
    });

    expect(response.results).toEqual([]);
  });
});

describe('MemoriesRepository create', () => {
  let repository: MemoriesRepository;
  let prisma: {
    entry: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    outboxEvent: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let entryEmbeddingStore: {
    store: jest.Mock;
  };

  const context: RequestContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
  };

  const createRepository = async () => {
    entryEmbeddingStore = {
      store: jest.fn().mockResolvedValue(undefined),
    };
    prisma = {
      entry: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoriesRepository,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'search.minScore') {
                return 0;
              }

              return defaultValue;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: EntryEmbeddingStore,
          useValue: entryEmbeddingStore,
        },
      ],
    }).compile();

    return module.get(MemoriesRepository);
  };

  it('writes an outbox event in worker mode', async () => {
    repository = await createRepository();
    const createdEntry = {
      id: 'entry-1',
      content: 'Capture from test',
      createdAt: new Date('2026-08-11T00:00:00.000Z'),
    };

    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        entry: {
          create: jest.fn().mockResolvedValue(createdEntry),
        },
        outboxEvent: {
          create: prisma.outboxEvent.create,
        },
      }),
    );
    prisma.outboxEvent.create.mockResolvedValue({});

    const response = await repository.create(context, {
      entryType: 'note',
      content: 'Capture from test',
    });

    expect(response.id).toBe('entry-1');
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: {
        aggregateId: 'entry-1',
        eventType: 'entry.created',
        payload: {
          entryId: 'entry-1',
          tenantId: context.tenantId,
          userId: context.userId,
          content: 'Capture from test',
        },
      },
    });
  });

  it('stores entry and embedding in one transaction', async () => {
    repository = await createRepository();
    const createdEntry = {
      id: 'entry-2',
      content: 'Inline capture',
      createdAt: new Date('2026-08-11T00:00:00.000Z'),
    };
    const vector = [1, 0, 0];
    const tx = {
      entry: {
        create: jest.fn().mockResolvedValue(createdEntry),
      },
    };

    prisma.$transaction.mockImplementation(async (callback) => callback(tx));

    const response = await repository.create(
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

    expect(tx.entry.create).toHaveBeenCalled();
    expect(entryEmbeddingStore.store).toHaveBeenCalledWith(
      tx,
      'entry-2',
      vector,
      'sentence-transformers/all-MiniLM-L6-v2',
    );
    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
    expect(response.id).toBe('entry-2');
  });
});
