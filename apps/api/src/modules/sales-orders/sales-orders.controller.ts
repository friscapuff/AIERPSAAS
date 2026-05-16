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
import { SalesOrdersService } from './sales-orders.service';
import {
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  ConfirmSalesOrderDto,
  DeliverSalesOrderDto,
  CancelSalesOrderDto,
} from './dto';

@ApiTags('Sales Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all sales orders for tenant' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.salesOrdersService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales order with lines' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesOrdersService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new sales order' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSalesOrderDto,
  ) {
    return this.salesOrdersService.create(tenantId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a draft sales order' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesOrderDto,
  ) {
    return this.salesOrdersService.update(tenantId, id, dto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a draft sales order' })
  async confirm(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmSalesOrderDto,
  ) {
    return this.salesOrdersService.confirm(tenantId, id, userId);
  }

  @Post(':id/deliver')
  @ApiOperation({ summary: 'Mark sales order as delivering' })
  async deliver(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeliverSalesOrderDto,
  ) {
    return this.salesOrdersService.deliver(tenantId, id);
  }

  @Post(':id/invoice')
  @ApiOperation({ summary: 'Mark sales order as invoiced' })
  async invoice(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesOrdersService.invoice(tenantId, id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close an invoiced sales order' })
  async close(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesOrdersService.close(tenantId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a sales order' })
  async cancel(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSalesOrderDto,
  ) {
    return this.salesOrdersService.cancel(tenantId, id, dto.reason);
  }
}
