import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

interface CreateWebhookDto {
  eventType: string;
  url: string;
  headers?: Record<string, string>;
}

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  async getWebhooks() {
    return this.webhooksService.getWebhooks();
  }

  @Get(':id')
  async getWebhook(@Param('id') id: string) {
    return this.webhooksService.getWebhook(id);
  }

  @Post()
  async createWebhook(@Body() createWebhookDto: CreateWebhookDto) {
    return this.webhooksService.createWebhook(createWebhookDto);
  }

  @Put(':id')
  async updateWebhook(
    @Param('id') id: string,
    @Body() updateWebhookDto: Partial<CreateWebhookDto>,
  ) {
    return this.webhooksService.updateWebhook(id, updateWebhookDto);
  }

  @Delete(':id')
  async deleteWebhook(@Param('id') id: string) {
    return this.webhooksService.deleteWebhook(id);
  }
}
