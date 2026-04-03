import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('inventory_logs')
@Index(['tenant_id', 'created_at'])
export class InventoryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column()
  item_id: string;

  @Column()
  movement_type: string;

  @Column('numeric', { precision: 10, scale: 2 })
  quantity: number;

  @Column({ nullable: true })
  reference: string;

  @Column()
  created_by: string;

  @CreateDateColumn()
  created_at: Date;
}
