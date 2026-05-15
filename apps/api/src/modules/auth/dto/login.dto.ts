import { IsEmail, IsString, IsUUID, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@acme.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePass123',
    description: 'User password',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Tenant ID (UUID). Provide either tenantId or tenantSubdomain.',
  })
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({
    example: 'acme',
    description: 'Tenant subdomain. Provide either tenantId or tenantSubdomain.',
  })
  @IsString()
  @IsOptional()
  tenantSubdomain?: string;

  @ApiPropertyOptional({
    description: 'Remember me flag',
  })
  @IsOptional()
  rememberMe?: boolean;
}
