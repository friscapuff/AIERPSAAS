import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  Matches,
  MaxLength,
  ValidateNested,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FieldType {
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  DECIMAL = 'DECIMAL',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  LOOKUP = 'LOOKUP',
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
}

export class FieldDefinition {
  @ApiProperty({ description: 'Field name (alphanumeric + underscore)' })
  @IsString()
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
    message: 'Field name must start with letter or underscore and contain only alphanumeric characters and underscores',
  })
  @MaxLength(64)
  name: string;

  @ApiProperty({ enum: FieldType, description: 'Data type of the field' })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiPropertyOptional({ description: 'Whether this field is required' })
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional({ description: 'Default value for the field' })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({ description: 'Minimum length for STRING/TEXT fields' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minLength?: number;

  @ApiPropertyOptional({ description: 'Maximum length for STRING/TEXT fields' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxLength?: number;

  @ApiPropertyOptional({ description: 'Referenced table name for LOOKUP fields' })
  @IsOptional()
  @IsString()
  lookupTable?: string;

  @ApiPropertyOptional({ description: 'Field to use as lookup value in referenced table' })
  @IsOptional()
  @IsString()
  lookupField?: string;

  @ApiPropertyOptional({ description: 'Field to display from referenced table' })
  @IsOptional()
  @IsString()
  displayField?: string;
}

export class CreateTableDto {
  @ApiProperty({ description: 'Table name (alphanumeric + underscore, max 64 chars)' })
  @IsString()
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
    message: 'Table name must start with letter or underscore and contain only alphanumeric characters and underscores',
  })
  @MaxLength(64)
  tableName: string;

  @ApiProperty({ description: 'Display name for the table' })
  @IsString()
  @MaxLength(255)
  displayName: string;

  @ApiPropertyOptional({ description: 'Table description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [FieldDefinition], description: 'Array of field definitions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefinition)
  fields: FieldDefinition[];
}
