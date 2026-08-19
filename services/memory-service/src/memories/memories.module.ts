import { Module } from '@nestjs/common';
import { FirebaseAuthGuard, InternalRequestContextGuard } from '@second-memory/nest-auth';
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
