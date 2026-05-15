import { IsString, IsEnum, IsNotEmpty, IsOptional, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '@libs/database';

export class RecordMovementDto {
  @ApiProperty({ example: 'item-uuid', description: 'Item ID' })
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ example: 'warehouse-uuid', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 100, description: 'Quantity moved' })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ example: 50.5, description: 'Unit cost (required for IN movements)' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  unitCost?: number;

  @ApiProperty({
    enum: MovementType,
    example: 'IN',
    description: 'Type of movement: IN (receipt), OUT (issue), ADJUST (adjustment), TRANSFER (inter-warehouse)',
  })
  @IsEnum(MovementType)
  @IsNotEmpty()
  movementType: MovementType;

  @ApiPropertyOptional({
    example: 'PO',
    description: 'Reference document type (e.g., PO, SO, etc.)',
  })
  @IsString()
  @IsOptional()
  referenceDocType?: string;

  @ApiPropertyOptional({ example: 'ref-uuid', description: 'Reference document ID' })
  @IsString()
  @IsOptional()
  referenceDocId?: string;

  @ApiPropertyOptional({ example: 'Received from supplier ABC', description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
