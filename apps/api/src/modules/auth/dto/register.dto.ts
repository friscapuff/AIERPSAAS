import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'acme',
    description: 'Tenant subdomain (must be unique)',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain must contain only lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Tenant company name',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  tenantName: string;

  @ApiProperty({
    example: 'admin@acme.com',
    description: 'Admin user email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePass123',
    description: 'Password (minimum 8 chars, must include uppercase, lowercase, and number)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'First name of admin user',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of admin user',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;
}
