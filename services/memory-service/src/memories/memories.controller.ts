import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@second-memory/shared-types';
import { FirebaseAuthGuard, ReqContext } from '@second-memory/nest-auth';
import { CreateMemoryDto, ListMemoriesQueryDto } from './dto/memory.dto';
import { MemoriesService } from './memories.service';

@ApiTags('memories')
@ApiBearerAuth('firebase')
@Controller('v1/memories')
@UseGuards(FirebaseAuthGuard)
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create memory' })
  create(@ReqContext() context: RequestContext, @Body() body: CreateMemoryDto) {
    return this.memoriesService.createMemory(context, body);
  }

  @Get()
  @ApiOperation({ summary: 'List memories' })
  list(@ReqContext() context: RequestContext, @Query() query: ListMemoriesQueryDto) {
    return this.memoriesService.listMemories(context, query);
  }
}
