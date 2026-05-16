import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('companies')
@Index(['tenant_id', 'code'], { unique: true })
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('varchar', { length: 50 })
  code: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { nullable: true })
  legal_name: string;

  @Column('varchar', { nullable: true })
  tax_id: string;

  @Column('varchar', { nullable: true })
  registration_number: string;

  @Column('varchar', { nullable: true })
  currency: string;

  @Column('text', { nullable: true })
  address: string;

  @Column('varchar', { nullable: true })
  phone: string;

  @Column('varchar', { nullable: true })
  email: string;

  @Column('varchar', { nullable: true })
  website: string;

  @Column('varchar', { nullable: true })
  logo_url: string;

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column('jsonb', { nullable: true })
  settings: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
