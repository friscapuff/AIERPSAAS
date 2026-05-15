import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook, WebhookDelivery } from '@libs/database';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookEventService } from './webhook-event.service';

@Module({
  imports: [TypeOrmModule.forFeature([Webhook, WebhookDelivery])],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookEventService],
  exports: [WebhooksService, WebhookEventService],
})
export class WebhooksModule {}
