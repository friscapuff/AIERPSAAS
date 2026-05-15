import { IsArray, IsUUID, IsDateString, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SettleTransactionDto {
  @ApiProperty({
    description: 'Array of intercompany transaction UUIDs to settle in one batch',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  transactionIds: string[];

  @ApiProperty({ description: 'ISO 8601 date string for the settlement date', example: '2026-05-15' })
  @IsDateString()
  settlementDate: string;

  @ApiPropertyOptional({ description: 'Optional notes to attach to the settlement batch' })
  @IsString()
  @IsOptional()
  notes?: string;
}
