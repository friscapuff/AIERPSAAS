import {
  IsUUID,
  IsArray,
  IsString,
  IsBoolean,
  IsOptional,
  Length,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgreementDto {
  @ApiProperty({ description: 'UUID of the parent (holding/group) tenant' })
  @IsUUID()
  parentTenantId: string;

  @ApiProperty({ description: 'Array of subsidiary tenant UUIDs covered by this agreement', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  childTenantIds: string[];

  @ApiProperty({ description: 'COA account ID for Due-To (liability) — used in the TARGET tenant' })
  @IsUUID()
  dueToAccountId: string;

  @ApiProperty({ description: 'COA account ID for Due-From (asset/receivable) — used in the SOURCE tenant' })
  @IsUUID()
  dueFromAccountId: string;

  @ApiProperty({ description: 'ISO 4217 currency code for settlement', minLength: 3, maxLength: 3 })
  @IsString()
  @Length(3, 3)
  settlementCurrency: string;

  @ApiPropertyOptional({ description: 'When true, IC journal entries are immediately posted', default: true })
  @IsBoolean()
  @IsOptional()
  autoPost?: boolean;
}
