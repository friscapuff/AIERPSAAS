import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('metadata_registry')
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
  fields: Record<string, any>[];

  @Column('uuid')
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
