import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index(['tenant_id', 'created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  user_id: string;

  @Column('varchar')
  action: string;

  @Column('varchar')
  entity_type: string;

  @Column('uuid')
  entity_id: string;

  @Column('jsonb', { nullable: true })
  old_values: any;

  @Column('jsonb', { nullable: true })
  new_values: any;

  @CreateDateColumn()
  created_at: Date;
}
