import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Tenant company name',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'A leading provider of solutions',
    description: 'Tenant description',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: 'https://example.com/logo.png',
    description: 'URL to tenant logo',
    required: false,
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;
}
