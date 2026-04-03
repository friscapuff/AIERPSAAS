import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index(['tenant_id', 'created_at'])
@Index(['user_id'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid', { nullable: true })
  user_id: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  module: string;

  @Column({ nullable: true })
  entity_type: string;

  @Column('uuid', { nullable: true })
  entity_id: string;

  @Column('jsonb', { nullable: true })
  old_values: Record<string, any>;

  @Column('jsonb', { nullable: true })
  new_values: Record<string, any>;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ nullable: true })
  user_agent: string;

  @Column({ default: 'success' })
  status: string;

  @Column({ nullable: true })
  error_message: string;

  @CreateDateColumn()
  timestamp: Date;
}
