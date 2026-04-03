import { Injectable } from '@nestjs/common';

interface Webhook {
  id: string;
  eventType: string;
  url: string;
  headers?: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class WebhooksService {
  private webhooks: Map<string, Webhook> = new Map();

  async getWebhooks() {
    return Array.from(this.webhooks.values());
  }

  async getWebhook(id: string) {
    return this.webhooks.get(id);
  }

  async createWebhook(createWebhookDto: any) {
    const id = Math.random().toString(36).substr(2, 9);
    const webhook: Webhook = {
      id,
      ...createWebhookDto,
      isActive: true,
      createdAt: new Date(),
    };
    this.webhooks.set(id, webhook);
    return webhook;
  }

  async updateWebhook(id: string, updateWebhookDto: any) {
    const webhook = this.webhooks.get(id);
    if (!webhook) return null;
    const updated = { ...webhook, ...updateWebhookDto };
    this.webhooks.set(id, updated);
    return updated;
  }

  async deleteWebhook(id: string) {
    this.webhooks.delete(id);
    return { id, deleted: true };
  }
}
