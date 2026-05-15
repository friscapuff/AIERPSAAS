import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import {
  CreateItemDto,
  UpdateItemDto,
  CreateWarehouseDto,
  RecordMovementDto,
  TransferStockDto,
  QueryInventoryDto,
} from './dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create inventory item' })
  @ApiResponse({ status: 201, description: 'Item created successfully' })
  async createItem(@Body() createItemDto: CreateItemDto, @CurrentTenant() tenantId: string) {
    return this.inventoryService.createItem(tenantId, createItemDto);
  }

  @Get('items')
  @ApiOperation({ summary: 'List inventory items' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of items' })
  async listItems(@Query('includeInactive') includeInactive?: string, @CurrentTenant() tenantId?: string) {
    return this.inventoryService.listItems(tenantId, includeInactive === 'true');
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get item with current stock balance' })
  @ApiResponse({ status: 200, description: 'Item details with stock' })
  async getItem(@Param('id') itemId: string, @CurrentTenant() tenantId: string) {
    return this.inventoryService.getItem(tenantId, itemId);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update item details' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  async updateItem(@Param('id') itemId: string, @Body() updateItemDto: UpdateItemDto, @CurrentTenant() tenantId: string) {
    return this.inventoryService.updateItem(tenantId, itemId, updateItemDto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete item' })
  @ApiResponse({ status: 204, description: 'Item deleted' })
  async deleteItem(@Param('id') itemId: string, @CurrentTenant() tenantId: string) {
    await this.inventoryService.deleteItem(tenantId, itemId);
  }

  @Post('warehouses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created' })
  async createWarehouse(@Body() createWarehouseDto: CreateWarehouseDto, @CurrentTenant() tenantId: string) {
    return this.inventoryService.createWarehouse(tenantId, createWarehouseDto);
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'List warehouses' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of warehouses' })
  async listWarehouses(@Query('includeInactive') includeInactive?: string, @CurrentTenant() tenantId?: string) {
    return this.inventoryService.listWarehouses(tenantId, includeInactive === 'true');
  }

  @Put('warehouses/:id')
  @ApiOperation({ summary: 'Update warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated' })
  async updateWarehouse(@Param('id') warehouseId: string, @Body() updateDto: Partial<CreateWarehouseDto>, @CurrentTenant() tenantId: string) {
    return this.inventoryService.updateWarehouse(tenantId, warehouseId, updateDto);
  }

  @Post('movements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record inventory movement' })
  @ApiResponse({ status: 201, description: 'Movement recorded' })
  async recordMovement(@Body() recordMovementDto: RecordMovementDto, @CurrentTenant() tenantId: string) {
    return this.inventoryService.recordMovement(tenantId, recordMovementDto);
  }

  @Post('transfers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  @ApiResponse({ status: 201, description: 'Transfer completed' })
  async transferStock(@Body() transferStockDto: TransferStockDto, @CurrentTenant() tenantId: string) {
    return this.inventoryService.transferStock(tenantId, transferStockDto);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get movement history' })
  @ApiResponse({ status: 200, description: 'Movement history' })
  async getMovementHistory(@Query() queryDto: QueryInventoryDto, @CurrentTenant() tenantId?: string) {
    return this.inventoryService.getMovementHistory(tenantId, queryDto);
  }

  @Get('stock/:itemId')
  @ApiOperation({ summary: 'Get current stock balance for item' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiResponse({ status: 200, description: 'Stock balance data' })
  async getStockBalance(@Param('itemId') itemId: string, @Query('warehouseId') warehouseId?: string, @CurrentTenant() tenantId?: string) {
    return this.inventoryService.getStockBalance(tenantId, itemId, warehouseId);
  }

  @Get('valuation')
  @ApiOperation({ summary: 'Get full stock valuation report' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiResponse({ status: 200, description: 'Stock valuation report' })
  async getStockValuation(@Query('warehouseId') warehouseId?: string, @CurrentTenant() tenantId?: string) {
    return this.inventoryService.getStockValuation(tenantId, warehouseId);
  }

  @Get('alerts/low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  @ApiResponse({ status: 200, description: 'List of low stock alerts' })
  async getLowStockAlerts(@CurrentTenant() tenantId: string) {
    return this.inventoryService.getLowStockAlerts(tenantId);
  }
}
