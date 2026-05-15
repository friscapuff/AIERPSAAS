import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType, OutputFormat } from '@libs/database';

export enum ReportGroupBy {
  ACCOUNT = 'account',
  PERIOD = 'period',
  DEPARTMENT = 'department',
}

export class GenerateReportDto {
  @ApiProperty({ enum: ReportType, description: 'Type of report to generate' })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiPropertyOptional({ description: 'Financial period UUID (alternative to date range)' })
  @IsOptional()
  @IsUUID()
  periodId?: string;

  @ApiPropertyOptional({ description: 'Start date for date range filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for date range filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by specific account UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  accountIds?: string[];

  @ApiPropertyOptional({
    enum: OutputFormat,
    default: OutputFormat.JSON,
    description: 'Output format',
  })
  @IsOptional()
  @IsEnum(OutputFormat)
  format?: OutputFormat;

  @ApiPropertyOptional({
    enum: ReportGroupBy,
    description: 'Dimension to group results by',
  })
  @IsOptional()
  @IsEnum(ReportGroupBy)
  groupBy?: ReportGroupBy;

  @ApiPropertyOptional({ description: 'Warehouse UUID for inventory reports' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'As-of date for balance sheet (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @ApiPropertyOptional({ description: 'Pagination page (for GL detail)' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size (for GL detail)' })
  @IsOptional()
  limit?: number;
}
