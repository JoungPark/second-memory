export type EmbeddingStorageMode = 'worker' | 'inline';

function parseEmbeddingStorageMode(value: string | undefined): EmbeddingStorageMode {
  const mode = value ?? 'inline';

  if (mode !== 'worker' && mode !== 'inline') {
    throw new Error(
      `Invalid EMBEDDING_STORAGE_MODE: "${mode}". Must be "worker" or "inline".`,
    );
  }

  return mode;
}

export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://second_memory:second_memory_dev@localhost:5432/second_memory',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  embedding: {
    baseUrl: process.env.EMBEDDING_BASE_URL ?? 'https://api.openai.com/v1',
    apiKey: process.env.EMBEDDING_API_KEY ?? '',
    model: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
    storageMode: parseEmbeddingStorageMode(process.env.EMBEDDING_STORAGE_MODE),
  },
  search: {
    minScore: parseFloat(process.env.MIN_SEARCH_SCORE ?? '0'),
  },
});
