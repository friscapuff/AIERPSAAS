import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface ApprovalCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface ApprovalLevel {
  level: number;
  approver_role?: string;
  approver_user_id?: string;
  auto_approve_if?: string;
}

@Entity('approval_rules')
@Index(['tenantId', 'tableName'])
export class ApprovalRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'table_name', type: 'varchar', length: 255 })
  tableName: string;

  @Column({ name: 'rule_name', type: 'varchar', length: 255 })
  ruleName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'trigger_status', type: 'varchar', length: 100 })
  triggerStatus: string;

  @Column({ type: 'jsonb', default: '[]' })
  conditions: ApprovalCondition[];

  @Column({ name: 'approval_levels', type: 'jsonb', default: '[]' })
  approvalLevels: ApprovalLevel[];

  @Column({ name: 'target_approved_status', type: 'varchar', length: 100 })
  targetApprovedStatus: string;

  @Column({ name: 'target_rejected_status', type: 'varchar', length: 100 })
  targetRejectedStatus: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  priority: number;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
