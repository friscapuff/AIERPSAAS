import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from './tenant.entity';

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
  CONTRA_ASSET = 'CONTRA_ASSET',
  CONTRA_LIABILITY = 'CONTRA_LIABILITY',
  CONTRA_EQUITY = 'CONTRA_EQUITY',
}

@Entity('chart_of_accounts')
@Index(['tenant_id', 'code'], { unique: true })
@Index(['tenant_id', 'account_type'])
@Index(['tenant_id', 'parent_id'])
export class ChartOfAccounts {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { eager: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('varchar', { length: 20 })
  code: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  account_type: AccountType;

  @Column('uuid', { nullable: true })
  parent_id: string;

  @ManyToOne(() => ChartOfAccounts, { nullable: true, eager: false })
  @JoinColumn({ name: 'parent_id' })
  parent: ChartOfAccounts;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar', { length: 3, default: 'JOD' })
  currency: string;

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column('integer', { default: 0 })
  level: number;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  balance: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
