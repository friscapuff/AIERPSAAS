import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('gl_transactions')
export class GLTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column()
  transaction_date: Date;

  @Column()
  journal_entry_number: string;

  @Column('uuid')
  account_id: string;

  @Column()
  debit: string;

  @Column()
  credit: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
