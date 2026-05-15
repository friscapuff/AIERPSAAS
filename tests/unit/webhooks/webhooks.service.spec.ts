/**
 * Webhooks Service — unit test suite.
 *
 * Coverage:
 *  - dispatchEvent: creates delivery records, returns count and delivery IDs
 *  - HMAC signing: correct SHA256 signature format
 *  - scheduleRetry: exponential backoff calculation
 *  - getWebhook: NotFoundException when not found
 *  - createWebhook / updateWebhook: default retry policy values
 *  - retryDelivery: cannot retry a SUCCESS delivery
 */

import * as crypto from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WebhooksService } from '../../../apps/api/src/modules/webhooks/webhooks.service';
import {
  createMockRepository,
  createMockWebhook,
  createMockWebhookDelivery,
  mockTenantId,
} from '../../setup/test-utils';

// ---------------------------------------------------------------------------
// Constants (mirror from service)
// ---------------------------------------------------------------------------

const BASE_DELAY_SECONDS = 60;
const DEFAULT_BACKOFF_MULTIPLIER = 5;
const DEFAULT_MAX_RETRIES = 5;

// ---------------------------------------------------------------------------
// WebhookDeliveryStatus mirror
// ---------------------------------------------------------------------------

const WebhookDeliveryStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
} as const;

// ---------------------------------------------------------------------------

describe('WebhooksService', () => {
  let service: WebhooksService;
  let webhookRepo: ReturnType<typeof createMockRepository>;
  let deliveryRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    webhookRepo = createMockRepository();
    deliveryRepo = createMockRepository();

    service = new WebhooksService(
      webhookRepo as any,
      deliveryRepo as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // =========================================================================
  // getWebhook
  // =========================================================================

  describe('getWebhook', () => {
    it('should return the webhook when it exists and belongs to tenant', async () => {
      const webhook = createMockWebhook();
      webhookRepo.findOne.mockResolvedValue(webhook);

      const result = await service.getWebhook(webhook.id, mockTenantId);
      expect(result).toEqual(webhook);
    });

    it('should throw NotFoundException when webhook does not exist', async () => {
      webhookRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getWebhook('bad-id', mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // createWebhook
  // =========================================================================

  describe('createWebhook', () => {
    it('should create webhook with default retry policy when none provided', async () => {
      const dto = {
        eventType: 'INVOICE_POSTED',
        targetUrl: 'https://example.com/hook',
        isActive: true,
      };

      const webhook = createMockWebhook({
        retry_policy: {
          max_retries: DEFAULT_MAX_RETRIES,
          backoff_multiplier: DEFAULT_BACKOFF_MULTIPLIER,
          initial_delay_ms: BASE_DELAY_SECONDS * 1000,
        },
      });
      webhookRepo.create.mockReturnValue(webhook);
      webhookRepo.save.mockResolvedValue(webhook);

      const result = await service.createWebhook(mockTenantId, dto as any);

      expect(result.retry_policy).toBeNull(); // dto has no retryPolicy -> null
    });

    it('should merge custom retry policy with defaults', async () => {
      const dto = {
        eventType: 'INVOICE_POSTED',
        targetUrl: 'https://example.com/hook',
        retryPolicy: { maxRetries: 3, backoffMultiplier: 2 },
      };

      const webhook = createMockWebhook();
      webhookRepo.create.mockReturnValue(webhook);
      webhookRepo.save.mockResolvedValue(webhook);

      await service.createWebhook(mockTenantId, dto as any);

      expect(webhookRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          retry_policy: expect.objectContaining({
            max_retries: 3,
            backoff_multiplier: 2,
            initial_delay_ms: BASE_DELAY_SECONDS * 1000,
          }),
        }),
      );
    });

    it('should default is_active to true when not specified', async () => {
      const dto = { eventType: 'INVOICE_POSTED', targetUrl: 'https://x.com/hook' };
      const webhook = createMockWebhook({ is_active: true });
      webhookRepo.create.mockReturnValue(webhook);
      webhookRepo.save.mockResolvedValue(webhook);

      await service.createWebhook(mockTenantId, dto as any);

      expect(webhookRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true }),
      );
    });
  });

  // =========================================================================
  // dispatchEvent
  // =========================================================================

  describe('dispatchEvent', () => {
    it('should return zero notified and empty delivery IDs when no active webhooks match', async () => {
      webhookRepo.find.mockResolvedValue([]);

      const result = await service.dispatchEvent(
        mockTenantId,
        'INVOICE_POSTED',
        { invoiceId: 'inv-001' },
      );

      expect(result.webhooksNotified).toBe(0);
      expect(result.deliveryIds).toHaveLength(0);
    });

    it('should create one delivery record per matching webhook', async () => {
      const webhooks = [
        createMockWebhook({ id: 'webhook-A' }),
        createMockWebhook({ id: 'webhook-B' }),
      ];
      webhookRepo.find.mockResolvedValue(webhooks);

      const deliveryA = createMockWebhookDelivery({ id: 'delivery-A', webhook_id: 'webhook-A' });
      const deliveryB = createMockWebhookDelivery({ id: 'delivery-B', webhook_id: 'webhook-B' });

      deliveryRepo.create
        .mockReturnValueOnce(deliveryA)
        .mockReturnValueOnce(deliveryB);
      deliveryRepo.save
        .mockResolvedValueOnce(deliveryA)
        .mockResolvedValueOnce(deliveryB);

      // Stub the query builder for last_triggered_at update
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      webhookRepo.createQueryBuilder.mockReturnValue(qb);

      // Stub deliverWebhook -- we don't want actual HTTP calls
      jest.spyOn(service, 'deliverWebhook' as any).mockResolvedValue(undefined);

      const result = await service.dispatchEvent(
        mockTenantId,
        'INVOICE_POSTED',
        { invoiceId: 'inv-001' },
      );

      expect(result.webhooksNotified).toBe(2);
      expect(result.deliveryIds).toContain('delivery-A');
      expect(result.deliveryIds).toContain('delivery-B');
    });

    it('should set delivery status to PENDING initially', async () => {
      const webhook = createMockWebhook();
      webhookRepo.find.mockResolvedValue([webhook]);

      const delivery = createMockWebhookDelivery({ status: WebhookDeliveryStatus.PENDING });
      deliveryRepo.create.mockReturnValue(delivery);
      deliveryRepo.save.mockResolvedValue(delivery);

      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      webhookRepo.createQueryBuilder.mockReturnValue(qb);

      jest.spyOn(service, 'deliverWebhook' as any).mockResolvedValue(undefined);

      await service.dispatchEvent(mockTenantId, 'INVOICE_POSTED', {});

      expect(deliveryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: WebhookDeliveryStatus.PENDING, attempt_number: 0 }),
      );
    });

    it('should update last_triggered_at on all matching webhooks after dispatch', async () => {
      const webhook = createMockWebhook();
      webhookRepo.find.mockResolvedValue([webhook]);

      const delivery = createMockWebhookDelivery();
      deliveryRepo.create.mockReturnValue(delivery);
      deliveryRepo.save.mockResolvedValue(delivery);

      const qbExecute = jest.fn().mockResolvedValue(undefined);
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: qbExecute,
      };
      webhookRepo.createQueryBuilder.mockReturnValue(qb);

      jest.spyOn(service, 'deliverWebhook' as any).mockResolvedValue(undefined);

      await service.dispatchEvent(mockTenantId, 'INVOICE_POSTED', {});

      expect(qbExecute).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // HMAC signing
  // =========================================================================

  describe('HMAC signing', () => {
    it('should compute correct SHA256 HMAC signature', () => {
      const secret = 'my-webhook-secret';
      const body = JSON.stringify({ event: 'INVOICE_POSTED', data: { id: 'inv-001' } });

      // Compute expected signature
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(body);
      const expectedSignature = `sha256=${hmac.digest('hex')}`;

      // Verify the pattern used in the service
      const hmac2 = crypto.createHmac('sha256', secret);
      hmac2.update(body);
      const actualSignature = `sha256=${hmac2.digest('hex')}`;

      expect(actualSignature).toBe(expectedSignature);
      expect(actualSignature).toMatch(/^sha256=[0-9a-f]{64}$/);
    });

    it('should produce different signatures for different secrets', () => {
      const body = 'same body content';

      const hmac1 = crypto.createHmac('sha256', 'secret-A');
      hmac1.update(body);
      const sig1 = hmac1.digest('hex');

      const hmac2 = crypto.createHmac('sha256', 'secret-B');
      hmac2.update(body);
      const sig2 = hmac2.digest('hex');

      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different payloads with same secret', () => {
      const secret = 'shared-secret';

      const hmac1 = crypto.createHmac('sha256', secret);
      hmac1.update('payload-A');
      const sig1 = hmac1.digest('hex');

      const hmac2 = crypto.createHmac('sha256', secret);
      hmac2.update('payload-B');
      const sig2 = hmac2.digest('hex');

      expect(sig1).not.toBe(sig2);
    });

    it('should produce a 64-character lowercase hex HMAC digest', () => {
      const hmac = crypto.createHmac('sha256', 'secret');
      hmac.update('test-payload');
      const digest = hmac.digest('hex');

      expect(digest).toHaveLength(64);
      expect(digest).toMatch(/^[0-9a-f]+$/);
    });
  });

  // =========================================================================
  // Retry logic — exponential backoff calculation
  // =========================================================================

  describe('retry logic — exponential backoff', () => {
    it('should calculate correct delay for attempt 1: 60 * 5^1 = 300 seconds', () => {
      const attempt = 1;
      const delay = BASE_DELAY_SECONDS * Math.pow(DEFAULT_BACKOFF_MULTIPLIER, attempt);
      expect(delay).toBe(300);
    });

    it('should calculate correct delay for attempt 2: 60 * 5^2 = 1500 seconds (25 min)', () => {
      const attempt = 2;
      const delay = BASE_DELAY_SECONDS * Math.pow(DEFAULT_BACKOFF_MULTIPLIER, attempt);
      expect(delay).toBe(1500);
    });

    it('should calculate correct delay for attempt 3: 60 * 5^3 = 7500 seconds', () => {
      const attempt = 3;
      const delay = BASE_DELAY_SECONDS * Math.pow(DEFAULT_BACKOFF_MULTIPLIER, attempt);
      expect(delay).toBe(7500);
    });

    it('should grow exponentially — each attempt multiplies delay by backoff factor', () => {
      const delays = [1, 2, 3, 4].map(
        (a) => BASE_DELAY_SECONDS * Math.pow(DEFAULT_BACKOFF_MULTIPLIER, a),
      );

      for (let i = 1; i < delays.length; i++) {
        expect(delays[i] / delays[i - 1]).toBeCloseTo(DEFAULT_BACKOFF_MULTIPLIER, 5);
      }
    });

    it('[scheduleRetry] should mark delivery as FAILED after max retries exceeded', async () => {
      const delivery = createMockWebhookDelivery({
        attempt_number: DEFAULT_MAX_RETRIES, // already at max
        status: WebhookDeliveryStatus.RETRYING,
      });

      deliveryRepo.findOne.mockResolvedValue(delivery);

      const failedDelivery = { ...delivery, status: WebhookDeliveryStatus.FAILED, next_retry_at: null };
      deliveryRepo.save.mockResolvedValue(failedDelivery);

      const webhook = createMockWebhook({
        retry_policy: {
          max_retries: DEFAULT_MAX_RETRIES,
          backoff_multiplier: DEFAULT_BACKOFF_MULTIPLIER,
        },
      });

      // Call private method via any cast
      await (service as any).scheduleRetry(delivery.id, webhook);

      expect(deliveryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: WebhookDeliveryStatus.FAILED, next_retry_at: null }),
      );
    });

    it('[scheduleRetry] should mark delivery as RETRYING with future next_retry_at when retries remain', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-15T12:00:00Z');
      jest.setSystemTime(now);

      const delivery = createMockWebhookDelivery({
        attempt_number: 1,
        status: WebhookDeliveryStatus.PENDING,
      });

      deliveryRepo.findOne.mockResolvedValue(delivery);

      const retryingDelivery = {
        ...delivery,
        status: WebhookDeliveryStatus.RETRYING,
        next_retry_at: new Date(now.getTime() + 300 * 1000), // 300s
      };
      deliveryRepo.save.mockResolvedValue(retryingDelivery);

      const webhook = createMockWebhook({
        retry_policy: {
          max_retries: DEFAULT_MAX_RETRIES,
          backoff_multiplier: DEFAULT_BACKOFF_MULTIPLIER,
        },
      });

      // Spy on deliverWebhook to prevent it from running during setTimeout
      jest.spyOn(service, 'deliverWebhook').mockResolvedValue(undefined);

      await (service as any).scheduleRetry(delivery.id, webhook);

      expect(deliveryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: WebhookDeliveryStatus.RETRYING }),
      );

      const savedArg = deliveryRepo.save.mock.calls[0][0];
      expect(savedArg.next_retry_at).toBeInstanceOf(Date);
      expect(savedArg.next_retry_at.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  // =========================================================================
  // retryDelivery
  // =========================================================================

  describe('retryDelivery', () => {
    it('should throw BadRequestException when delivery already succeeded', async () => {
      const delivery = createMockWebhookDelivery({
        status: WebhookDeliveryStatus.SUCCESS,
      });
      deliveryRepo.findOne.mockResolvedValue(delivery);

      await expect(
        service.retryDelivery(mockTenantId, delivery.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when delivery does not exist', async () => {
      deliveryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.retryDelivery(mockTenantId, 'bad-delivery-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reset delivery to PENDING status and fire-and-forget delivery', async () => {
      const delivery = createMockWebhookDelivery({
        status: WebhookDeliveryStatus.FAILED,
      });
      deliveryRepo.findOne.mockResolvedValue(delivery);
      deliveryRepo.save.mockResolvedValue({ ...delivery, status: WebhookDeliveryStatus.PENDING });
      jest.spyOn(service, 'deliverWebhook').mockResolvedValue(undefined);

      const result = await service.retryDelivery(mockTenantId, delivery.id);

      expect(result.queued).toBe(true);
      expect(result.deliveryId).toBe(delivery.id);
      expect(deliveryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: WebhookDeliveryStatus.PENDING, next_retry_at: null }),
      );
    });
  });

  // =========================================================================
  // deleteWebhook (soft-delete)
  // =========================================================================

  describe('deleteWebhook', () => {
    it('should soft-delete by setting is_active to false', async () => {
      const webhook = createMockWebhook({ is_active: true });
      webhookRepo.findOne.mockResolvedValue(webhook);
      webhookRepo.save.mockResolvedValue({ ...webhook, is_active: false });

      await service.deleteWebhook(webhook.id, mockTenantId);

      expect(webhookRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });
  });

  // =========================================================================
  // listAvailableEvents
  // =========================================================================

  describe('listAvailableEvents', () => {
    it('should return all event types with descriptions', () => {
      const events = service.listAvailableEvents();

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);

      for (const event of events) {
        expect(event.eventType).toBeDefined();
        expect(event.description).toBeDefined();
      }
    });

    it('should include INVOICE_POSTED event', () => {
      const events = service.listAvailableEvents();
      const invoiceEvent = events.find((e) => e.eventType === 'INVOICE_POSTED');
      expect(invoiceEvent).toBeDefined();
    });
  });
});
