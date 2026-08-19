import { EntryType } from '@second-memory/shared-types';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class AskFiltersDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsIn(['note', 'self_talk', 'conversation_summary'])
  entryType?: EntryType;
}

export class AskMessageDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  topK?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => AskFiltersDto)
  filters?: AskFiltersDto;
}
