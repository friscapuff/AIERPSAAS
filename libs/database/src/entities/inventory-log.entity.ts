import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('inventory_logs')
@Index(['tenantId'])
@Index(['createdAt'])
export class InventoryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'uuid', name: 'product_id', nullable: true })
  productId: string;

  @Column({ type: 'uuid', name: 'warehouse_id', nullable: true })
  warehouseId: string;

  @Column({ type: 'integer', nullable: true })
  quantity: number;

  @Column({ type: 'varchar', length: 50 })
  movementType: string; // in, out, adjustment

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceId: string;

  @CreateDateColumn()
  createdAt: Date;
}
