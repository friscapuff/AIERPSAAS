import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

interface CreateTenantDto {
  name: string;
  slug: string;
  description?: string;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
}

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  async getTenants() {
    return this.tenantsService.getTenants();
  }

  @Get(':id')
  async getTenant(@Param('id') id: string) {
    return this.tenantsService.getTenant(id);
  }

  @Post()
  async createTenant(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.createTenant(createTenantDto);
  }

  @Put(':id')
  async updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: Partial<CreateTenantDto>,
  ) {
    return this.tenantsService.updateTenant(id, updateTenantDto);
  }
}
