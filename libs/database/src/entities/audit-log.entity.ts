import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  POST = 'POST',
  VOID = 'VOID',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

@Entity('audit_logs')
@Index(['tenant_id', 'created_at'])
@Index(['tenant_id', 'entity_type', 'entity_id'])
@Index(['tenant_id', 'user_id'])
@Index(['tenant_id', 'action'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  user_id: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column('varchar')
  entity_type: string;

  @Column('uuid')
  entity_id: string;

  @Column('jsonb', { nullable: true })
  old_values: any;

  @Column('jsonb', { nullable: true })
  new_values: any;

  @Column('varchar', { nullable: true })
  ip_address: string;

  @Column('varchar', { nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;
}
