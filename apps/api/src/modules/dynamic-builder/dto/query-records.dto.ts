import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FilterOperator {
  EQ = 'eq',
  NE = 'ne',
  GT = 'gt',
  LT = 'lt',
  GTE = 'gte',
  LTE = 'lte',
  LIKE = 'like',
  IN = 'in',
  IS_NULL = 'isNull',
  IS_NOT_NULL = 'isNotNull',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class FilterCondition {
  @IsString()
  field: string;

  @IsEnum(FilterOperator)
  operator: FilterOperator;

  @IsOptional()
  value?: any;
}

export class SortCondition {
  @IsString()
  field: string;

  @IsEnum(SortOrder)
  order: SortOrder;
}

export class QueryRecordsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterCondition)
  filters?: FilterCondition[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortCondition)
  sort?: SortCondition[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}
