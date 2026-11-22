import { Module } from '@nestjs/common';
import { InternalApiModule } from '../internal-api/internal-api.module';
import { MemoryClientService } from './memory-client.service';

@Module({
  imports: [InternalApiModule],
  providers: [MemoryClientService],
  exports: [MemoryClientService],
})
export class MemoryModule {}
