import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesOrder, SalesOrderStatus } from '@libs/database/entities/sales-order.entity';
import { SalesOrderLine } from '@libs/database/entities/sales-order-line.entity';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from './dto';

@Injectable()
export class SalesOrdersService {
  constructor(
    @InjectRepository(SalesOrder)
    private readonly salesOrderRepo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderLine)
    private readonly salesOrderLineRepo: Repository<SalesOrderLine>,
  ) {}

  async findAll(tenantId: string) {
    const orders = await this.salesOrderRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      orderDate: o.orderDate,
      status: o.status,
      totalAmount: o.totalAmount,
      currency: o.currency,
      createdAt: o.createdAt,
    }));
  }

  async findOne(tenantId: string, id: string) {
    const order = await this.salesOrderRepo.findOne({
      where: { id, tenantId },
      relations: ['lines'],
    });
    if (!order) throw new NotFoundException('Sales order not found');
    return order;
  }

  async create(tenantId: string, userId: string, dto: CreateSalesOrderDto) {
    const customerName = dto.customerName || dto.customer_name;
    if (!customerName) {
      throw new BadRequestException('Customer name is required');
    }

    const orderNumber = await this.generateOrderNumber(tenantId);
    const orderDate = dto.orderDate || dto.order_date || new Date().toISOString();

    const lines = (dto.lines || []).map((l) => {
      const qty = l.quantity || 0;
      const price = l.unitPrice ?? l.unit_price ?? 0;
      const discPct = l.discountPercent ?? l.discount_percent ?? 0;
      const taxPct = l.taxPercent ?? l.tax_percent ?? 0;
      const lineSubtotal = qty * price;
      const discountAmt = lineSubtotal * (discPct / 100);
      const afterDiscount = lineSubtotal - discountAmt;
      const taxAmt = afterDiscount * (taxPct / 100);
      const lineTotal = afterDiscount + taxAmt;

      return this.salesOrderLineRepo.create({
        tenantId,
        itemId: l.itemId || l.item_id,
        itemCode: l.itemCode || l.item_code,
        itemName: l.itemName || l.item_name,
        quantity: qty,
        unitPrice: price,
        discountPercent: discPct,
        taxPercent: taxPct,
        lineTotal,
        deliveredQuantity: 0,
        unitOfMeasure: l.unitOfMeasure || l.unit_of_measure || 'PCS',
        notes: l.notes,
      });
    });

    const subtotal = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);
    const taxAmount = lines.reduce((sum, l) => {
      const base = Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discountPercent) / 100);
      return sum + base * (Number(l.taxPercent) / 100);
    }, 0);
    const discountAmount = lines.reduce((sum, l) => {
      return sum + Number(l.quantity) * Number(l.unitPrice) * (Number(l.discountPercent) / 100);
    }, 0);
    const totalAmount = subtotal;

    const order = this.salesOrderRepo.create({
      tenantId,
      orderNumber,
      customerName,
      customerId: dto.customerId || dto.customer_id || null,
      orderDate: new Date(orderDate),
      expectedDeliveryDate: (dto.expectedDeliveryDate || dto.expected_delivery_date)
        ? new Date(dto.expectedDeliveryDate || dto.expected_delivery_date)
        : null,
      status: SalesOrderStatus.DRAFT,
      currency: dto.currency || 'JOD',
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      notes: dto.notes || null,
      warehouseId: dto.warehouseId || dto.warehouse_id || null,
      createdBy: userId,
      lines,
    });

    return this.salesOrderRepo.save(order);
  }

  async update(tenantId: string, id: string, dto: UpdateSalesOrderDto) {
    const order = await this.findOne(tenantId, id);
    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException('Can only update orders in DRAFT status');
    }

    if (dto.customerName || dto.customer_name) {
      order.customerName = dto.customerName || dto.customer_name;
    }
    if (dto.customerId || dto.customer_id) {
      order.customerId = dto.customerId || dto.customer_id;
    }
    if (dto.expectedDeliveryDate || dto.expected_delivery_date) {
      order.expectedDeliveryDate = new Date(dto.expectedDeliveryDate || dto.expected_delivery_date);
    }
    if (dto.currency) order.currency = dto.currency;
    if (dto.notes !== undefined) order.notes = dto.notes;
    if (dto.warehouseId || dto.warehouse_id) {
      order.warehouseId = dto.warehouseId || dto.warehouse_id;
    }

    if (dto.lines) {
      await this.salesOrderLineRepo.delete({ salesOrderId: id, tenantId });
      const lines = dto.lines.map((l) => {
        const qty = l.quantity || 0;
        const price = l.unitPrice ?? l.unit_price ?? 0;
        const discPct = l.discountPercent ?? l.discount_percent ?? 0;
        const taxPct = l.taxPercent ?? l.tax_percent ?? 0;
        const lineSubtotal = qty * price;
        const discountAmt = lineSubtotal * (discPct / 100);
        const afterDiscount = lineSubtotal - discountAmt;
        const taxAmt = afterDiscount * (taxPct / 100);
        const lineTotal = afterDiscount + taxAmt;

        return this.salesOrderLineRepo.create({
          tenantId,
          salesOrderId: id,
          itemId: l.itemId || l.item_id,
          itemCode: l.itemCode || l.item_code,
          itemName: l.itemName || l.item_name,
          quantity: qty,
          unitPrice: price,
          discountPercent: discPct,
          taxPercent: taxPct,
          lineTotal,
          deliveredQuantity: 0,
          unitOfMeasure: l.unitOfMeasure || l.unit_of_measure || 'PCS',
          notes: l.notes,
        });
      });

      order.lines = await this.salesOrderLineRepo.save(lines);
      order.subtotal = lines.reduce((s, l) => s + Number(l.lineTotal), 0);
      order.taxAmount = lines.reduce((s, l) => {
        const base = Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discountPercent) / 100);
        return s + base * (Number(l.taxPercent) / 100);
      }, 0);
      order.discountAmount = lines.reduce((s, l) => {
        return s + Number(l.quantity) * Number(l.unitPrice) * (Number(l.discountPercent) / 100);
      }, 0);
      order.totalAmount = order.subtotal;
    }

    return this.salesOrderRepo.save(order);
  }

  async confirm(tenantId: string, id: string, userId: string) {
    const order = await this.findOne(tenantId, id);
    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException('Can only confirm orders in DRAFT status');
    }
    if (!order.lines || order.lines.length === 0) {
      throw new BadRequestException('Cannot confirm order with no lines');
    }
    order.status = SalesOrderStatus.CONFIRMED;
    order.approvedBy = userId;
    order.approvedAt = new Date();
    return this.salesOrderRepo.save(order);
  }

  async deliver(tenantId: string, id: string) {
    const order = await this.findOne(tenantId, id);
    if (order.status !== SalesOrderStatus.CONFIRMED) {
      throw new BadRequestException('Can only deliver orders in CONFIRMED status');
    }
    order.status = SalesOrderStatus.DELIVERING;
    return this.salesOrderRepo.save(order);
  }

  async invoice(tenantId: string, id: string) {
    const order = await this.findOne(tenantId, id);
    if (order.status !== SalesOrderStatus.DELIVERING) {
      throw new BadRequestException('Can only invoice orders in DELIVERING status');
    }
    order.status = SalesOrderStatus.INVOICED;
    return this.salesOrderRepo.save(order);
  }

  async close(tenantId: string, id: string) {
    const order = await this.findOne(tenantId, id);
    if (order.status !== SalesOrderStatus.INVOICED) {
      throw new BadRequestException('Can only close orders in INVOICED status');
    }
    order.status = SalesOrderStatus.CLOSED;
    return this.salesOrderRepo.save(order);
  }

  async cancel(tenantId: string, id: string, reason?: string) {
    const order = await this.findOne(tenantId, id);
    const cancellable = [SalesOrderStatus.DRAFT, SalesOrderStatus.CONFIRMED];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException('Can only cancel orders in DRAFT or CONFIRMED status');
    }
    order.status = SalesOrderStatus.CANCELLED;
    if (reason) order.notes = `${order.notes || ''}\nCancellation reason: ${reason}`.trim();
    return this.salesOrderRepo.save(order);
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const lastOrder = await this.salesOrderRepo.findOne({
      where: { tenantId },
      order: { orderNumber: 'DESC' },
    });
    if (!lastOrder) return 'SO-00001';
    const lastNum = parseInt(lastOrder.orderNumber.replace('SO-', ''), 10);
    return `SO-${String(lastNum + 1).padStart(5, '0')}`;
  }
}
