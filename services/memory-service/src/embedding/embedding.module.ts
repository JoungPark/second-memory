import { Module } from '@nestjs/common';
import { EntryEmbeddingStore } from './entry-embedding.store';
import { EmbeddingService } from './embedding.service';

@Module({
  providers: [EmbeddingService, EntryEmbeddingStore],
  exports: [EmbeddingService, EntryEmbeddingStore],
})
export class EmbeddingModule {}
