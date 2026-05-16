import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ChartOfAccounts } from './chart-of-accounts.entity';

@Entity('gl_transactions')
@Index(['tenant_id', 'posting_date'])
@Index(['tenant_id', 'account_id'])
@Index(['tenant_id', 'journal_id'])
export class GLTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  posting_date: Date;

  @Column('uuid', { nullable: true })
  journal_id: string;

  @Column('varchar', { nullable: true })
  journal_entry_number: string;

  @Column('uuid')
  account_id: string;

  @ManyToOne(() => ChartOfAccounts, { eager: false })
  @JoinColumn({ name: 'account_id' })
  account: ChartOfAccounts;

  @Column('numeric', { precision: 18, scale: 4, default: 0 })
  debit: string;

  @Column('numeric', { precision: 18, scale: 4, default: 0 })
  credit: string;

  @Column('varchar', { length: 3, default: 'JOD' })
  currency: string;

  @Column('numeric', { precision: 12, scale: 6, default: 1 })
  exchange_rate: number;

  @Column({ nullable: true })
  description: string;

  @Column('varchar', { length: 50, nullable: true })
  source_doc_type: string;

  @Column('uuid', { nullable: true })
  source_doc_id: string;

  @Column('uuid', { nullable: true })
  period_id: string;

  @Column('uuid', { nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

// Alias for services that import as GlTransaction
export { GLTransaction as GlTransaction };
