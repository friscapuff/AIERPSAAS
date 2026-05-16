import { IsString, IsEnum, IsNotEmpty, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CostingMethod } from '@libs/database';

export class CreateItemDto {
  @ApiProperty({ example: 'SKU-001', description: 'Item code (unique per tenant)' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Widget A', description: 'Item name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Item description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Electronics', description: 'Item category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'PC', description: 'Unit of measure' })
  @IsString()
  @IsOptional()
  unitOfMeasure?: string;

  @ApiPropertyOptional({ example: 'PC', description: 'Unit of measure (frontend alias)' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ enum: CostingMethod, description: 'Costing method' })
  @IsString()
  @IsOptional()
  costingMethod?: string;

  @ApiPropertyOptional({ description: 'Costing method (frontend alias)' })
  @IsString()
  @IsOptional()
  costMethod?: string;

  @ApiPropertyOptional({ example: 10, description: 'Minimum stock level for alerts' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  minStockLevel?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Maximum stock level' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  maxStockLevel?: number;

  @ApiPropertyOptional({ description: 'Reorder point (frontend alias for minStockLevel)' })
  @IsNumber()
  @IsOptional()
  reorderPoint?: number;

  @ApiPropertyOptional({ description: 'Reorder quantity (frontend alias for maxStockLevel)' })
  @IsNumber()
  @IsOptional()
  reorderQty?: number;
}
