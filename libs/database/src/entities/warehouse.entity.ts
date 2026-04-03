import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('varchar')
  name: string;

  @Column('varchar')
  location: string;

  @Column('integer')
  capacity: number;

  @Column('boolean', { default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
