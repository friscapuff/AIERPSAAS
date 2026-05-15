import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('dynamic_data')
@Index(['tenant_id', 'table_name'])
export class DynamicData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column()
  table_name: string;

  @Column('jsonb')
  data: Record<string, any>;

  @Column('uuid')
  created_by: string;

  @Column('uuid', { nullable: true })
  updated_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column('timestamp', { nullable: true })
  deleted_at: Date;
}

// Keep backward compat alias
export { DynamicData as DynamicDataEntity };
