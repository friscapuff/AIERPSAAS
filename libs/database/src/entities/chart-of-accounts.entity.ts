import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('chart_of_accounts')
@Index(['tenant_id', 'account_number'])
export class ChartOfAccounts {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column()
  account_number: string;

  @Column()
  account_name: string;

  @Column()
  account_type: string;

  @Column({ nullable: true })
  description: string;

  @Column('numeric', { precision: 19, scale: 2, default: 0 })
  opening_balance: number;

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column()
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
