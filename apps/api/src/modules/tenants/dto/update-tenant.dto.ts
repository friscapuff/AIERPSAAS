import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiProperty({ example: 'Acme Corporation Updated', description: 'Updated tenant company name', required: false })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiProperty({ example: 'Updated description', description: 'Updated tenant description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'https://example.com/logo-new.png', description: 'Updated URL to tenant logo', required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ example: 10, description: 'Maximum number of users allowed', required: false })
  @IsOptional()
  maxUsers?: number;
}
