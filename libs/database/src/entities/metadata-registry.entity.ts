import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export interface MetadataField {
  name: string;
  display_name?: string;
  type?: string;
  data_type?: string;
  required?: boolean;
  is_required?: boolean;
  is_unique?: boolean;
  default?: any;
  default_value?: any;
  max_length?: number;
  precision?: number;
  scale?: number;
  lookup_table?: string;
  lookupTable?: string;
  lookup_field?: string;
  lookupField?: string;
  description?: string;
}

@Entity('metadata_registry')
@Index(['tenant_id', 'table_name'], { unique: true })
export class MetadataRegistry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column()
  table_name: string;

  @Column()
  display_name: string;

  @Column({ nullable: true })
  description: string;

  @Column('jsonb')
  fields: MetadataField[];

  @Column('uuid')
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
