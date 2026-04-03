import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from 'libs/database/src/entities/webhook.entity';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
  ) {}

  async createWebhook(tenantId: string, userId: string, dto: any) {
    const webhook = this.webhookRepository.create({
      ...dto,
      tenant_id: tenantId,
      created_by: userId,
    });

    return this.webhookRepository.save(webhook);
  }

  async getWebhooks(tenantId: string) {
    return this.webhookRepository.find({
      where: { tenant_id: tenantId },
    });
  }

  async deleteWebhook(tenantId: string, webhookId: string) {
    return this.webhookRepository.delete({
      id: webhookId,
      tenant_id: tenantId,
    });
  }

  async triggerWebhook(webhookId: string, payload: any) {
    const webhook = await this.webhookRepository.findOne({
      where: { id: webhookId },
    });

    if (!webhook) {
      this.logger.warn(`Webhook ${webhookId} not found`);
      return;
    }

    try {
      // TODO: Implement actual webhook triggering (HTTP request)
      this.logger.log(`Webhook ${webhookId} triggered with payload: ${JSON.stringify(payload)}`);
    } catch (error) {
      this.logger.error(`Failed to trigger webhook: ${error.message}`);
    }
  }
}
