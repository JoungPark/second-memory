import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EMBEDDING_JOB_NAME,
  EMBEDDING_QUEUE_NAME,
  type EmbeddingJobPayload,
} from '@second-memory/shared-types';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class EmbeddingQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(EmbeddingQueueService.name);
  private readonly connection: IORedis;
  private readonly queue: Queue<EmbeddingJobPayload>;

  constructor(private readonly configService: ConfigService) {
    this.connection = new IORedis(
      this.configService.get<string>('redisUrl', 'redis://localhost:6379'),
      {
        maxRetriesPerRequest: null,
      },
    );
    this.queue = new Queue<EmbeddingJobPayload>(EMBEDDING_QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  async enqueue(payload: EmbeddingJobPayload): Promise<void> {
    await this.queue.add(EMBEDDING_JOB_NAME, payload, {
      jobId: payload.entryId,
    });
    this.logger.debug(`Enqueued embedding job for entry ${payload.entryId}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
