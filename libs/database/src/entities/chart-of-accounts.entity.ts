import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chart_of_accounts')
export class ChartOfAccounts {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('varchar')
  account_number: string;

  @Column('varchar')
  account_name: string;

  @Column('varchar')
  account_type: string;

  @Column('decimal', { precision: 15, scale: 2 })
  balance: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
