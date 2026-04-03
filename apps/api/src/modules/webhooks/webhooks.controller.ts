import { Controller, Get, Post, Body, UseGuards, Logger, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  async createWebhook(
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return this.webhooksService.createWebhook(user.tenant_id, user.id, dto);
  }

  @Get()
  async getWebhooks(@CurrentUser() user: any) {
    return this.webhooksService.getWebhooks(user.tenant_id);
  }

  @Delete(':id')
  async deleteWebhook(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.webhooksService.deleteWebhook(user.tenant_id, id);
  }
}
