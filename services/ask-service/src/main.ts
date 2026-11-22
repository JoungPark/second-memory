import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const endpoint = process.env.AWS_LAMBDA_HTTP_ENDPOINT;
  let address: { host: string; port: number } | undefined;
  if (endpoint !== undefined) {
    const { readLambdaWebAddress, loadLambdaChatKey } =
      await import('./config/lambda-web');
    address = readLambdaWebAddress(endpoint);
    await loadLambdaChatKey();
  }
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule.forProfile(Boolean(address)));
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get<string[]>('cors.origins'),
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: address
      ? ['GET', 'POST', 'OPTIONS']
      : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ask Service')
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'firebase',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  if (address) {
    await app.listen(address.port, address.host);
  } else {
    await app.listen(configService.get<number>('port') ?? 3002);
  }
}

void bootstrap().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.message : 'Ask service startup failed',
  );
  process.exitCode = 1;
});
