import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from './tenant.entity';

export enum CostingMethod {
  FIFO = 'FIFO',
  WEIGHTED_AVG = 'WEIGHTED_AVG',
}

@Entity('items')
@Index(['tenant_id', 'code'], { unique: true })
@Index(['tenant_id', 'is_active'])
@Index(['category'])
export class Item {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @ManyToOne(() => Tenant, { eager: false }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ type: 'varchar', length: 50 }) code: string;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) category: string;
  @Column({ type: 'varchar', length: 20, default: 'PC' }) unit_of_measure: string;
  @Column({ type: 'enum', enum: CostingMethod, default: CostingMethod.FIFO }) costing_method: CostingMethod;
  @Column({ type: 'boolean', default: true }) is_active: boolean;
  @Column({ type: 'numeric', precision: 12, scale: 4, default: 0 }) min_stock_level: number;
  @Column({ type: 'numeric', precision: 12, scale: 4, default: 0 }) max_stock_level: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
