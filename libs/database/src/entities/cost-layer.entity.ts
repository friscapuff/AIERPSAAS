import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('cost_layers')
export class CostLayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  product_id: string;

  @Column('decimal', { precision: 15, scale: 2 })
  unit_cost: number;

  @Column('integer')
  quantity: number;

  @Column('varchar')
  costing_method: string;

  @CreateDateColumn()
  created_at: Date;
}
