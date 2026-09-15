import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@second-memory/server-db';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
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
