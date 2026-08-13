import { Module } from '@nestjs/common';
import { EmbeddingQueueService } from './embedding-queue.service';
import { OutboxRelayService } from './outbox-relay.service';

@Module({
  providers: [EmbeddingQueueService, OutboxRelayService],
  exports: [EmbeddingQueueService, OutboxRelayService],
})
export class QueueModule {}
