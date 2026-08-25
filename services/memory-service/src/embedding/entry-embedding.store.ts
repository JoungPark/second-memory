import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class EntryEmbeddingStore {
  async store(
    tx: Prisma.TransactionClient,
    entryId: string,
    vector: number[],
    model: string,
  ): Promise<void> {
    const vectorLiteral = this.formatVectorLiteral(vector);

    await tx.$executeRaw`
      INSERT INTO entry_embeddings (entry_id, embedding, model, embedded_at)
      VALUES (${entryId}::uuid, ${vectorLiteral}::vector, ${model}, NOW())
      ON CONFLICT (entry_id)
      DO UPDATE SET
        embedding = EXCLUDED.embedding,
        model = EXCLUDED.model,
        embedded_at = EXCLUDED.embedded_at
    `;
  }

  private formatVectorLiteral(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }
}
