import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export interface FieldRestriction {
  module: string;
  entity: string;
  field: string;
  hidden: boolean;
}

export interface RolePermissions {
  [module: string]: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
    post?: boolean;
    void?: boolean;
    [action: string]: boolean | undefined;
  };
}

@Entity('roles')
@Index(['tenant_id', 'name'], { unique: true })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('varchar')
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb', { default: {} })
  permissions: RolePermissions;

  @Column('jsonb', { default: [] })
  field_restrictions: FieldRestriction[];

  @Column('boolean', { default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
