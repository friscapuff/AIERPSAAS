import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Webhook, WebhookDelivery, WebhookDeliveryStatus } from '@libs/database';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { CreateWebhookDto, UpdateWebhookDto, TestWebhookDto, QueryDeliveriesDto, WebhookEventType } from './dto';

export interface DispatchSummary { webhooksNotified: number; deliveryIds: string[]; }
export interface TestResult { success: boolean; statusCode: number | null; responseBody: string | null; durationMs: number; error?: string; }
export interface WebhookStats { webhookId: string; totalDeliveries: number; successCount: number; failedCount: number; retryingCount: number; successRate: number; avgResponseTimeMs: number | null; lastDeliveryAt: Date | null; lastDeliveryStatus: WebhookDeliveryStatus | null; }
export interface PaginatedResult<T> { data: T[]; total: number; page: number; limit: number; totalPages: number; }

const EVENT_CATALOGUE: Record<WebhookEventType, string> = {
  [WebhookEventType.INVOICE_POSTED]: 'Triggered when an invoice is posted / finalised',
  [WebhookEventType.PAYMENT_RECEIVED]: 'Triggered when a customer payment is received and applied',
  [WebhookEventType.JOURNAL_CREATED]: 'Triggered when a general ledger journal entry is created',
  [WebhookEventType.PERIOD_CLOSED]: 'Triggered when an accounting period is closed',
  [WebhookEventType.INVENTORY_MOVEMENT]: 'Triggered on any inventory movement (receipt, issue, transfer)',
  [WebhookEventType.DOCUMENT_APPROVED]: 'Triggered when a document completes the approval workflow',
  [WebhookEventType.DOCUMENT_REJECTED]: 'Triggered when a document is rejected in the approval workflow',
  [WebhookEventType.CUSTOM]: 'Custom event fired by tenant-specific automations',
};

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BACKOFF_MULTIPLIER = 5;
const BASE_DELAY_SECONDS = 60;

interface HttpResult { statusCode: number; body: string; durationMs: number; }

function httpPost(targetUrl: string, headers: Record<string, string>, body: string, timeoutMs = 10_000): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
    };
    const start = Date.now();
    const req = lib.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8').slice(0, 1000), durationMs: Date.now() - start }));
      res.on('error', reject);
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Request timed out after ${timeoutMs}ms`)));
    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Webhook) private readonly webhookRepo: Repository<Webhook>,
    @InjectRepository(WebhookDelivery) private readonly deliveryRepo: Repository<WebhookDelivery>,
  ) {}

  async listWebhooks(tenantId: string): Promise<Webhook[]> {
    return this.webhookRepo.find({ where: { tenant_id: tenantId }, order: { created_at: 'DESC' } });
  }

  async getWebhook(id: string, tenantId: string): Promise<Webhook> {
    const webhook = await this.webhookRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!webhook) throw new NotFoundException(`Webhook ${id} not found`);
    return webhook;
  }

  async createWebhook(tenantId: string, dto: CreateWebhookDto): Promise<Webhook> {
    const webhook = this.webhookRepo.create({
      tenant_id: tenantId,
      event_type: dto.eventType,
      target_url: dto.targetUrl,
      headers: dto.headers ?? null,
      secret: dto.secret ?? null,
      is_active: dto.isActive ?? true,
      retry_policy: dto.retryPolicy ? { max_retries: dto.retryPolicy.maxRetries ?? DEFAULT_MAX_RETRIES, backoff_multiplier: dto.retryPolicy.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER, initial_delay_ms: BASE_DELAY_SECONDS * 1000 } : null,
    });
    return this.webhookRepo.save(webhook);
  }

  async updateWebhook(id: string, tenantId: string, dto: UpdateWebhookDto): Promise<Webhook> {
    const webhook = await this.getWebhook(id, tenantId);
    if (dto.eventType !== undefined) webhook.event_type = dto.eventType;
    if (dto.targetUrl !== undefined) webhook.target_url = dto.targetUrl;
    if (dto.headers !== undefined) webhook.headers = dto.headers;
    if (dto.secret !== undefined) webhook.secret = dto.secret;
    if (dto.isActive !== undefined) webhook.is_active = dto.isActive;
    if (dto.retryPolicy !== undefined) webhook.retry_policy = { max_retries: dto.retryPolicy.maxRetries ?? DEFAULT_MAX_RETRIES, backoff_multiplier: dto.retryPolicy.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER, initial_delay_ms: BASE_DELAY_SECONDS * 1000 };
    return this.webhookRepo.save(webhook);
  }

  async deleteWebhook(id: string, tenantId: string): Promise<void> {
    const webhook = await this.getWebhook(id, tenantId);
    webhook.is_active = false;
    await this.webhookRepo.save(webhook);
  }

  listAvailableEvents(): Array<{ eventType: string; description: string }> {
    return Object.entries(EVENT_CATALOGUE).map(([eventType, description]) => ({ eventType, description }));
  }

  async dispatchEvent(tenantId: string, eventType: string, payload: Record<string, any>): Promise<DispatchSummary> {
    const webhooks = await this.webhookRepo.find({ where: { tenant_id: tenantId, event_type: eventType, is_active: true } });
    if (webhooks.length === 0) return { webhooksNotified: 0, deliveryIds: [] };
    const deliveryIds: string[] = [];
    for (const webhook of webhooks) {
      const delivery = this.deliveryRepo.create({ tenant_id: tenantId, webhook_id: webhook.id, event_type: eventType, payload, status: WebhookDeliveryStatus.PENDING, attempt_number: 0 });
      const saved = await this.deliveryRepo.save(delivery);
      deliveryIds.push(saved.id);
      this.deliverWebhook(saved.id).catch((err) => this.logger.error(`deliverWebhook(${saved.id}) threw: ${err?.message}`));
    }
    await this.webhookRepo.createQueryBuilder().update(Webhook).set({ last_triggered_at: new Date() }).where('tenant_id = :tenantId AND event_type = :eventType AND is_active = true', { tenantId, eventType }).execute();
    return { webhooksNotified: webhooks.length, deliveryIds };
  }

  async deliverWebhook(deliveryId: string): Promise<void> {
    const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId }, relations: ['webhook'] });
    if (!delivery) { this.logger.warn(`deliverWebhook: delivery ${deliveryId} not found`); return; }
    const webhook = await this.webhookRepo.createQueryBuilder('w').addSelect('w.secret').where('w.id = :id', { id: delivery.webhook_id }).getOne();
    if (!webhook) { this.logger.warn(`deliverWebhook: webhook ${delivery.webhook_id} not found`); return; }
    const timestamp = new Date().toISOString();
    const bodyStr = JSON.stringify({ event: delivery.event_type, timestamp, tenantId: delivery.tenant_id, deliveryId: delivery.id, data: delivery.payload });
    const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json', 'X-AiERP-Event': delivery.event_type, 'X-AiERP-Delivery': delivery.id, 'X-AiERP-Timestamp': timestamp, ...(webhook.headers ?? {}) };
    if (webhook.secret) { const hmac = crypto.createHmac('sha256', webhook.secret); hmac.update(bodyStr); requestHeaders['X-AiERP-Signature'] = `sha256=${hmac.digest('hex')}`; }
    delivery.attempt_number += 1;
    await this.deliveryRepo.save(delivery);
    let result: HttpResult | null = null;
    let errorMessage: string | null = null;
    try { result = await httpPost(webhook.target_url, requestHeaders, bodyStr, 10_000); } catch (err: any) { errorMessage = err?.message ?? String(err); }
    if (result && result.statusCode >= 200 && result.statusCode < 300) {
      delivery.status = WebhookDeliveryStatus.SUCCESS;
      delivery.response_status_code = result.statusCode;
      delivery.response_body = result.body;
      delivery.duration_ms = result.durationMs;
      delivery.error_message = null;
      delivery.next_retry_at = null;
      await this.deliveryRepo.save(delivery);
    } else {
      delivery.response_status_code = result?.statusCode ?? null;
      delivery.response_body = result?.body ?? null;
      delivery.duration_ms = result?.durationMs ?? null;
      delivery.error_message = errorMessage ?? `HTTP ${result?.statusCode}: non-2xx response`;
      await this.deliveryRepo.save(delivery);
      await this.scheduleRetry(deliveryId, webhook);
    }
  }

  private async scheduleRetry(deliveryId: string, webhook: Webhook): Promise<void> {
    const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!delivery) return;
    const maxRetries = webhook.retry_policy?.max_retries ?? DEFAULT_MAX_RETRIES;
    const backoffMultiplier = webhook.retry_policy?.backoff_multiplier ?? DEFAULT_BACKOFF_MULTIPLIER;
    if (delivery.attempt_number >= maxRetries) {
      delivery.status = WebhookDeliveryStatus.FAILED;
      delivery.next_retry_at = null;
      await this.deliveryRepo.save(delivery);
      return;
    }
    const delaySeconds = BASE_DELAY_SECONDS * Math.pow(backoffMultiplier, delivery.attempt_number);
    const nextRetry = new Date(Date.now() + delaySeconds * 1000);
    delivery.status = WebhookDeliveryStatus.RETRYING;
    delivery.next_retry_at = nextRetry;
    await this.deliveryRepo.save(delivery);
    setTimeout(() => this.deliverWebhook(deliveryId).catch((err) => this.logger.error(`Retry deliverWebhook(${deliveryId}): ${err?.message}`)), delaySeconds * 1000);
  }

  async testWebhook(tenantId: string, webhookId: string, dto: TestWebhookDto = {}): Promise<TestResult> {
    const webhook = await this.webhookRepo.createQueryBuilder('w').addSelect('w.secret').where('w.id = :id AND w.tenant_id = :tenantId', { id: webhookId, tenantId }).getOne();
    if (!webhook) throw new NotFoundException(`Webhook ${webhookId} not found`);
    const timestamp = new Date().toISOString();
    const testPayload = dto.samplePayload ?? { message: 'This is a test delivery from AiERP', tenantId, webhookId };
    const bodyStr = JSON.stringify({ event: webhook.event_type, timestamp, tenantId, deliveryId: 'test', data: testPayload });
    const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json', 'X-AiERP-Event': webhook.event_type, 'X-AiERP-Delivery': 'test', 'X-AiERP-Timestamp': timestamp, 'X-AiERP-Test': 'true', ...(webhook.headers ?? {}) };
    if (webhook.secret) { const hmac = crypto.createHmac('sha256', webhook.secret); hmac.update(bodyStr); requestHeaders['X-AiERP-Signature'] = `sha256=${hmac.digest('hex')}`; }
    try {
      const result = await httpPost(webhook.target_url, requestHeaders, bodyStr, 10_000);
      return { success: result.statusCode >= 200 && result.statusCode < 300, statusCode: result.statusCode, responseBody: result.body, durationMs: result.durationMs };
    } catch (err: any) {
      return { success: false, statusCode: null, responseBody: null, durationMs: 0, error: err?.message ?? String(err) };
    }
  }

  async getDeliveryHistory(tenantId: string, queryDto: QueryDeliveriesDto): Promise<PaginatedResult<WebhookDelivery>> {
    const { webhookId, eventType, status, startDate, endDate, page = 1, limit = 20 } = queryDto;
    const where: FindOptionsWhere<WebhookDelivery> = { tenant_id: tenantId };
    if (webhookId) where.webhook_id = webhookId;
    if (eventType) where.event_type = eventType;
    if (status) where.status = status;
    if (startDate && endDate) where.created_at = Between(new Date(startDate), new Date(endDate));
    else if (startDate) where.created_at = MoreThanOrEqual(new Date(startDate));
    else if (endDate) where.created_at = LessThanOrEqual(new Date(endDate));
    const [data, total] = await this.deliveryRepo.findAndCount({ where, order: { created_at: 'DESC' }, skip: (page - 1) * limit, take: limit });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDeliveryDetail(tenantId: string, deliveryId: string): Promise<WebhookDelivery> {
    const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId, tenant_id: tenantId }, relations: ['webhook'] });
    if (!delivery) throw new NotFoundException(`Delivery ${deliveryId} not found`);
    return delivery;
  }

  async retryDelivery(tenantId: string, deliveryId: string): Promise<{ queued: boolean; deliveryId: string }> {
    const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId, tenant_id: tenantId } });
    if (!delivery) throw new NotFoundException(`Delivery ${deliveryId} not found`);
    if (delivery.status === WebhookDeliveryStatus.SUCCESS) throw new BadRequestException('Delivery already succeeded — no retry needed');
    delivery.status = WebhookDeliveryStatus.PENDING;
    delivery.next_retry_at = null;
    await this.deliveryRepo.save(delivery);
    this.deliverWebhook(deliveryId).catch((err) => this.logger.error(`Manual retryDelivery(${deliveryId}): ${err?.message}`));
    return { queued: true, deliveryId };
  }

  async getWebhookStats(tenantId: string, webhookId: string): Promise<WebhookStats> {
    await this.getWebhook(webhookId, tenantId);
    const rows = await this.deliveryRepo.createQueryBuilder('d').select('d.status', 'status').addSelect('COUNT(*)', 'count').addSelect('AVG(d.duration_ms)', 'avgDuration').addSelect('MAX(d.created_at)', 'lastAt').where('d.tenant_id = :tenantId AND d.webhook_id = :webhookId', { tenantId, webhookId }).groupBy('d.status').getRawMany();
    let totalDeliveries = 0, successCount = 0, failedCount = 0, retryingCount = 0, totalDuration = 0, durationCount = 0;
    let lastDeliveryAt: Date | null = null, lastDeliveryStatus: WebhookDeliveryStatus | null = null;
    for (const row of rows) {
      const cnt = parseInt(row.count, 10);
      totalDeliveries += cnt;
      if (row.status === WebhookDeliveryStatus.SUCCESS) { successCount = cnt; if (row.avgDuration !== null) { totalDuration += parseFloat(row.avgDuration) * cnt; durationCount += cnt; } }
      else if (row.status === WebhookDeliveryStatus.FAILED) failedCount = cnt;
      else if (row.status === WebhookDeliveryStatus.RETRYING) retryingCount = cnt;
      if (row.lastAt) { const d = new Date(row.lastAt); if (!lastDeliveryAt || d > lastDeliveryAt) { lastDeliveryAt = d; lastDeliveryStatus = row.status as WebhookDeliveryStatus; } }
    }
    return { webhookId, totalDeliveries, successCount, failedCount, retryingCount, successRate: totalDeliveries > 0 ? (successCount / totalDeliveries) * 100 : 0, avgResponseTimeMs: durationCount > 0 ? Math.round(totalDuration / durationCount) : null, lastDeliveryAt, lastDeliveryStatus };
  }

  async getDeliveryHistoryForWebhook(webhookId: string, tenantId: string): Promise<WebhookDelivery[]> {
    const result = await this.getDeliveryHistory(tenantId, { webhookId, page: 1, limit: 50 });
    return result.data;
  }

  async resendDelivery(webhookId: string, deliveryId: string, tenantId: string): Promise<{ queued: boolean; deliveryId: string }> {
    return this.retryDelivery(tenantId, deliveryId);
  }
}
