import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { RequestContext } from '@second-memory/shared-types';
import { ReqContext } from '../common/context/request-context.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CreateMemoryDto, ListMemoriesQueryDto } from './dto/memory.dto';
import { MemoriesService } from './memories.service';

@Controller('v1/memories')
@UseGuards(FirebaseAuthGuard)
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  create(@ReqContext() context: RequestContext, @Body() body: CreateMemoryDto) {
    return this.memoriesService.createMemory(context, body);
  }

  @Get()
  list(@ReqContext() context: RequestContext, @Query() query: ListMemoriesQueryDto) {
    return this.memoriesService.listMemories(context, query);
  }
}
