import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder, PurchaseOrderStatus } from '@libs/database/entities/purchase-order.entity';
import { PurchaseOrderLine } from '@libs/database/entities/purchase-order-line.entity';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly purchaseOrderLineRepo: Repository<PurchaseOrderLine>,
  ) {}

  async findAll(tenantId: string) {
    const orders = await this.purchaseOrderRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      supplierName: o.supplierName,
      orderDate: o.orderDate,
      status: o.status,
      totalAmount: o.totalAmount,
      currency: o.currency,
      createdAt: o.createdAt,
    }));
  }

  async findOne(tenantId: string, id: string) {
    const order = await this.purchaseOrderRepo.findOne({
      where: { id, tenantId },
      relations: ['lines'],
    });
    if (!order) throw new NotFoundException('Purchase order not found');
    return order;
  }

  async create(tenantId: string, userId: string, dto: CreatePurchaseOrderDto) {
    const supplierName = dto.supplierName || dto.supplier_name;
    if (!supplierName) {
      throw new BadRequestException('Supplier name is required');
    }

    const orderNumber = await this.generateOrderNumber(tenantId);
    const orderDate = dto.orderDate || dto.order_date || new Date().toISOString();
    const threshold = dto.approvalThreshold ?? dto.approval_threshold ?? 1000;

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

      return this.purchaseOrderLineRepo.create({
        tenantId,
        itemId: l.itemId || l.item_id,
        itemCode: l.itemCode || l.item_code,
        itemName: l.itemName || l.item_name,
        quantity: qty,
        unitPrice: price,
        discountPercent: discPct,
        taxPercent: taxPct,
        lineTotal,
        receivedQuantity: 0,
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

    const order = this.purchaseOrderRepo.create({
      tenantId,
      orderNumber,
      supplierName,
      supplierId: dto.supplierId || dto.supplier_id || null,
      orderDate: new Date(orderDate),
      expectedDeliveryDate: (dto.expectedDeliveryDate || dto.expected_delivery_date)
        ? new Date(dto.expectedDeliveryDate || dto.expected_delivery_date)
        : null,
      status: PurchaseOrderStatus.DRAFT,
      currency: dto.currency || 'JOD',
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      notes: dto.notes || null,
      warehouseId: dto.warehouseId || dto.warehouse_id || null,
      approvalThreshold: threshold,
      createdBy: userId,
      lines,
    });

    return this.purchaseOrderRepo.save(order);
  }

  async update(tenantId: string, id: string, dto: UpdatePurchaseOrderDto) {
    const order = await this.findOne(tenantId, id);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Can only update orders in DRAFT status');
    }

    if (dto.supplierName || dto.supplier_name) {
      order.supplierName = dto.supplierName || dto.supplier_name;
    }
    if (dto.supplierId || dto.supplier_id) {
      order.supplierId = dto.supplierId || dto.supplier_id;
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
      await this.purchaseOrderLineRepo.delete({ purchaseOrderId: id, tenantId });
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

        return this.purchaseOrderLineRepo.create({
          tenantId,
          purchaseOrderId: id,
          itemId: l.itemId || l.item_id,
          itemCode: l.itemCode || l.item_code,
          itemName: l.itemName || l.item_name,
          quantity: qty,
          unitPrice: price,
          discountPercent: discPct,
          taxPercent: taxPct,
          lineTotal,
          receivedQuantity: 0,
          unitOfMeasure: l.unitOfMeasure || l.unit_of_measure || 'PCS',
          notes: l.notes,
        });
      });

      order.lines = await this.purchaseOrderLineRepo.save(lines);
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

    return this.purchaseOrderRepo.save(order);
  }

  async confirm(tenantId: string, id: string, userId: string) {
    const order = await this.findOne(tenantId, id);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Can only confirm orders in DRAFT status');
    }
    if (!order.lines || order.lines.length === 0) {
      throw new BadRequestException('Cannot confirm order with no lines');
    }

    // If total exceeds threshold, go to PENDING_APPROVAL
    if (Number(order.totalAmount) > Number(order.approvalThreshold)) {
      order.status = PurchaseOrderStatus.PENDING_APPROVAL;
    } else {
      order.status = PurchaseOrderStatus.APPROVED;
      order.approvedBy = userId;
      order.approvedAt = new Date();
    }

    return this.purchaseOrderRepo.save(order);
  }

  async approve(tenantId: string, id: string, userId: string) {
    const order = await this.findOne(tenantId, id);
    if (order.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Can only approve orders in PENDING_APPROVAL status');
    }
    order.status = PurchaseOrderStatus.APPROVED;
    order.approvedBy = userId;
    order.approvedAt = new Date();
    return this.purchaseOrderRepo.save(order);
  }

  async receive(tenantId: string, id: string) {
    const order = await this.findOne(tenantId, id);
    const receivable = [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.PARTIALLY_RECEIVED];
    if (!receivable.includes(order.status)) {
      throw new BadRequestException('Can only receive orders in APPROVED or PARTIALLY_RECEIVED status');
    }
    order.status = PurchaseOrderStatus.RECEIVED;
    return this.purchaseOrderRepo.save(order);
  }

  async partialReceive(tenantId: string, id: string) {
    const order = await this.findOne(tenantId, id);
    if (order.status !== PurchaseOrderStatus.APPROVED) {
      throw new BadRequestException('Can only partially receive orders in APPROVED status');
    }
    order.status = PurchaseOrderStatus.PARTIALLY_RECEIVED;
    return this.purchaseOrderRepo.save(order);
  }

  async close(tenantId: string, id: string) {
    const order = await this.findOne(tenantId, id);
    if (order.status !== PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Can only close orders in RECEIVED status');
    }
    order.status = PurchaseOrderStatus.CLOSED;
    return this.purchaseOrderRepo.save(order);
  }

  async cancel(tenantId: string, id: string, reason?: string) {
    const order = await this.findOne(tenantId, id);
    const cancellable = [
      PurchaseOrderStatus.DRAFT,
      PurchaseOrderStatus.PENDING_APPROVAL,
      PurchaseOrderStatus.APPROVED,
    ];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException('Can only cancel orders in DRAFT, PENDING_APPROVAL, or APPROVED status');
    }
    order.status = PurchaseOrderStatus.CANCELLED;
    if (reason) order.notes = `${order.notes || ''}\nCancellation reason: ${reason}`.trim();
    return this.purchaseOrderRepo.save(order);
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const lastOrder = await this.purchaseOrderRepo.findOne({
      where: { tenantId },
      order: { orderNumber: 'DESC' },
    });
    if (!lastOrder) return 'PO-00001';
    const lastNum = parseInt(lastOrder.orderNumber.replace('PO-', ''), 10);
    return `PO-${String(lastNum + 1).padStart(5, '0')}`;
  }
}
