import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@second-memory/shared-types';
import { InternalRequestContextGuard, ReqContext } from '@second-memory/nest-auth';
import { CreateInternalMemoryDto, SearchMemoriesDto } from './dto/memory.dto';
import { MemoriesService } from './memories.service';

@ApiTags('internal')
@ApiSecurity('x-tenant-id')
@ApiSecurity('x-user-id')
@Controller('internal/v1/memories')
@UseGuards(InternalRequestContextGuard)
export class InternalMemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create internal memory' })
  create(
    @ReqContext() context: RequestContext,
    @Body() body: CreateInternalMemoryDto,
  ) {
    return this.memoriesService.createInternalMemory(context, body);
  }

  @Post('search')
  @ApiOperation({ summary: 'Search memories (internal)' })
  search(@ReqContext() context: RequestContext, @Body() body: SearchMemoriesDto) {
    return this.memoriesService.searchMemories(context, body);
  }
}
