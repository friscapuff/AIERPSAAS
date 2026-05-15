import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
  ADJUST = 'ADJUST',
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
}

@Entity('inventory_logs')
@Index(['tenant_id', 'item_id', 'warehouse_id'])
@Index(['tenant_id', 'posting_date'])
@Index(['tenant_id', 'movement_type'])
export class InventoryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  item_id: string;

  @Column('uuid')
  warehouse_id: string;

  @Column('numeric', { precision: 15, scale: 4 })
  quantity: number;

  @Column('numeric', { precision: 15, scale: 4 })
  unit_cost: number;

  @Column('numeric', { precision: 18, scale: 4 })
  total_cost: number;

  @Column({ type: 'enum', enum: MovementType })
  movement_type: MovementType;

  @Column('varchar', { length: 20, nullable: true })
  costing_method: string;

  @Column('varchar', { length: 50, nullable: true })
  reference_doc_type: string;

  @Column('uuid', { nullable: true })
  reference_doc_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  posting_date: Date;

  @Column('uuid', { nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;
}
