import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Role } from './role.entity';

@Entity('users')
@Index(['tenant_id', 'email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { eager: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('varchar')
  email: string;

  @Column('varchar')
  password_hash: string;

  @Column('varchar')
  first_name: string;

  @Column('varchar')
  last_name: string;

  @Column('uuid', { nullable: true })
  role_id: string;

  @ManyToOne(() => Role, { eager: false, nullable: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column('timestamp', { nullable: true })
  last_login: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
