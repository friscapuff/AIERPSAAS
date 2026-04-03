import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FieldDefinitionDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  required?: boolean;

  @IsOptional()
  maxLength?: number;

  @IsOptional()
  precision?: number;

  @IsOptional()
  scale?: number;
}

export class CreateTableDto {
  @IsString()
  tableName: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefinitionDto)
  fields: FieldDefinitionDto[];
}
