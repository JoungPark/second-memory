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
  providers: [MemoriesService, MemoriesRepository],
})
export class MemoriesModule {
  static forProfile(
    profile: 'server' | 'lambda-web' | 'lambda-web-internal',
  ): DynamicModule {
    return {
      module: MemoriesModule,
      controllers: [
        ...(profile !== 'lambda-web-internal' ? [MemoriesController] : []),
        ...(profile !== 'lambda-web' ? [InternalMemoriesController] : []),
      ],
      providers: [FirebaseAuthGuard, InternalRequestContextGuard],
    };
  }
}
