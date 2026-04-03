import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('varchar', { unique: true })
  sku: string;

  @Column('varchar')
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar')
  category: string;

  @Column('decimal', { precision: 10, scale: 2 })
  unit_cost: number;

  @Column('decimal', { precision: 10, scale: 2 })
  selling_price: number;

  @Column('boolean', { default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
