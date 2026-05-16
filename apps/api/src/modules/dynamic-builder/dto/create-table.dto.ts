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
  IsBoolean,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Canonical field types stored in the database
export enum FieldType {
  STRING = 'STRING',
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  DECIMAL = 'DECIMAL',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  BOOLEAN = 'BOOLEAN',
  LOOKUP = 'LOOKUP',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  FILE = 'FILE',
  TEXTAREA = 'TEXTAREA',
  // Aliases accepted from the frontend (mapped to canonical values)
  NUMBER = 'NUMBER',
}

// Map frontend aliases to canonical types for storage
const FIELD_TYPE_ALIASES: Record<string, string> = {
  NUMBER: 'INTEGER',
};

export function normalizeFieldType(type: string): string {
  return FIELD_TYPE_ALIASES[type] || type;
}

export class FieldDefinition {
  @ApiProperty({ description: 'Field name (alphanumeric + underscore)' })
  @IsString()
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
    message: 'Field name must start with letter or underscore and contain only alphanumeric characters and underscores',
  })
  @MaxLength(64)
  name: string;

  @ApiPropertyOptional({ description: 'Display label for the field' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ enum: FieldType, description: 'Data type of the field' })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiPropertyOptional({ description: 'Whether this field is required' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ description: 'Whether this field must be unique' })
  @IsOptional()
  @IsBoolean()
  unique?: boolean;

  @ApiPropertyOptional({ description: 'Whether this field is indexed' })
  @IsOptional()
  @IsBoolean()
  indexed?: boolean;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  order?: number;

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
  // Accept both "name" (frontend) and "tableName" (original API)
  @ApiProperty({ description: 'Table name (alphanumeric + underscore, max 64 chars)' })
  @IsString()
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
    message: 'Table name must start with letter or underscore and contain only alphanumeric characters and underscores',
  })
  @MaxLength(64)
  name: string;

  // Accept both "label" (frontend) and "displayName" (original API)
  @ApiProperty({ description: 'Display name for the table' })
  @IsString()
  @MaxLength(255)
  label: string;

  @ApiPropertyOptional({ description: 'Table description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name for the table' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ type: [FieldDefinition], description: 'Array of field definitions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefinition)
  fields: FieldDefinition[];

  // Convenience getters for backward compatibility with the service
  get tableName(): string {
    return this.name;
  }

  get displayName(): string {
    return this.label;
  }
}
