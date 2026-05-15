import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Webhook } from './webhook.entity';

export enum WebhookDeliveryStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

@Entity('webhook_deliveries')
@Index(['tenant_id', 'webhook_id', 'created_at'])
@Index(['tenant_id', 'status'])
@Index(['next_retry_at', 'status'])
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenant_id: string;
  @Column({ type: 'uuid' }) webhook_id: string;
  @ManyToOne(() => Webhook, { eager: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'webhook_id' }) webhook: Webhook;
  @Column({ type: 'varchar', length: 100 }) event_type: string;
  @Column({ type: 'jsonb' }) payload: Record<string, any>;
  @Column({ type: 'enum', enum: WebhookDeliveryStatus, default: WebhookDeliveryStatus.PENDING }) status: WebhookDeliveryStatus;
  @Column({ type: 'int', nullable: true }) response_status_code: number | null;
  @Column({ type: 'text', nullable: true }) response_body: string | null;
  @Column({ type: 'int', default: 0 }) attempt_number: number;
  @Column({ type: 'timestamp', nullable: true }) next_retry_at: Date | null;
  @Column({ type: 'text', nullable: true }) error_message: string | null;
  @Column({ type: 'int', nullable: true }) duration_ms: number | null;
  @CreateDateColumn() created_at: Date;
}
