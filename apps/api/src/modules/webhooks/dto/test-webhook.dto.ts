import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';

export class TestWebhookDto {
  @ApiPropertyOptional({ description: 'Custom sample payload to send as the test body.' })
  @IsOptional() @IsObject()
  samplePayload?: Record<string, any>;
}
