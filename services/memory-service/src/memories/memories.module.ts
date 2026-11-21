import { DynamicModule, Module } from '@nestjs/common';
import {
  FirebaseAuthGuard,
  InternalRequestContextGuard,
} from '@second-memory/nest-auth';
import { EmbeddingModule } from '../embedding/embedding.module';
import { QueueModule } from '../queue/queue.module';
import { InternalMemoriesController } from './internal-memories.controller';
import { MemoriesController } from './memories.controller';
import { MemoriesRepository } from './memories.repository';
import { MemoriesService } from './memories.service';

@Module({
  imports: [QueueModule, EmbeddingModule],
  controllers: [MemoriesController],
  providers: [MemoriesService, MemoriesRepository, FirebaseAuthGuard],
})
export class MemoriesModule {
  static withInternalRoutes(): DynamicModule {
    return {
      module: MemoriesModule,
      controllers: [InternalMemoriesController],
      providers: [InternalRequestContextGuard],
    };
  }
}
