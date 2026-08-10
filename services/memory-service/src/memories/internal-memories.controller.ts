import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { RequestContext } from '@second-memory/shared-types';
import { ReqContext } from '../common/context/request-context.decorator';
import { InternalRequestContextGuard } from '../common/guards/internal-request-context.guard';
import { CreateInternalMemoryDto, SearchMemoriesDto } from './dto/memory.dto';
import { MemoriesService } from './memories.service';

@Controller('internal/v1/memories')
@UseGuards(InternalRequestContextGuard)
export class InternalMemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  create(
    @ReqContext() context: RequestContext,
    @Body() body: CreateInternalMemoryDto,
  ) {
    return this.memoriesService.createInternalMemory(context, body);
  }

  @Post('search')
  search(@ReqContext() context: RequestContext, @Body() body: SearchMemoriesDto) {
    return this.memoriesService.searchMemories(context, body);
  }
}
