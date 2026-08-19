import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { EmbeddingJobPayload } from '@second-memory/shared-types';
import { PrismaService } from '@second-memory/server-db';
import { EmbeddingQueueService } from './embedding-queue.service';

const OUTBOX_EVENT_ENTRY_CREATED = 'entry.created';
const RELAY_INTERVAL_MS = 5000;
const RELAY_BATCH_SIZE = 50;

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private relayTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingQueue: EmbeddingQueueService,
  ) {}

  onModuleInit(): void {
    this.relayTimer = setInterval(() => {
      void this.relayPendingEvents();
    }, RELAY_INTERVAL_MS);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.relayTimer) {
      clearInterval(this.relayTimer);
    }
  }

  async relayPendingEvents(): Promise<number> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: 'asc' },
      take: RELAY_BATCH_SIZE,
    });

    let publishedCount = 0;

    for (const event of events) {
      try {
        if (event.eventType === OUTBOX_EVENT_ENTRY_CREATED) {
          await this.embeddingQueue.enqueue(
            event.payload as unknown as EmbeddingJobPayload,
          );
        }

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { publishedAt: new Date() },
        });
        publishedCount += 1;
      } catch (error) {
        this.logger.error(
          `Failed to relay outbox event ${event.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return publishedCount;
  }
}
