import { DynamicModule, Global, Injectable, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
class LazyPrismaService extends PrismaService {
  override async onModuleInit(): Promise<void> {
    // Prisma connects on its first query.
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {
  static withLazyConnection(): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: PrismaService, useClass: LazyPrismaService }],
    };
  }
}
