import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsBoolean,
  IsArray,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType, OutputFormat } from '@libs/database';

export class ScheduleConfigDto {
  @ApiProperty({ description: 'Cron expression (e.g. "0 8 * * 1" for every Monday at 8am)' })
  @IsString()
  @IsNotEmpty()
  cronExpression: string;

  @ApiPropertyOptional({ description: 'Email recipients for scheduled delivery' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  recipients?: string[];

  @ApiPropertyOptional({ description: 'Whether the schedule is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSavedReportDto {
  @ApiProperty({ description: 'Report name', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({
    description: 'Query configuration (filters, groupBy, dateRange, accountIds, etc.)',
    type: 'object',
  })
  @IsObject()
  queryConfig: Record<string, any>;

  @ApiPropertyOptional({ enum: OutputFormat, default: OutputFormat.JSON })
  @IsOptional()
  @IsEnum(OutputFormat)
  outputFormat?: OutputFormat;

  @ApiPropertyOptional({ description: 'Scheduling configuration', type: ScheduleConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleConfigDto)
  schedule?: ScheduleConfigDto;
}
