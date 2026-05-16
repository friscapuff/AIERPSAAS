import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('branches')
@Index(['tenant_id', 'company_id', 'code'], { unique: true })
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  company_id: string;

  @Column('varchar', { length: 50 })
  code: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { nullable: true })
  type: string; // 'headquarters' | 'branch' | 'warehouse' | 'sales_office'

  @Column('text', { nullable: true })
  address: string;

  @Column('varchar', { nullable: true })
  city: string;

  @Column('varchar', { nullable: true })
  country: string;

  @Column('varchar', { nullable: true })
  phone: string;

  @Column('varchar', { nullable: true })
  manager: string;

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column('jsonb', { nullable: true })
  settings: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
