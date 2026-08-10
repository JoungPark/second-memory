import { EntryType } from '@second-memory/shared-types';
import {
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMemoryDto {
  @IsIn(['note', 'self_talk'])
  entryType!: 'note' | 'self_talk';

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}

export class CreateInternalMemoryDto {
  @IsIn(['conversation_summary'])
  entryType!: 'conversation_summary';

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceReferences?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}

export class ListMemoriesQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsIn(['note', 'self_talk', 'conversation_summary'])
  entryType?: EntryType;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  keyword?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  pageSize?: number;
}

export class SearchMemoriesDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  query!: string;

  @IsOptional()
  topK?: number;

  @IsOptional()
  filters?: {
    from?: string;
    to?: string;
    entryType?: EntryType;
  };
}
