import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  list() {
    return this.webhooksService.list();
  }

  @Post()
  register(@Body() data: any) {
    return this.webhooksService.register(data);
  }
}
