import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('varchar')
  module: string;

  @Column('varchar')
  action: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('boolean', { default: true })
  is_active: boolean;
}
