import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { TenantsService } from './tenants.service';

@ApiTags('Tenants')
@Controller('api/v1/tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('settings')
  getSettings(@CurrentTenant() tenantId: string) {
    return this.tenantsService.getSettings(tenantId);
  }

  @Post('settings')
  updateSettings(@Body() data: any, @CurrentTenant() tenantId: string) {
    return this.tenantsService.updateSettings(tenantId, data);
  }
}
