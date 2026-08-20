import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { RequestContext } from '@second-memory/shared-types';
import { PrismaService } from '@second-memory/server-db';
import { EmbeddingService, EmbeddingUnavailableError } from '../embedding/embedding.service';
import { MemoriesRepository } from './memories.repository';

describe('MemoriesRepository search', () => {
  let repository: MemoriesRepository;
  let prisma: {
    entry: {
      findMany: jest.Mock;
    };
    $queryRaw: jest.Mock;
  };
  let embeddingService: {
    embedText: jest.Mock;
  };
  let minSearchScore: number;

  const context: RequestContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
  };

  beforeEach(async () => {
    minSearchScore = 0;
    prisma = {
      entry: {
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };
    embeddingService = {
      embedText: jest.fn(),
    };

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
          provide: EmbeddingService,
          useValue: embeddingService,
        },
      ],
    }).compile();

    repository = module.get(MemoriesRepository);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns vector search results when embeddings are available', async () => {
    embeddingService.embedText.mockResolvedValue([1, 0, 0]);
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 'memory-1',
        entry_type: 'note',
        content: 'Trip to Kyoto',
        occurred_at: new Date('2026-08-11T00:00:00.000Z'),
        score: 0.92,
      },
    ]);

    const response = await repository.search(context, {
      query: 'travel plans',
      topK: 5,
    });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toEqual({
      id: 'memory-1',
      entryType: 'note',
      content: 'Trip to Kyoto',
      occurredAt: '2026-08-11T00:00:00.000Z',
      score: 0.92,
    });
    expect(embeddingService.embedText).toHaveBeenCalledWith('travel plans');
    expect(prisma.entry.findMany).not.toHaveBeenCalled();
  });

  it('falls back to keyword search when vector search returns no results', async () => {
    embeddingService.embedText.mockResolvedValue([1, 0, 0]);
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.entry.findMany.mockResolvedValue([
      {
        id: 'memory-2',
        entryType: 'note',
        content: 'Project kickoff notes',
        occurredAt: new Date('2026-08-11T00:00:00.000Z'),
      },
    ]);

    const response = await repository.search(context, {
      query: 'kickoff',
      topK: 5,
    });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.content).toContain('kickoff');
    expect(prisma.entry.findMany).toHaveBeenCalled();
  });

  it('falls back to keyword search when embedding API is unavailable', async () => {
    embeddingService.embedText.mockRejectedValue(
      new EmbeddingUnavailableError('Could not reach embedding API'),
    );
    prisma.entry.findMany.mockResolvedValue([
      {
        id: 'memory-3',
        entryType: 'self_talk',
        content: 'I felt calm today',
        occurredAt: new Date('2026-08-11T00:00:00.000Z'),
      },
    ]);

    const response = await repository.search(context, {
      query: 'calm',
      topK: 5,
    });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.content).toContain('calm');
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.entry.findMany).toHaveBeenCalled();
  });

  it('returns empty results for blank queries without calling search backends', async () => {
    const response = await repository.search(context, {
      query: '   ',
      topK: 5,
    });

    expect(response.results).toEqual([]);
    expect(embeddingService.embedText).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.entry.findMany).not.toHaveBeenCalled();
  });

  it('excludes keyword results below the configured minimum score', async () => {
    minSearchScore = 0.5;

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
          provide: EmbeddingService,
          useValue: embeddingService,
        },
      ],
    }).compile();

    const filteredRepository = module.get(MemoriesRepository);
    embeddingService.embedText.mockRejectedValue(
      new EmbeddingUnavailableError('Could not reach embedding API'),
    );
    prisma.entry.findMany.mockResolvedValue([
      {
        id: 'memory-4',
        entryType: 'note',
        content: 'A short calm note',
        occurredAt: new Date('2026-08-11T00:00:00.000Z'),
      },
    ]);

    const response = await filteredRepository.search(context, {
      query: 'calm',
      topK: 5,
    });

    expect(response.results).toEqual([]);
  });
});
