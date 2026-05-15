import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('warehouses')
@Index(['tenant_id', 'code'], { unique: true })
export class Warehouse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('varchar', { length: 50 })
  code: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { nullable: true })
  location: string;

  @Column('text', { nullable: true })
  address: string;

  @Column('integer', { nullable: true })
  capacity: number;

  @Column('boolean', { default: false })
  is_default: boolean;

  @Column('boolean', { default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
