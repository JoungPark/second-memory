export default () => ({
  port: parseInt(process.env.PORT ?? '3002', 10),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://second_memory:second_memory_dev@localhost:5432/second_memory',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  memoryServiceUrl: process.env.MEMORY_SERVICE_URL ?? 'http://localhost:3001',
  llm: {
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE ?? '0.2'),
  },
  session: {
    ttlMs: parseInt(process.env.SESSION_TTL_MS ?? '3600000', 10),
    cleanupIntervalMs: parseInt(process.env.SESSION_CLEANUP_INTERVAL_MS ?? '300000', 10),
  },
  confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD ?? '0.35'),
});
