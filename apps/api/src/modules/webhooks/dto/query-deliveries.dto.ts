import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { WebhookEventType } from './create-webhook.dto';
import { WebhookDeliveryStatus } from '@libs/database';

export class QueryDeliveriesDto {
  @ApiPropertyOptional({ description: 'Filter by webhook ID' })
  @IsOptional() @IsString()
  webhookId?: string;

  @ApiPropertyOptional({ enum: WebhookEventType, description: 'Filter by event type' })
  @IsOptional() @IsEnum(WebhookEventType)
  eventType?: WebhookEventType;

  @ApiPropertyOptional({ enum: WebhookDeliveryStatus, description: 'Filter by delivery status' })
  @IsOptional() @IsEnum(WebhookDeliveryStatus)
  status?: WebhookDeliveryStatus;

  @ApiPropertyOptional({ description: 'Filter deliveries created on or after this date (ISO 8601)' })
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter deliveries created on or before this date (ISO 8601)' })
  @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Results per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  limit?: number = 20;
}
