import {
  IsUUID,
  IsEnum,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IntercompanyStatus } from '@libs/database';

export class QueryIntercompanyDto {
  @ApiPropertyOptional({ description: 'Filter by the counterpart tenant UUID' })
  @IsUUID()
  @IsOptional()
  targetTenantId?: string;

  @ApiPropertyOptional({ description: 'Filter by transaction status', enum: IntercompanyStatus })
  @IsEnum(IntercompanyStatus)
  @IsOptional()
  status?: IntercompanyStatus;

  @ApiPropertyOptional({ description: 'Inclusive start date (ISO 8601)', example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Inclusive end date (ISO 8601)', example: '2026-03-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of records per page', default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
