import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ScreenType {
  FORM = 'FORM',
  LIST = 'LIST',
  FORM_LIST = 'FORM_LIST',
}

export enum ScreenStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface ScreenColumnConfig {
  fieldName: string;
  label: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
}

export interface ScreenFormField {
  fieldName: string;
  label: string;
  inputType: string;
  span?: number;
  readOnly?: boolean;
  placeholder?: string;
}

export interface ScreenFormSection {
  title: string;
  fields: ScreenFormField[];
}

export interface ScreenAction {
  label: string;
  action: 'create' | 'edit' | 'delete' | 'submit' | 'approve' | 'custom';
  icon?: string;
  variant?: string;
  showWhen?: string;
}

export interface ScreenLayout {
  columns: ScreenColumnConfig[];
  formSections: ScreenFormSection[];
  actions: ScreenAction[];
  headerFields: string[];
  defaultSort: { field: string; direction: 'ASC' | 'DESC' };
  pageSize: number;
}

@Entity('screen_definitions')
@Index(['tenantId', 'screenName'], { unique: true })
@Index(['tenantId', 'tableName'])
export class ScreenDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'table_name', type: 'varchar', length: 255 })
  tableName: string;

  @Column({ name: 'screen_name', type: 'varchar', length: 255 })
  screenName: string;

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'screen_type', type: 'enum', enum: ScreenType })
  screenType: ScreenType;

  @Column({ type: 'jsonb', default: '{}' })
  layout: ScreenLayout;

  @Column({ type: 'enum', enum: ScreenStatus, default: ScreenStatus.DRAFT })
  status: ScreenStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
