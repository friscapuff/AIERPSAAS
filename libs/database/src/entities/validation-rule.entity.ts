import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ValidationRuleType {
  FIELD = 'FIELD',
  CROSS_FIELD = 'CROSS_FIELD',
  EXPRESSION = 'EXPRESSION',
  UNIQUE_COMBO = 'UNIQUE_COMBO',
}

export enum ValidationAppliesOn {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  BOTH = 'BOTH',
}

export interface FieldValidationConfig {
  fieldName: string;
  operator: 'REQUIRED' | 'MIN' | 'MAX' | 'MIN_LENGTH' | 'MAX_LENGTH' | 'REGEX' | 'IN' | 'NOT_IN' | 'BETWEEN';
  value?: unknown;
  errorMessage: string;
}

export interface CrossFieldValidationConfig {
  fieldName: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'BEFORE_DATE' | 'AFTER_DATE';
  compareField: string;
  errorMessage: string;
}

export interface ExpressionValidationConfig {
  expression: string;
  errorMessage: string;
}

export interface UniqueComboValidationConfig {
  fields: string[];
  errorMessage: string;
}

export type ValidationRuleConfig =
  | FieldValidationConfig
  | CrossFieldValidationConfig
  | ExpressionValidationConfig
  | UniqueComboValidationConfig;

@Entity('validation_rules')
@Index(['tenantId', 'tableName'])
export class ValidationRule {
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

  @Column({ name: 'rule_type', type: 'enum', enum: ValidationRuleType })
  ruleType: ValidationRuleType;

  @Column({ type: 'jsonb', default: '{}' })
  config: ValidationRuleConfig;

  @Column({ name: 'applies_on', type: 'enum', enum: ValidationAppliesOn, default: ValidationAppliesOn.BOTH })
  appliesOn: ValidationAppliesOn;

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
