import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RolePermissions, FieldRestriction } from '@libs/database';

export class CreateRoleDto {
  @ApiProperty({ example: 'Finance Manager', description: 'Role name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Role description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Module-level permissions' })
  @IsObject()
  permissions: RolePermissions;

  @ApiProperty({ description: 'Field-level restrictions', required: false })
  @IsObject()
  @IsOptional()
  fieldRestrictions?: FieldRestriction;
}
