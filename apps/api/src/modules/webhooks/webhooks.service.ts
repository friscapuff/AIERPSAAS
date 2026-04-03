import { Injectable } from '@nestjs/common';

@Injectable()
export class WebhooksService {
  async list() {
    return { webhooks: [] };
  }

  async register(data: any) {
    return { id: 'webhook-1', ...data };
  }
}
