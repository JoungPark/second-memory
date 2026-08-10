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
});
