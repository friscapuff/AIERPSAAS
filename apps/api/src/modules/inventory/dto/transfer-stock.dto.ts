import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferStockDto {
  @ApiProperty({ example: 'item-uuid', description: 'Item ID to transfer' })
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ example: 'warehouse-uuid', description: 'Source warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  fromWarehouseId: string;

  @ApiProperty({ example: 'warehouse-uuid', description: 'Destination warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  toWarehouseId: string;

  @ApiProperty({ example: 50, description: 'Quantity to transfer' })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ example: 'Stock redistribution', description: 'Transfer reason/notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
