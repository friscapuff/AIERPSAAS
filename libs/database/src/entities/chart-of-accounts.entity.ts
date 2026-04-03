import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

@Entity('chart_of_accounts')
@Index(['tenantId', 'accountNumber'], { unique: true })
export class ChartOfAccounts {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', length: 50 })
  accountNumber: string;

  @Column({ type: 'varchar', length: 255 })
  accountName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  accountType: string; // asset, liability, equity, revenue, expense

  @Column({ type: 'varchar', length: 50, nullable: true })
  normalBalance: string; // debit or credit

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', name: 'parent_account_id', nullable: true })
  parentAccountId: string;

  @CreateDateColumn()
  createdAt: Date;
}
