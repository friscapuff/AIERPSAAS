import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ImpactType {
  GL_POSTING = 'GL_POSTING',
  INVENTORY_MOVEMENT = 'INVENTORY_MOVEMENT',
  CRM_LOG = 'CRM_LOG',
  RECORD_CREATE = 'RECORD_CREATE',
  WEBHOOK = 'WEBHOOK',
  FIELD_UPDATE = 'FIELD_UPDATE',
}

export interface GlPostingEntry {
  accountCodeField?: string;
  accountCodeFixed?: string;
  debitField?: string;
  creditField?: string;
  descriptionTemplate?: string;
}

export interface GlPostingConfig {
  entries: GlPostingEntry[];
}

export interface InventoryMovementConfig {
  itemField: string;
  warehouseField: string;
  quantityField: string;
  unitCostField: string;
  movementType: 'RECEIPT' | 'ISSUE';
}

export interface CrmLogConfig {
  customerField: string;
  descriptionTemplate: string;
  activityType: string;
}

export interface RecordCreateConfig {
  targetTable: string;
  fieldMapping: { targetField: string; sourceFieldOrValue: string }[];
}

export interface WebhookConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  bodyTemplate?: string;
}

export interface FieldUpdateConfig {
  targetTable: string;
  targetRecordField: string;
  updates: { field: string; valueOrExpression: string }[];
}

export type ImpactRuleConfig =
  | GlPostingConfig
  | InventoryMovementConfig
  | CrmLogConfig
  | RecordCreateConfig
  | WebhookConfig
  | FieldUpdateConfig;

@Entity('impact_rules')
@Index(['tenantId', 'tableName'])
export class ImpactRule {
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

  @Column({ name: 'impact_type', type: 'enum', enum: ImpactType })
  impactType: ImpactType;

  @Column({ type: 'jsonb', default: '{}' })
  config: ImpactRuleConfig;

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
