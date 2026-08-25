import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { EntryEmbeddingStore } from './entry-embedding.store';

describe('EntryEmbeddingStore', () => {
  let store: EntryEmbeddingStore;
  let tx: {
    $executeRaw: jest.Mock;
  };

  beforeEach(async () => {
    tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [EntryEmbeddingStore],
    }).compile();

    store = module.get(EntryEmbeddingStore);
  });

  it('upserts an entry embedding inside a transaction', async () => {
    await store.store(
      tx as unknown as Prisma.TransactionClient,
      'entry-1',
      [1, 0, 0],
      'sentence-transformers/all-MiniLM-L6-v2',
    );

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const [strings, ...values] = tx.$executeRaw.mock.calls[0] as [
      TemplateStringsArray,
      ...unknown[],
    ];

    expect(strings.join('?')).toContain('INSERT INTO entry_embeddings');
    expect(strings.join('?')).toContain('ON CONFLICT (entry_id)');
    expect(values).toEqual(
      expect.arrayContaining([
        'entry-1',
        '[1,0,0]',
        'sentence-transformers/all-MiniLM-L6-v2',
      ]),
    );
  });
});
