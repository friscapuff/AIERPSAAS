import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ApprovePurchaseOrderDto,
  ReceivePurchaseOrderDto,
  CancelPurchaseOrderDto,
} from './dto';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all purchase orders for tenant' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.purchaseOrdersService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order with lines' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseOrdersService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new purchase order' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.create(tenantId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a draft purchase order' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.update(tenantId, id, dto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a draft PO (auto-routes to PENDING_APPROVAL if > threshold)' })
  async confirm(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseOrdersService.confirm(tenantId, id, userId);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a pending purchase order' })
  async approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.approve(tenantId, id, userId);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Mark purchase order as fully received' })
  async receive(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.receive(tenantId, id);
  }

  @Post(':id/partial-receive')
  @ApiOperation({ summary: 'Mark purchase order as partially received' })
  async partialReceive(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseOrdersService.partialReceive(tenantId, id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a received purchase order' })
  async close(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseOrdersService.close(tenantId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a purchase order' })
  async cancel(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.cancel(tenantId, id, dto.reason);
  }
}
