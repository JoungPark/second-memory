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
  userServiceUrl:
    process.env.USER_SERVICE_URL?.trim() ||
    (process.env.AWS_LAMBDA_HTTP_ENDPOINT === undefined ? 'http://127.0.0.1:3003' : undefined),
  awsRegion: process.env.AWS_REGION,
  lambdaWeb: process.env.AWS_LAMBDA_HTTP_ENDPOINT !== undefined,
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
    timeoutMs: process.env.AWS_LAMBDA_HTTP_ENDPOINT ? 15_000 : undefined,
  },
  search: {
    minScore: parseFloat(process.env.MIN_SEARCH_SCORE ?? '0'),
  },
});
