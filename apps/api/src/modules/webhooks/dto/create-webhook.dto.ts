import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsUrl, IsBoolean, IsOptional, IsString, IsObject, ValidateNested, IsNumber, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum WebhookEventType {
  INVOICE_POSTED = 'INVOICE_POSTED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  JOURNAL_CREATED = 'JOURNAL_CREATED',
  PERIOD_CLOSED = 'PERIOD_CLOSED',
  INVENTORY_MOVEMENT = 'INVENTORY_MOVEMENT',
  DOCUMENT_APPROVED = 'DOCUMENT_APPROVED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  CUSTOM = 'CUSTOM',
}

export class RetryPolicyDto {
  @ApiPropertyOptional({ description: 'Maximum number of retry attempts (default: 5)', minimum: 0, maximum: 10, example: 5 })
  @IsOptional() @IsNumber() @Min(0) @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({ description: 'Exponential backoff multiplier (default: 5)', minimum: 1, maximum: 20, example: 5 })
  @IsOptional() @IsNumber() @Min(1) @Max(20)
  backoffMultiplier?: number;
}

export class CreateWebhookDto {
  @ApiProperty({ enum: WebhookEventType, description: 'The event type that triggers this webhook', example: WebhookEventType.INVOICE_POSTED })
  @IsEnum(WebhookEventType)
  eventType: WebhookEventType;

  @ApiProperty({ description: 'Target URL to deliver webhook payloads to', example: 'https://your-app.example.com/webhooks/aierp' })
  @IsUrl({ protocols: ['http', 'https'], require_tld: false })
  targetUrl: string;

  @ApiPropertyOptional({ description: 'Custom HTTP headers to include in each delivery request' })
  @IsOptional() @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'HMAC-SHA256 secret for signature verification', example: 'whsec_my_super_secret_key' })
  @IsOptional() @IsString()
  secret?: string;

  @ApiPropertyOptional({ description: 'Whether the webhook is active', default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Retry policy configuration', type: RetryPolicyDto })
  @IsOptional() @ValidateNested() @Type(() => RetryPolicyDto)
  retryPolicy?: RetryPolicyDto;
}
