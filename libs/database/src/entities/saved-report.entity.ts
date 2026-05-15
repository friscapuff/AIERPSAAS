import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from './tenant.entity';

export enum ReportType {
  TRIAL_BALANCE = 'TRIAL_BALANCE',
  INCOME_STATEMENT = 'INCOME_STATEMENT',
  BALANCE_SHEET = 'BALANCE_SHEET',
  CASH_FLOW = 'CASH_FLOW',
  GL_DETAIL = 'GL_DETAIL',
  INVENTORY_VALUATION = 'INVENTORY_VALUATION',
  CUSTOM = 'CUSTOM',
}

export enum OutputFormat {
  JSON = 'JSON',
  EXCEL = 'EXCEL',
  PDF = 'PDF',
}

@Entity('saved_reports')
@Index(['tenant_id', 'report_type'])
@Index(['tenant_id', 'created_by'])
export class SavedReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @ManyToOne(() => Tenant, { eager: false }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ type: 'enum', enum: ReportType }) report_type: ReportType;
  @Column({ type: 'jsonb', default: {} }) query_config: Record<string, any>;
  @Column({ type: 'enum', enum: OutputFormat, default: OutputFormat.JSON }) output_format: OutputFormat;
  @Column({ type: 'jsonb', nullable: true }) schedule: Record<string, any> | null;
  @Column({ type: 'uuid' }) created_by: string;
  @Column({ type: 'timestamp', nullable: true }) last_run_at: Date | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
