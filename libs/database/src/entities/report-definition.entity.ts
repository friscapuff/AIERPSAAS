import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('report_definitions')
@Index(['tenantId', 'reportName'], { unique: true })
export class ReportDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'report_name', type: 'varchar', length: 255 })
  reportName: string;

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: 'DRAFT' })
  status: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
