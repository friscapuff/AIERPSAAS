import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('gl_transactions')
@Index(['accountId'])
@Index(['transactionDate'])
export class GLTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'date' })
  transactionDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  debitAmount: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  creditAmount: number;

  @Column({ type: 'uuid', name: 'account_id', nullable: true })
  accountId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceNumber: string;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
