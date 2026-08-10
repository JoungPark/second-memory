import { Module } from '@nestjs/common';
import { InternalMemoriesController } from './internal-memories.controller';
import { MemoriesController } from './memories.controller';
import { MemoriesRepository } from './memories.repository';
import { MemoriesService } from './memories.service';

@Module({
  controllers: [MemoriesController, InternalMemoriesController],
  providers: [MemoriesService, MemoriesRepository],
})
export class MemoriesModule {}
