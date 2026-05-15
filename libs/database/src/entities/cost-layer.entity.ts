import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('cost_layers')
@Index(['tenant_id', 'item_id', 'warehouse_id'])
@Index(['layer_date'])
export class CostLayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  item_id: string;

  @Column('uuid')
  warehouse_id: string;

  @Column('decimal', { precision: 15, scale: 4 })
  remaining_quantity: number;

  @Column('decimal', { precision: 15, scale: 4 })
  unit_cost: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  layer_date: Date;

  @Column('uuid', { nullable: true })
  reference_log_id: string;

  @CreateDateColumn()
  created_at: Date;
}
