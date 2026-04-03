import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@Controller('api/v1/inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products')
  getProducts(@CurrentTenant() tenantId: string) {
    return this.inventoryService.getProducts(tenantId);
  }

  @Post('products')
  createProduct(@Body() data: any, @CurrentTenant() tenantId: string) {
    return this.inventoryService.createProduct(tenantId, data);
  }

  @Get('warehouses')
  getWarehouses(@CurrentTenant() tenantId: string) {
    return this.inventoryService.getWarehouses(tenantId);
  }

  @Post('stock/adjust')
  adjustStock(@Body() data: any, @CurrentTenant() tenantId: string) {
    return this.inventoryService.adjustStock(tenantId, data);
  }
}
