import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FieldDefinition } from './create-table.dto';

export class UpdateTableDto {
  @ApiPropertyOptional({ description: 'Updated display name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Updated table description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: [FieldDefinition],
    description: 'Updated field definitions (add, modify, or remove fields)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefinition)
  fields?: FieldDefinition[];
}
