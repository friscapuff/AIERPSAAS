import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('financial_periods')
@Index(['tenantId', 'startDate', 'endDate'], { unique: true })
export class FinancialPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', length: 100 })
  periodName: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'open' })
  status: string; // open, closed, locked

  @CreateDateColumn()
  createdAt: Date;
}
