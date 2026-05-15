import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateIntercompanyTxDto {
  @ApiProperty({ description: 'UUID of the tenant receiving the charge/service (the debtor)' })
  @IsUUID()
  targetTenantId: string;

  @ApiProperty({ description: 'Transaction amount (must be > 0)', example: 1500.00 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'ISO 4217 currency code', example: 'USD', minLength: 3, maxLength: 3 })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiPropertyOptional({ description: 'Exchange rate from transaction currency to settlement currency', example: 1.085 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  @IsOptional()
  exchangeRate?: number;

  @ApiProperty({ description: 'Human-readable description of the intercompany charge', example: 'Management fee Q1 2026' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Source document type', example: 'INVOICE' })
  @IsString()
  @IsOptional()
  sourceDocType?: string;

  @ApiPropertyOptional({ description: 'UUID of the originating source document' })
  @IsUUID()
  @IsOptional()
  sourceDocId?: string;
}
