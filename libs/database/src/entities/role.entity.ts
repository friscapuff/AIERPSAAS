import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('roles')
@Index(['tenantId', 'roleName'], { unique: true })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', length: 100 })
  roleName: string;

  @Column({ type: 'jsonb', nullable: true })
  permissions: string[];

  @Column({ type: 'boolean', default: false })
  isSystemRole: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
