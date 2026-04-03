import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('journal_entries')
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  debit_account_id: string;

  @Column('uuid')
  credit_account_id: string;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar')
  status: string;

  @CreateDateColumn()
  posted_date: Date;
}
