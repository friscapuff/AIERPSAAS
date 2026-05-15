import { Injectable, Logger } from '@nestjs/common';
import { WebhooksService, DispatchSummary } from './webhooks.service';
import { WebhookEventType } from './dto';

@Injectable()
export class WebhookEventService {
  private readonly logger = new Logger(WebhookEventService.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  async emit(tenantId: string, eventType: WebhookEventType | string, payload: Record<string, any>): Promise<DispatchSummary> {
    try {
      const summary = await this.webhooksService.dispatchEvent(tenantId, eventType, payload);
      if (summary.webhooksNotified > 0) {
        this.logger.log(`Event [${eventType}] tenant=${tenantId} — notified ${summary.webhooksNotified} webhook(s), deliveryIds=[${summary.deliveryIds.join(', ')}]`);
      }
      return summary;
    } catch (err: any) {
      this.logger.error(`Failed to dispatch event [${eventType}] for tenant ${tenantId}: ${err?.message}`, err?.stack);
      return { webhooksNotified: 0, deliveryIds: [] };
    }
  }

  async emitInvoicePosted(tenantId: string, payload: Record<string, any>): Promise<DispatchSummary> { return this.emit(tenantId, WebhookEventType.INVOICE_POSTED, payload); }
  async emitPaymentReceived(tenantId: string, payload: Record<string, any>): Promise<DispatchSummary> { return this.emit(tenantId, WebhookEventType.PAYMENT_RECEIVED, payload); }
  async emitJournalCreated(tenantId: string, payload: Record<string, any>): Promise<DispatchSummary> { return this.emit(tenantId, WebhookEventType.JOURNAL_CREATED, payload); }
  async emitPeriodClosed(tenantId: string, payload: Record<string, any>): Promise<DispatchSummary> { return this.emit(tenantId, WebhookEventType.PERIOD_CLOSED, payload); }
  async emitInventoryMovement(tenantId: string, payload: Record<string, any>): Promise<DispatchSummary> { return this.emit(tenantId, WebhookEventType.INVENTORY_MOVEMENT, payload); }
  async emitDocumentApproved(tenantId: string, payload: Record<string, any>): Promise<DispatchSummary> { return this.emit(tenantId, WebhookEventType.DOCUMENT_APPROVED, payload); }
  async emitDocumentRejected(tenantId: string, payload: Record<string, any>): Promise<DispatchSummary> { return this.emit(tenantId, WebhookEventType.DOCUMENT_REJECTED, payload); }
  async emitCustom(tenantId: string, payload: Record<string, any>): Promise<DispatchSummary> { return this.emit(tenantId, WebhookEventType.CUSTOM, payload); }
}
