import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export interface MetadataField {
  name: string;
  display_name: string;
  data_type: 'string' | 'integer' | 'decimal' | 'date' | 'boolean' | 'lookup' | 'jsonb';
  is_required: boolean;
  is_unique: boolean;
  default_value?: any;
  max_length?: number;
  precision?: number;
  scale?: number;
  lookupTable?: string;
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
