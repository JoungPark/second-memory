import { DynamicModule, Module } from '@nestjs/common';
import {
  InternalRequestContextGuard,
  UserServiceAuthModule,
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
    const hasPublicRoutes = profile !== 'lambda-web-internal';
    const hasInternalRoutes = profile !== 'lambda-web';
    return {
      module: MemoriesModule,
      imports: hasPublicRoutes ? [UserServiceAuthModule] : [],
      controllers: [
        ...(hasPublicRoutes ? [MemoriesController] : []),
        ...(hasInternalRoutes ? [InternalMemoriesController] : []),
      ],
      providers: hasInternalRoutes ? [InternalRequestContextGuard] : [],
    };
  }
}
