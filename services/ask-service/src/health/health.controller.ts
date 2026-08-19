import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@second-memory/server-db';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        service: 'ask-service',
        database: 'ok',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        service: 'ask-service',
        database: 'unavailable',
      });
    }
  }
}
