import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../../prisma/generated';

@Injectable()
export class IdentityPrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
