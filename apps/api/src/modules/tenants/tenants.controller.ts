import { Controller, Get, Post, Body, UseGuards, Logger, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantsService } from './tenants.service';

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantsController {
  private readonly logger = new Logger(TenantsController.name);

  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  async getTenants(@CurrentUser() user: any) {
    return this.tenantsService.getUserTenants(user.id);
  }

  @Get(':id')
  async getTenant(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.tenantsService.getTenant(user.id, id);
  }

  @Patch(':id')
  async updateTenant(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.tenantsService.updateTenant(user.id, id, dto);
  }
}
