import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export interface WorkflowCondition {
  field: string;
  operator: string;
  value: any;
}

export interface ApprovalLevel {
  level: number;
  approver_role_id: string;
  condition?: WorkflowCondition;
}

@Entity('workflows')
@Index(['tenant_id', 'trigger_doc_type'])
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant, { eager: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  trigger_doc_type: string;

  @Column({ type: 'jsonb', nullable: true })
  conditions: WorkflowCondition[];

  @Column({ type: 'jsonb' })
  approval_levels: ApprovalLevel[];

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
