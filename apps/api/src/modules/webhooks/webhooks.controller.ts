import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CreateWebhookDto, UpdateWebhookDto, TestWebhookDto, QueryDeliveriesDto } from './dto';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a webhook', description: 'Register a new webhook endpoint for a specific event type.' })
  @ApiBody({ type: CreateWebhookDto })
  async createWebhook(@Body() dto: CreateWebhookDto, @CurrentTenant() tenantId: string) {
    return this.webhooksService.createWebhook(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all webhooks' })
  async listWebhooks(@CurrentTenant() tenantId: string) {
    return this.webhooksService.listWebhooks(tenantId);
  }

  @Get('events')
  @ApiOperation({ summary: 'List available event types' })
  listAvailableEvents() {
    return this.webhooksService.listAvailableEvents();
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'Query all webhook deliveries' })
  async queryAllDeliveries(@Query() query: QueryDeliveriesDto, @CurrentTenant() tenantId: string) {
    return this.webhooksService.getDeliveryHistory(tenantId, query);
  }

  @Get('deliveries/:deliveryId')
  @ApiOperation({ summary: 'Get delivery detail' })
  @ApiParam({ name: 'deliveryId', description: 'Delivery UUID' })
  async getDeliveryDetail(@Param('deliveryId', ParseUUIDPipe) deliveryId: string, @CurrentTenant() tenantId: string) {
    return this.webhooksService.getDeliveryDetail(tenantId, deliveryId);
  }

  @Post('deliveries/:deliveryId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually retry a failed delivery' })
  @ApiParam({ name: 'deliveryId', description: 'Delivery UUID' })
  async retryDelivery(@Param('deliveryId', ParseUUIDPipe) deliveryId: string, @CurrentTenant() tenantId: string) {
    return this.webhooksService.retryDelivery(tenantId, deliveryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  async getWebhook(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string) {
    return this.webhooksService.getWebhook(id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  @ApiBody({ type: UpdateWebhookDto })
  async updateWebhook(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWebhookDto, @CurrentTenant() tenantId: string) {
    return this.webhooksService.updateWebhook(id, tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  async deleteWebhook(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string) {
    return this.webhooksService.deleteWebhook(id, tenantId);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test delivery' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  @ApiBody({ type: TestWebhookDto, required: false })
  async testWebhook(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TestWebhookDto = {}, @CurrentTenant() tenantId: string) {
    return this.webhooksService.testWebhook(tenantId, id, dto);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get delivery history for a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  async getWebhookDeliveries(@Param('id', ParseUUIDPipe) id: string, @Query() query: QueryDeliveriesDto, @CurrentTenant() tenantId: string) {
    return this.webhooksService.getDeliveryHistory(tenantId, { ...query, webhookId: id });
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiParam({ name: 'id', description: 'Webhook UUID' })
  async getWebhookStats(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string) {
    return this.webhooksService.getWebhookStats(tenantId, id);
  }
}
