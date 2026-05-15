import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Workflow } from './workflow.entity';

export enum WorkflowInstanceStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface ApprovalComment {
  userId: string;
  level: number;
  action: 'APPROVE' | 'REJECT';
  comment?: string;
  timestamp: Date;
}

@Entity('workflow_instances')
@Index(['tenant_id', 'workflow_id'])
@Index(['tenant_id', 'document_type', 'document_id'])
@Index(['tenant_id', 'current_status'])
@Index(['tenant_id', 'initiated_by'])
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @ManyToOne(() => Tenant, { eager: false }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ type: 'uuid', nullable: true }) workflow_id: string;
  @ManyToOne(() => Workflow, { eager: false, onDelete: 'SET NULL' }) @JoinColumn({ name: 'workflow_id' }) workflow: Workflow;
  @Column({ type: 'varchar', length: 100 }) document_type: string;
  @Column({ type: 'uuid' }) document_id: string;
  @Column({ type: 'enum', enum: WorkflowInstanceStatus, default: WorkflowInstanceStatus.DRAFT }) current_status: WorkflowInstanceStatus;
  @Column({ type: 'integer', default: 1 }) current_level: number;
  @Column({ type: 'uuid' }) initiated_by: string;
  @CreateDateColumn() initiated_at: Date;
  @Column({ type: 'timestamp', nullable: true }) completed_at: Date;
  @Column({ type: 'jsonb', default: [], comment: 'Array of approval comments and actions' }) comments: ApprovalComment[];
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
