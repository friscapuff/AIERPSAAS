import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalesOrder } from './sales-order.entity';

@Entity('sales_order_lines')
export class SalesOrderLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'sales_order_id', type: 'uuid' })
  salesOrderId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ name: 'item_code', type: 'varchar', length: 50 })
  itemCode: string;

  @Column({ name: 'item_name', type: 'varchar', length: 255 })
  itemName: string;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 4 })
  unitPrice: number;

  @Column({ name: 'discount_percent', type: 'numeric', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ name: 'tax_percent', type: 'numeric', precision: 5, scale: 2, default: 0 })
  taxPercent: number;

  @Column({ name: 'line_total', type: 'numeric', precision: 18, scale: 4 })
  lineTotal: number;

  @Column({ name: 'delivered_quantity', type: 'numeric', precision: 18, scale: 4, default: 0 })
  deliveredQuantity: number;

  @Column({ name: 'unit_of_measure', type: 'varchar', length: 20 })
  unitOfMeasure: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => SalesOrder, (order) => order.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: SalesOrder;
}
