import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { configureHttp } from './app-http';
import {
  loadLambdaWebSecrets,
  readLambdaWebAddress,
} from './config/lambda-web';

async function bootstrap() {
  const webEndpoint = process.env.AWS_LAMBDA_HTTP_ENDPOINT;
  const address =
    webEndpoint === undefined ? undefined : readLambdaWebAddress(webEndpoint);
  const profile = address ? 'lambda-web' : 'server';
  if (address) {
    await loadLambdaWebSecrets();
  }

  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule.forProfile(profile));
  configureHttp(app, profile);

  if (address) {
    await app.listen(address.port, address.host);
  } else {
    await app.listen(app.get(ConfigService).get<number>('port') ?? 3001);
  }
}

void bootstrap().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.message : 'Memory service startup failed',
  );
  process.exitCode = 1;
});
