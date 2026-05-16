import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ImpactType {
  // Financial
  GL_POSTING = 'GL_POSTING',
  BUDGET_IMPACT = 'BUDGET_IMPACT',
  COST_UPDATE = 'COST_UPDATE',
  COMMISSION_CALC = 'COMMISSION_CALC',
  INTERCOMPANY = 'INTERCOMPANY',

  // Inventory & Supply Chain
  INVENTORY_MOVEMENT = 'INVENTORY_MOVEMENT',
  STOCK_PLANNING = 'STOCK_PLANNING',

  // CRM & Customer
  CRM_LOG = 'CRM_LOG',

  // Data Operations
  RECORD_CREATE = 'RECORD_CREATE',
  FIELD_UPDATE = 'FIELD_UPDATE',

  // Workflow & Notifications
  NOTIFICATION = 'NOTIFICATION',
  WEBHOOK = 'WEBHOOK',
  APPROVAL_TRIGGER = 'APPROVAL_TRIGGER',

  // Analytics
  ANALYTICS_EVENT = 'ANALYTICS_EVENT',
}

export enum ExecutionMode {
  SEQUENTIAL = 'SEQUENTIAL',
  PARALLEL = 'PARALLEL',
  TRANSACTIONAL = 'TRANSACTIONAL',
}

// ===== CONFIG INTERFACES =====

export interface GlPostingEntry {
  accountCodeField?: string;
  accountCodeFixed?: string;
  debitField?: string;
  creditField?: string;
  debitFixed?: number;
  creditFixed?: number;
  descriptionTemplate?: string;
}

export interface GlPostingConfig {
  entries: GlPostingEntry[];
  journalType?: string;
}

export interface InventoryMovementConfig {
  itemField: string;
  warehouseField: string;
  quantityField: string;
  unitCostField?: string;
  movementType: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT';
  targetWarehouseField?: string;
}

export interface BudgetImpactConfig {
  budgetCodeField?: string;
  budgetCodeFixed?: string;
  amountField: string;
  impactDirection: 'CONSUME' | 'RELEASE' | 'RESERVE';
  periodField?: string;
  costCenterField?: string;
}

export interface StockPlanningConfig {
  itemField: string;
  warehouseField?: string;
  checkReorderPoint: boolean;
  autoCreatePurchaseReq: boolean;
  reorderQuantityField?: string;
  preferredSupplierField?: string;
  leadTimeDays?: number;
}

export interface CommissionCalcConfig {
  salesPersonField: string;
  revenueField: string;
  commissionRate?: number;
  commissionRateField?: string;
  tierTable?: string;
  outputTable?: string;
}

export interface IntercompanyConfig {
  sourceEntityField?: string;
  targetEntityField?: string;
  amountField: string;
  dueToAccount: string;
  dueFromAccount: string;
  descriptionTemplate?: string;
}

export interface CostUpdateConfig {
  itemField: string;
  costMethod: 'FIFO' | 'WEIGHTED_AVG' | 'LIFO' | 'STANDARD';
  quantityField: string;
  unitCostField: string;
  updateSellingPrice?: boolean;
  markupPercentage?: number;
}

export interface NotificationConfig {
  channel: 'EMAIL' | 'IN_APP' | 'SMS' | 'PUSH' | 'ALL';
  recipientField?: string;
  recipientRoleFixed?: string;
  subjectTemplate: string;
  bodyTemplate: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface ApprovalTriggerConfig {
  targetStatus: string;
  approvalRuleId?: string;
  autoSubmit: boolean;
}

export interface AnalyticsEventConfig {
  eventName: string;
  category: string;
  dimensions: { name: string; sourceField: string }[];
  metrics: { name: string; sourceField: string; aggregation: 'SUM' | 'COUNT' | 'AVG' }[];
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
  retryCount?: number;
  timeoutMs?: number;
}

export interface FieldUpdateConfig {
  targetTable: string;
  targetRecordField: string;
  updates: { field: string; valueOrExpression: string }[];
}

export interface ConditionExpression {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'is_null' | 'is_not_null';
  value?: any;
  logic?: 'AND' | 'OR';
}

export type ImpactRuleConfig =
  | GlPostingConfig
  | InventoryMovementConfig
  | BudgetImpactConfig
  | StockPlanningConfig
  | CommissionCalcConfig
  | IntercompanyConfig
  | CostUpdateConfig
  | NotificationConfig
  | ApprovalTriggerConfig
  | AnalyticsEventConfig
  | CrmLogConfig
  | RecordCreateConfig
  | WebhookConfig
  | FieldUpdateConfig;

@Entity('impact_rules')
@Index(['tenantId', 'tableName'])
@Index(['tenantId', 'groupId'])
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

  @Column({ name: 'impact_type', type: 'varchar', length: 50 })
  impactType: string;

  @Column({ type: 'jsonb', default: '{}' })
  config: ImpactRuleConfig;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  priority: number;

  // ===== MULTI-IMPACT GROUPING =====

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null;

  @Column({ name: 'group_name', type: 'varchar', length: 255, nullable: true })
  groupName: string | null;

  @Column({ name: 'execution_mode', type: 'varchar', length: 50, default: 'SEQUENTIAL' })
  executionMode: string;

  @Column({ name: 'condition_expression', type: 'jsonb', nullable: true })
  conditionExpression: ConditionExpression[] | null;

  @Column({ name: 'rollback_on_failure', type: 'boolean', default: true })
  rollbackOnFailure: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
