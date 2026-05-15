import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  AED = 'AED',
  SAR = 'SAR',
  QAR = 'QAR',
  KWD = 'KWD',
  BHD = 'BHD',
  OMR = 'OMR',
  JOD = 'JOD',
}

export enum Timezone {
  UTC = 'UTC',
  EST = 'America/New_York',
  CST = 'America/Chicago',
  MST = 'America/Denver',
  PST = 'America/Los_Angeles',
  GST = 'Asia/Dubai',
  IST = 'Asia/Kolkata',
  SGT = 'Asia/Singapore',
}

export class TenantSettingsDto {
  @ApiProperty({
    enum: Currency,
    example: Currency.USD,
    description: 'Default currency for the tenant',
    required: false,
  })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiProperty({
    enum: Timezone,
    example: Timezone.UTC,
    description: 'Timezone for the tenant',
    required: false,
  })
  @IsEnum(Timezone)
  @IsOptional()
  timezone?: Timezone;

  @ApiProperty({
    example: '2024-01-01',
    description: 'Fiscal year start date (MM-DD format)',
    required: false,
  })
  @IsString()
  @IsOptional()
  fiscalYearStart?: string;

  @ApiProperty({
    example: 5,
    description: 'Number of decimal places for amounts',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  decimalPlaces?: number;

  @ApiProperty({
    example: true,
    description: 'Enable multi-level approval workflow',
    required: false,
  })
  @IsOptional()
  enableApprovalWorkflow?: boolean;

  @ApiProperty({
    example: true,
    description: 'Enable audit logging for all transactions',
    required: false,
  })
  @IsOptional()
  enableAuditLog?: boolean;
}
