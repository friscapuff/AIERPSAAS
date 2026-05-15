/**
 * Shared test utilities for AiERP unit and integration tests.
 * Provides mock factory functions for TypeORM repositories, DataSource,
 * QueryRunner, and domain entities.
 */

import { TenantStatus, SubscriptionPlan } from '@libs/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const mockTenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const mockUserId  = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
export const mockRoleId  = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

// ---------------------------------------------------------------------------
// Repository mock
// ---------------------------------------------------------------------------

/**
 * Returns a jest-mocked TypeORM Repository with all common methods stubbed.
 * Each method returns undefined by default; override with .mockResolvedValue()
 * in individual tests.
 */
export function createMockRepository<T = any>() {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
    getOne: jest.fn().mockResolvedValue(undefined),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };

  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(undefined),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    save: jest.fn().mockImplementation((entity: any) => Promise.resolve({ id: 'mock-id', ...entity })),
    create: jest.fn().mockImplementation((entity: any) => ({ ...entity })),
    insert: jest.fn().mockResolvedValue({ identifiers: [{ id: 'mock-id' }] }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    remove: jest.fn().mockResolvedValue(undefined),
    count: jest.fn().mockResolvedValue(0),
    query: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    manager: {
      findOne: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((entity: any) => Promise.resolve({ id: 'mock-id', ...entity })),
      create: jest.fn().mockImplementation((_, entity: any) => ({ ...entity })),
      remove: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ id: 'mock-id' }] }),
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(undefined),
      }),
    },
  } as any;
}

// ---------------------------------------------------------------------------
// QueryRunner mock
// ---------------------------------------------------------------------------

export function createMockQueryRunner() {
  const managerRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockImplementation((entity: any) => Promise.resolve({ id: 'mock-id', ...entity })),
    create: jest.fn().mockImplementation((_: any, entity: any) => ({ ...entity })),
    remove: jest.fn().mockResolvedValue(undefined),
    insert: jest.fn().mockResolvedValue({ identifiers: [{ id: 'mock-id' }] }),
    getRepository: jest.fn().mockReturnValue({
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(undefined),
    }),
    query: jest.fn().mockResolvedValue([]),
  };

  return {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: managerRepo,
  } as any;
}

// ---------------------------------------------------------------------------
// DataSource mock
// ---------------------------------------------------------------------------

export function createMockDataSource(queryRunner?: ReturnType<typeof createMockQueryRunner>) {
  const qr = queryRunner ?? createMockQueryRunner();
  return {
    createQueryRunner: jest.fn().mockReturnValue(qr),
    getRepository: jest.fn().mockReturnValue(createMockRepository()),
    transaction: jest.fn().mockImplementation(async (cb: Function) => cb(qr.manager)),
    query: jest.fn().mockResolvedValue([]),
  } as any;
}

// ---------------------------------------------------------------------------
// Entity factory functions
// ---------------------------------------------------------------------------

export function createMockTenant(overrides: Partial<any> = {}) {
  return {
    id: mockTenantId,
    name: 'Test Company',
    subdomain: 'test-company',
    subscription_plan: SubscriptionPlan.FREE,
    status: TenantStatus.ACTIVE,
    max_users: 5,
    settings: {
      currency: 'USD',
      timezone: 'UTC',
      fiscalYearStart: '01-01',
      decimalPlaces: 2,
      enableApprovalWorkflow: false,
      enableAuditLog: true,
    },
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: mockUserId,
    tenant_id: mockTenantId,
    email: 'admin@test-company.com',
    password_hash: '$2b$12$hashedpassword',
    first_name: 'Admin',
    last_name: 'User',
    role_id: mockRoleId,
    role: createMockRole(),
    is_active: true,
    last_login: null,
    mfa_enabled: false,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockRole(overrides: Partial<any> = {}) {
  return {
    id: mockRoleId,
    tenant_id: mockTenantId,
    name: 'Admin',
    description: 'Administrator with full access',
    is_system: true,
    permissions: {
      finance: { create: true, read: true, update: true, delete: true, post: true, void: true },
      inventory: { create: true, read: true, update: true, delete: true, post: true, void: true },
      hr: { create: true, read: true, update: true, delete: true, post: true, void: true },
      sales: { create: true, read: true, update: true, delete: true, post: true, void: true },
      purchase: { create: true, read: true, update: true, delete: true, post: true, void: true },
      admin: { create: true, read: true, update: true, delete: true },
    },
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockAccount(overrides: Partial<any> = {}) {
  return {
    id: 'acct-1111-1111',
    tenant_id: mockTenantId,
    code: '1000',
    name: 'Cash and Cash Equivalents',
    account_type: 'ASSET',
    account_sub_type: 'CURRENT_ASSET',
    parent_id: null,
    is_active: true,
    is_control_account: false,
    currency: 'USD',
    description: null,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockGLTransaction(overrides: Partial<any> = {}) {
  return {
    id: 'gl-tx-' + Math.random().toString(36).slice(2, 8),
    tenant_id: mockTenantId,
    journal_id: 'journal-0001',
    account_id: 'acct-1111-1111',
    debit: '1000.0000',
    credit: '0.0000',
    currency: 'USD',
    exchange_rate: '1.000000',
    posting_date: new Date('2024-01-15T00:00:00Z'),
    source_doc_type: 'JOURNAL',
    source_doc_id: null,
    description: 'Test GL entry',
    created_by: mockUserId,
    created_at: new Date('2024-01-15T00:00:00Z'),
    ...overrides,
  };
}

export function createMockFinancialPeriod(overrides: Partial<any> = {}) {
  return {
    id: 'period-2024-01',
    tenant_id: mockTenantId,
    name: 'January 2024',
    start_date: new Date('2024-01-01T00:00:00Z'),
    end_date: new Date('2024-01-31T23:59:59Z'),
    status: 'OPEN',
    closed_at: null,
    closed_by: null,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockItem(overrides: Partial<any> = {}) {
  return {
    id: 'item-1111-1111',
    tenant_id: mockTenantId,
    code: 'ITEM-001',
    name: 'Test Item',
    description: 'A test inventory item',
    category: 'General',
    unit_of_measure: 'PCS',
    costing_method: 'FIFO',
    min_stock_level: 10,
    max_stock_level: 100,
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockWarehouse(overrides: Partial<any> = {}) {
  return {
    id: 'wh-1111-1111',
    tenant_id: mockTenantId,
    code: 'WH-MAIN',
    name: 'Main Warehouse',
    address: '123 Warehouse St',
    is_default: true,
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockInventoryLog(overrides: Partial<any> = {}) {
  return {
    id: 'inv-log-' + Math.random().toString(36).slice(2, 8),
    tenant_id: mockTenantId,
    item_id: 'item-1111-1111',
    warehouse_id: 'wh-1111-1111',
    quantity: 100,
    unit_cost: 10,
    total_cost: 1000,
    movement_type: 'IN',
    costing_method: 'FIFO',
    reference_doc_type: null,
    reference_doc_id: null,
    posting_date: new Date('2024-01-10T00:00:00Z'),
    created_at: new Date('2024-01-10T00:00:00Z'),
    ...overrides,
  };
}

export function createMockCostLayer(overrides: Partial<any> = {}) {
  return {
    id: 'cl-' + Math.random().toString(36).slice(2, 8),
    tenant_id: mockTenantId,
    item_id: 'item-1111-1111',
    warehouse_id: 'wh-1111-1111',
    remaining_quantity: 100,
    unit_cost: 10,
    layer_date: new Date('2024-01-10T00:00:00Z'),
    reference_log_id: null,
    ...overrides,
  };
}

export function createMockWebhook(overrides: Partial<any> = {}) {
  return {
    id: 'webhook-1111',
    tenant_id: mockTenantId,
    event_type: 'INVOICE_POSTED',
    target_url: 'https://example.com/webhook',
    headers: { 'X-Custom': 'value' },
    secret: 'webhook-secret-key',
    is_active: true,
    retry_policy: {
      max_retries: 5,
      backoff_multiplier: 5,
      initial_delay_ms: 60000,
    },
    last_triggered_at: null,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockWebhookDelivery(overrides: Partial<any> = {}) {
  return {
    id: 'delivery-1111',
    tenant_id: mockTenantId,
    webhook_id: 'webhook-1111',
    event_type: 'INVOICE_POSTED',
    payload: { invoiceId: 'inv-001', amount: 1000 },
    status: 'PENDING',
    response_status_code: null,
    response_body: null,
    attempt_number: 0,
    next_retry_at: null,
    error_message: null,
    duration_ms: null,
    created_at: new Date('2024-01-15T00:00:00Z'),
    ...overrides,
  };
}

export function createMockWorkflow(overrides: Partial<any> = {}) {
  return {
    id: 'workflow-1111',
    tenant_id: mockTenantId,
    name: 'Invoice Approval',
    trigger_doc_type: 'INVOICE',
    conditions: [{ field: 'amount', operator: 'gt', value: 1000 }],
    approval_levels: [
      { level: 1, approverRoleId: 'role-manager', name: 'Manager Approval' },
      { level: 2, approverRoleId: 'role-director', name: 'Director Approval' },
    ],
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockWorkflowInstance(overrides: Partial<any> = {}) {
  return {
    id: 'instance-1111',
    tenant_id: mockTenantId,
    workflow_id: 'workflow-1111',
    document_type: 'INVOICE',
    document_id: 'inv-001',
    current_status: 'PENDING_APPROVAL',
    current_level: 1,
    initiated_by: mockUserId,
    initiated_at: new Date('2024-01-15T00:00:00Z'),
    completed_at: null,
    comments: [],
    created_at: new Date('2024-01-15T00:00:00Z'),
    updated_at: new Date('2024-01-15T00:00:00Z'),
    ...overrides,
  };
}

export function createMockIntercompanyAgreement(overrides: Partial<any> = {}) {
  return {
    id: 'agreement-1111',
    parent_tenant_id: 'tenant-parent-1111',
    child_tenant_ids: ['tenant-child-1111', 'tenant-child-2222'],
    due_to_account_id: 'acct-due-to-1111',
    due_from_account_id: 'acct-due-from-1111',
    due_to_account: { id: 'acct-due-to-1111', code: '2100', name: 'Due To Related Party' },
    due_from_account: { id: 'acct-due-from-1111', code: '1200', name: 'Due From Related Party' },
    settlement_currency: 'USD',
    auto_post: true,
    is_active: true,
    created_by: mockUserId,
    created_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockIntercompanyTransaction(overrides: Partial<any> = {}) {
  return {
    id: 'ic-tx-1111',
    source_tenant_id: 'tenant-parent-1111',
    target_tenant_id: 'tenant-child-1111',
    agreement_id: 'agreement-1111',
    amount: '5000.0000',
    currency: 'USD',
    exchange_rate: '1.000000',
    description: 'Management fee Q1 2024',
    source_doc_type: 'INTERCOMPANY',
    source_doc_id: null,
    source_journal_id: 'journal-src-1111',
    target_journal_id: 'journal-tgt-1111',
    status: 'POSTED',
    settlement_date: null,
    settlement_notes: null,
    created_by: mockUserId,
    created_at: new Date('2024-01-15T00:00:00Z'),
    ...overrides,
  };
}
