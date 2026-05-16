import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { SalesOrderLine } from './sales-order-line.entity';

export enum SalesOrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  DELIVERING = 'DELIVERING',
  INVOICED = 'INVOICED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

@Entity('sales_orders')
@Index(['tenantId', 'orderNumber'], { unique: true })
@Index(['tenantId'])
export class SalesOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'order_number', type: 'varchar', length: 20 })
  orderNumber: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 255 })
  customerName: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ name: 'order_date', type: 'timestamp' })
  orderDate: Date;

  @Column({ name: 'expected_delivery_date', type: 'timestamp', nullable: true })
  expectedDeliveryDate: Date | null;

  @Column({
    type: 'enum',
    enum: SalesOrderStatus,
    default: SalesOrderStatus.DRAFT,
  })
  status: SalesOrderStatus;

  @Column({ type: 'varchar', length: 3, default: 'JOD' })
  currency: string;

  @Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
  subtotal: number;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 18, scale: 4, default: 0 })
  taxAmount: number;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 18, scale: 4, default: 0 })
  discountAmount: number;

  @Column({ name: 'total_amount', type: 'numeric', precision: 18, scale: 4, default: 0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouseId: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SalesOrderLine, (line) => line.salesOrder, { cascade: true })
  lines: SalesOrderLine[];
}
