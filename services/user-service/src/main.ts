import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { configureHttp } from './app-http';
import { loadLambdaDatabaseUrl, readLambdaWebAddress } from './config/lambda-web';

async function bootstrap(): Promise<void> {
  const endpoint = process.env.AWS_LAMBDA_HTTP_ENDPOINT;
  const address = endpoint === undefined ? undefined : readLambdaWebAddress(endpoint);
  if (address) await loadLambdaDatabaseUrl();
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule);
  configureHttp(app);
  app.enableShutdownHooks();
  await app.listen(address?.port ?? Number(process.env.PORT ?? 3003), address?.host ?? '127.0.0.1');
}

void bootstrap().catch(() => {
  Logger.error('User service startup failed');
  process.exitCode = 1;
});
