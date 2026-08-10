export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://second_memory:second_memory_dev@localhost:5432/second_memory',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
});
