import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from './tenant.entity';
import { IntercompanyAgreement } from './intercompany-agreement.entity';

export enum IntercompanyStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

@Entity('intercompany_transactions')
@Index(['source_tenant_id', 'target_tenant_id', 'status'])
@Index(['source_tenant_id', 'created_at'])
@Index(['target_tenant_id', 'created_at'])
@Index(['agreement_id', 'status'])
export class IntercompanyTransaction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) source_tenant_id: string;
  @ManyToOne(() => Tenant, { eager: false }) @JoinColumn({ name: 'source_tenant_id' }) source_tenant: Tenant;
  @Column({ type: 'uuid' }) target_tenant_id: string;
  @ManyToOne(() => Tenant, { eager: false }) @JoinColumn({ name: 'target_tenant_id' }) target_tenant: Tenant;
  @Column({ type: 'uuid' }) agreement_id: string;
  @ManyToOne(() => IntercompanyAgreement, { eager: false }) @JoinColumn({ name: 'agreement_id' }) agreement: IntercompanyAgreement;
  @Column({ type: 'numeric', precision: 18, scale: 4 }) amount: string;
  @Column({ type: 'varchar', length: 3 }) currency: string;
  @Column({ type: 'numeric', precision: 18, scale: 6, default: 1 }) exchange_rate: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ type: 'varchar', length: 50, nullable: true }) source_doc_type: string;
  @Column({ type: 'uuid', nullable: true }) source_doc_id: string;
  @Column({ type: 'uuid', nullable: true }) source_journal_id: string;
  @Column({ type: 'uuid', nullable: true }) target_journal_id: string;
  @Column({ type: 'enum', enum: IntercompanyStatus, default: IntercompanyStatus.DRAFT }) status: IntercompanyStatus;
  @Column({ type: 'date', nullable: true }) settlement_date: Date;
  @Column({ type: 'text', nullable: true }) settlement_notes: string;
  @Column({ type: 'uuid' }) created_by: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
