import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  name: string;

  @Column('varchar', { unique: true })
  slug: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column('jsonb', { nullable: true })
  settings: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
