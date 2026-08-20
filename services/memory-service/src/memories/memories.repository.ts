import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateInternalMemoryRequest,
  CreateMemoryRequest,
  CreateMemoryResponse,
  EntryType,
  ListMemoriesQuery,
  ListMemoriesResponse,
  RequestContext,
  SearchMemoriesRequest,
  SearchMemoriesResponse,
  SearchMemoryResult,
} from '@second-memory/shared-types';
import { PrismaService } from '@second-memory/server-db';
import { EmbeddingService, EmbeddingUnavailableError } from '../embedding/embedding.service';

interface VectorSearchRow {
  id: string;
  entry_type: string;
  content: string;
  occurred_at: Date;
  score: number;
}

@Injectable()
export class MemoriesRepository {
  private readonly logger = new Logger(MemoriesRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async create(
    context: RequestContext,
    request: CreateMemoryRequest | CreateInternalMemoryRequest,
  ): Promise<CreateMemoryResponse> {
    if (request.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(context, request.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const now = new Date();
    const occurredAt = request.occurredAt ? new Date(request.occurredAt) : now;
    const tags = 'tags' in request ? (request.tags ?? []) : [];
    const sourceReferences =
      'sourceReferences' in request ? (request.sourceReferences ?? []) : [];

    try {
      const entry = await this.prisma.$transaction(async (tx) => {
        const created = await tx.entry.create({
          data: {
            tenantId: context.tenantId,
            userId: context.userId,
            entryType: request.entryType,
            content: request.content,
            occurredAt,
            idempotencyKey: request.idempotencyKey,
            sourceReferences,
          },
        });

        if (tags.length > 0) {
          await this.attachTags(tx, context.tenantId, created.id, tags);
        }

        await tx.outboxEvent.create({
          data: {
            aggregateId: created.id,
            eventType: 'entry.created',
            payload: {
              entryId: created.id,
              tenantId: context.tenantId,
              userId: context.userId,
              content: created.content,
            },
          },
        });

        return created;
      });

      return {
        id: entry.id,
        createdAt: entry.createdAt.toISOString(),
      };
    } catch (error) {
      if (
        request.idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.findByIdempotencyKey(context, request.idempotencyKey);
        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async list(
    context: RequestContext,
    query: ListMemoriesQuery,
  ): Promise<ListMemoriesResponse> {
    const pageSize = Math.min(Math.max(query.pageSize ?? 10, 1), 100);
    const where = this.buildListWhere(context, query);

    if (query.cursor) {
      const cursorEntry = await this.prisma.entry.findFirst({
        where: {
          id: query.cursor,
          tenantId: context.tenantId,
          userId: context.userId,
        },
        select: {
          id: true,
          occurredAt: true,
        },
      });

      if (cursorEntry) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            OR: [
              { occurredAt: { lt: cursorEntry.occurredAt } },
              {
                occurredAt: cursorEntry.occurredAt,
                id: { lt: cursorEntry.id },
              },
            ],
          },
        ];
      }
    }

    const entries = await this.prisma.entry.findMany({
      where,
      include: {
        entryTags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
    });

    const hasMore = entries.length > pageSize;
    const page = hasMore ? entries.slice(0, pageSize) : entries;
    const nextCursor = hasMore ? page[page.length - 1]?.id : undefined;

    return {
      items: page.map((entry) => ({
        id: entry.id,
        entryType: entry.entryType as EntryType,
        content: entry.content,
        occurredAt: entry.occurredAt.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        tags: this.mapTags(entry.entryTags),
      })),
      nextCursor,
    };
  }

  async search(
    context: RequestContext,
    request: SearchMemoriesRequest,
  ): Promise<SearchMemoriesResponse> {
    const topK = Math.min(Math.max(request.topK ?? 5, 1), 50);
    const normalizedQuery = request.query.trim();

    if (!normalizedQuery) {
      return { results: [] };
    }

    try {
      const queryVector = await this.embeddingService.embedText(normalizedQuery);
      const vectorResults = await this.searchByVector(context, request, queryVector, topK);

      if (vectorResults.length > 0) {
        return { results: vectorResults };
      }

      this.logger.warn(
        JSON.stringify({
          event: 'memory_search_fallback',
          reason: 'no_vector_results',
          tenantId: context.tenantId,
          userId: context.userId,
        }),
      );
    } catch (error) {
      if (error instanceof EmbeddingUnavailableError) {
        this.logger.warn(
          JSON.stringify({
            event: 'memory_search_fallback',
            reason: 'embedding_unavailable',
            message: error.message,
            tenantId: context.tenantId,
            userId: context.userId,
          }),
        );
      } else {
        throw error;
      }
    }

    return this.searchByKeyword(context, request, topK);
  }

  private async searchByVector(
    context: RequestContext,
    request: SearchMemoriesRequest,
    queryVector: number[],
    topK: number,
  ): Promise<SearchMemoryResult[]> {
    const vectorLiteral = this.formatVectorLiteral(queryVector);
    const filterClauses = this.buildVectorFilterClauses(request);

    const rows = await this.prisma.$queryRaw<VectorSearchRow[]>`
      SELECT
        e.id,
        e.entry_type,
        e.content,
        e.occurred_at,
        1 - (ee.embedding <=> ${vectorLiteral}::vector) AS score
      FROM entries e
      INNER JOIN entry_embeddings ee ON ee.entry_id = e.id
      WHERE e.tenant_id = ${context.tenantId}::uuid
        AND e.user_id = ${context.userId}::uuid
        ${filterClauses}
      ORDER BY ee.embedding <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `;

    return rows.map((row) => ({
      id: row.id,
      entryType: row.entry_type as EntryType,
      content: row.content,
      occurredAt: row.occurred_at.toISOString(),
      score: Number(row.score),
    }));
  }

  private async searchByKeyword(
    context: RequestContext,
    request: SearchMemoriesRequest,
    topK: number,
  ): Promise<SearchMemoriesResponse> {
    const normalizedQuery = request.query.trim().toLowerCase();
    const where = this.buildSearchWhere(context, request);
    where.content = {
      contains: normalizedQuery,
      mode: 'insensitive',
    };

    const entries = await this.prisma.entry.findMany({
      where,
      select: {
        id: true,
        entryType: true,
        content: true,
        occurredAt: true,
      },
    });

    const results = entries
      .map((entry) => ({
        id: entry.id,
        entryType: entry.entryType as EntryType,
        content: entry.content,
        occurredAt: entry.occurredAt.toISOString(),
        score: this.scoreMemory(entry.content, normalizedQuery),
      }))
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);

    return { results };
  }

  private buildVectorFilterClauses(request: SearchMemoriesRequest): Prisma.Sql {
    const filters = request.filters;
    const clauses: Prisma.Sql[] = [];

    if (filters?.entryType) {
      clauses.push(Prisma.sql`AND e.entry_type = ${filters.entryType}`);
    }

    if (filters?.from) {
      clauses.push(Prisma.sql`AND e.occurred_at >= ${new Date(filters.from)}`);
    }

    if (filters?.to) {
      clauses.push(Prisma.sql`AND e.occurred_at <= ${new Date(filters.to)}`);
    }

    if (clauses.length === 0) {
      return Prisma.empty;
    }

    return Prisma.join(clauses, ' ');
  }

  private formatVectorLiteral(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }

  private async findByIdempotencyKey(
    context: RequestContext,
    idempotencyKey: string,
  ): Promise<CreateMemoryResponse | undefined> {
    const entry = await this.prisma.entry.findUnique({
      where: {
        tenantId_userId_idempotencyKey: {
          tenantId: context.tenantId,
          userId: context.userId,
          idempotencyKey,
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    if (!entry) {
      return undefined;
    }

    return {
      id: entry.id,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  private buildListWhere(
    context: RequestContext,
    query: ListMemoriesQuery,
  ): Prisma.EntryWhereInput {
    const where: Prisma.EntryWhereInput = {
      tenantId: context.tenantId,
      userId: context.userId,
    };

    if (query.entryType) {
      where.entryType = query.entryType;
    }

    if (query.from || query.to) {
      where.occurredAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    if (query.keyword) {
      where.content = {
        contains: query.keyword,
        mode: 'insensitive',
      };
    }

    return where;
  }

  private buildSearchWhere(
    context: RequestContext,
    request: SearchMemoriesRequest,
  ): Prisma.EntryWhereInput {
    const where: Prisma.EntryWhereInput = {
      tenantId: context.tenantId,
      userId: context.userId,
    };
    const filters = request.filters;

    if (!filters) {
      return where;
    }

    if (filters.entryType) {
      where.entryType = filters.entryType;
    }

    if (filters.from || filters.to) {
      where.occurredAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }

    return where;
  }

  private async attachTags(
    tx: Prisma.TransactionClient,
    tenantId: string,
    entryId: string,
    tags: string[],
  ): Promise<void> {
    for (const name of tags) {
      const tag = await tx.tag.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name,
          },
        },
        create: {
          tenantId,
          name,
        },
        update: {},
      });

      await tx.entryTag.create({
        data: {
          entryId,
          tagId: tag.id,
        },
      });
    }
  }

  private mapTags(
    entryTags: Array<{ tag: { name: string } }>,
  ): string[] | undefined {
    const tags = entryTags.map((entryTag) => entryTag.tag.name);
    return tags.length > 0 ? tags : undefined;
  }

  private scoreMemory(content: string, query: string): number {
    const normalizedContent = content.toLowerCase();

    if (normalizedContent === query) {
      return 1;
    }

    if (normalizedContent.includes(query)) {
      return query.length / normalizedContent.length;
    }

    return 0;
  }
}
