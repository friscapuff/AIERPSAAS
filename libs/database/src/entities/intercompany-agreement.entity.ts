import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from './tenant.entity';
import { ChartOfAccounts } from './chart-of-accounts.entity';

@Entity('intercompany_agreements')
@Index(['parent_tenant_id', 'is_active'])
export class IntercompanyAgreement {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) parent_tenant_id: string;
  @ManyToOne(() => Tenant, { eager: false }) @JoinColumn({ name: 'parent_tenant_id' }) parent_tenant: Tenant;
  @Column({ type: 'uuid', array: true }) child_tenant_ids: string[];
  @Column({ type: 'uuid' }) due_from_account_id: string;
  @ManyToOne(() => ChartOfAccounts, { eager: false }) @JoinColumn({ name: 'due_from_account_id' }) due_from_account: ChartOfAccounts;
  @Column({ type: 'uuid' }) due_to_account_id: string;
  @ManyToOne(() => ChartOfAccounts, { eager: false }) @JoinColumn({ name: 'due_to_account_id' }) due_to_account: ChartOfAccounts;
  @Column({ type: 'varchar', length: 3, default: 'USD' }) settlement_currency: string;
  @Column({ type: 'boolean', default: true }) auto_post: boolean;
  @Column({ type: 'boolean', default: true }) is_active: boolean;
  @Column({ type: 'uuid' }) created_by: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
