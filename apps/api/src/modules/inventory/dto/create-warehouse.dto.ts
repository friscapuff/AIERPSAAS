import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'WH-001', description: 'Warehouse code (unique per tenant)' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Main Warehouse', description: 'Warehouse name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Warehouse address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: true, description: 'Mark as default warehouse' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
