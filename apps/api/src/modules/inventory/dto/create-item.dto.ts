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

  @ApiProperty({ example: 'PC', description: 'Unit of measure' })
  @IsString()
  @IsNotEmpty()
  unitOfMeasure: string;

  @ApiProperty({ enum: CostingMethod, description: 'Costing method' })
  @IsEnum(CostingMethod)
  @IsNotEmpty()
  costingMethod: CostingMethod;

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
}
