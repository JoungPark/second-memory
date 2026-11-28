import { Module } from '@nestjs/common';
import { InternalApiModule } from '@second-memory/nest-auth';
import { MemoryClientService } from './memory-client.service';

@Module({
  imports: [InternalApiModule],
  providers: [MemoryClientService],
  exports: [MemoryClientService],
})
export class MemoryModule {}
