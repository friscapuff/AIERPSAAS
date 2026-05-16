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

  // ==================== ITEM ENDPOINTS ====================

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create inventory item' })
  @ApiResponse({ status: 201, description: 'Item created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Item code already exists' })
  async createItem(
    @Body() createItemDto: CreateItemDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.inventoryService.createItem(tenantId, createItemDto);
  }

  @Get('items')
  @ApiOperation({ summary: 'List inventory items with stock summary' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of items with computed stock data' })
  async listItems(
    @Query('includeInactive') includeInactive?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    const rawItems = await this.inventoryService.listItems(tenantId, includeInactive === 'true');

    // Enrich each item with computed stock data and map to frontend format
    const enrichedItems = await Promise.all(
      rawItems.map(async (item) => {
        const balance = await this.inventoryService.getStockBalance(tenantId, item.id);
        return {
          id: item.id,
          code: item.code,
          name: item.name,
          description: item.description || undefined,
          category: item.category || undefined,
          unit: item.unit_of_measure || 'PCS',
          costMethod: item.costing_method || 'WEIGHTED_AVG',
          reorderPoint: item.min_stock_level || 0,
          reorderQty: item.max_stock_level || 0,
          isActive: item.is_active !== false,
          totalStock: balance.total_quantity,
          averageCost: balance.average_cost,
          totalValue: balance.total_cost,
          stockLevels: [], // TODO: populate per-warehouse breakdown
        };
      }),
    );

    return enrichedItems;
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get item with current stock balance' })
  @ApiResponse({ status: 200, description: 'Item details with stock' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async getItem(
    @Param('id') itemId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.inventoryService.getItem(tenantId, itemId);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update item details' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiResponse({ status: 409, description: 'Item code already exists' })
  @ApiResponse({ status: 400, description: 'Cannot change costing method after movements' })
  async updateItem(
    @Param('id') itemId: string,
    @Body() updateItemDto: UpdateItemDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.inventoryService.updateItem(tenantId, itemId, updateItemDto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete item (mark inactive)' })
  @ApiResponse({ status: 204, description: 'Item deleted' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async deleteItem(
    @Param('id') itemId: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.inventoryService.deleteItem(tenantId, itemId);
  }

  // ==================== WAREHOUSE ENDPOINTS ====================

  @Post('warehouses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created' })
  @ApiResponse({ status: 409, description: 'Warehouse code already exists' })
  async createWarehouse(
    @Body() createWarehouseDto: CreateWarehouseDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.inventoryService.createWarehouse(tenantId, createWarehouseDto);
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'List warehouses' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of warehouses' })
  async listWarehouses(
    @Query('includeInactive') includeInactive?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    return this.inventoryService.listWarehouses(tenantId, includeInactive === 'true');
  }

  @Put('warehouses/:id')
  @ApiOperation({ summary: 'Update warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async updateWarehouse(
    @Param('id') warehouseId: string,
    @Body() updateDto: Partial<CreateWarehouseDto>,
    @CurrentTenant() tenantId: string,
  ) {
    return this.inventoryService.updateWarehouse(tenantId, warehouseId, updateDto);
  }

  // ==================== MOVEMENT ENDPOINTS ====================

  @Post('movements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record inventory movement' })
  @ApiResponse({ status: 201, description: 'Movement recorded' })
  @ApiResponse({ status: 400, description: 'Invalid movement (insufficient stock, missing cost, etc.)' })
  @ApiResponse({ status: 404, description: 'Item or warehouse not found' })
  async recordMovement(
    @Body() recordMovementDto: RecordMovementDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.inventoryService.recordMovement(tenantId, recordMovementDto);
  }

  @Post('transfers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  @ApiResponse({ status: 201, description: 'Transfer completed' })
  @ApiResponse({ status: 400, description: 'Invalid transfer (insufficient stock, same warehouse, etc.)' })
  @ApiResponse({ status: 404, description: 'Item or warehouse not found' })
  async transferStock(
    @Body() transferStockDto: TransferStockDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.inventoryService.transferStock(tenantId, transferStockDto);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get movement history with filters and pagination' })
  @ApiQuery({ name: 'itemId', required: false, description: 'Filter by item ID' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiQuery({ name: 'movementType', required: false, enum: ['IN', 'OUT', 'ADJUST', 'TRANSFER'] })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page' })
  @ApiResponse({ status: 200, description: 'Movement history' })
  async getMovementHistory(
    @Query() queryDto: QueryInventoryDto,
    @CurrentTenant() tenantId?: string,
  ) {
    queryDto.itemId = queryDto.itemId || undefined;
    queryDto.warehouseId = queryDto.warehouseId || undefined;
    return this.inventoryService.getMovementHistory(tenantId, queryDto);
  }

  // ==================== STOCK QUERY ENDPOINTS ====================

  @Get('stock/:itemId')
  @ApiOperation({
    summary: 'Get current stock balance for item (all warehouses or specific)',
  })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse' })
  @ApiResponse({ status: 200, description: 'Stock balance data' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async getStockBalance(
    @Param('itemId') itemId: string,
    @Query('warehouseId') warehouseId?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    return this.inventoryService.getStockBalance(tenantId, itemId, warehouseId);
  }

  @Get('valuation')
  @ApiOperation({ summary: 'Get stock valuation summary' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse' })
  @ApiResponse({ status: 200, description: 'Stock valuation summary' })
  async getStockValuation(
    @Query('warehouseId') warehouseId?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    const rawValuation = await this.inventoryService.getStockValuation(tenantId, warehouseId);

    // Aggregate into the frontend-expected ValuationSummary format
    let totalValue = 0;
    const itemIds = new Set<string>();
    const categoryMap: Record<string, { value: number; quantity: number }> = {};
    const warehouseMap: Record<string, { warehouseId: string; warehouseName: string; value: number }> = {};

    for (const row of rawValuation) {
      totalValue += row.total_cost;
      itemIds.add(row.item_id);

      // By category (use item_code prefix or 'Uncategorized')
      const cat = 'General'; // items don't have category in valuation query
      if (!categoryMap[cat]) categoryMap[cat] = { value: 0, quantity: 0 };
      categoryMap[cat].value += row.total_cost;
      categoryMap[cat].quantity += row.total_quantity;

      // By warehouse
      if (!warehouseMap[row.warehouse_id]) {
        warehouseMap[row.warehouse_id] = { warehouseId: row.warehouse_id, warehouseName: row.warehouse_code, value: 0 };
      }
      warehouseMap[row.warehouse_id].value += row.total_cost;
    }

    return {
      totalValue,
      totalItems: itemIds.size,
      byCategory: Object.entries(categoryMap).map(([category, v]) => ({ category, ...v })),
      byWarehouse: Object.values(warehouseMap),
    };
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock alerts for items below minimum level' })
  @ApiResponse({ status: 200, description: 'List of low stock alerts' })
  async getLowStockAlerts(@CurrentTenant() tenantId: string) {
    const alerts = await this.inventoryService.getLowStockAlerts(tenantId);
    // Map to frontend LowStockItem format
    return alerts.map((a) => ({
      itemId: a.item_id,
      itemCode: a.item_code,
      itemName: a.item_name,
      warehouseId: '',
      warehouseName: 'All',
      currentStock: a.current_qty,
      reorderPoint: a.min_stock_level,
      shortage: a.min_stock_level - a.current_qty,
    }));
  }

  // Keep the old route as alias
  @Get('alerts/low-stock')
  @ApiOperation({ summary: 'Get low stock alerts (alias)' })
  @ApiResponse({ status: 200, description: 'List of low stock alerts' })
  async getLowStockAlertsAlias(@CurrentTenant() tenantId: string) {
    return this.getLowStockAlerts(tenantId);
  }
}
