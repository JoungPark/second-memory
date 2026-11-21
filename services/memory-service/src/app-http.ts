import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { MemoryAppProfile } from './app.module';

export function configureHttp(
  app: INestApplication,
  profile: MemoryAppProfile,
): void {
  app.enableCors({
    origin: app.get(ConfigService).get<string[]>('cors.origins'),
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods:
      profile === 'lambda-web'
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
    .setTitle('Memory Service')
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'firebase',
    );
  if (profile === 'server') {
    swaggerConfig
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'x-tenant-id' },
        'x-tenant-id',
      )
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'x-user-id' },
        'x-user-id',
      );
  }
  const config = swaggerConfig.build();
  SwaggerModule.setup('docs', app, () =>
    SwaggerModule.createDocument(app, config),
  );
}
