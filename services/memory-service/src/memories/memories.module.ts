import { Module } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { InternalRequestContextGuard } from '../common/guards/internal-request-context.guard';
import { QueueModule } from '../queue/queue.module';
import { InternalMemoriesController } from './internal-memories.controller';
import { MemoriesController } from './memories.controller';
import { MemoriesRepository } from './memories.repository';
import { MemoriesService } from './memories.service';

@Module({
  imports: [QueueModule],
  controllers: [MemoriesController, InternalMemoriesController],
  providers: [
    MemoriesService,
    MemoriesRepository,
    FirebaseAuthGuard,
    InternalRequestContextGuard,
  ],
})
export class MemoriesModule {}
