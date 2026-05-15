/**
 * Intercompany Service — unit test suite.
 *
 * Coverage:
 *  - createTransaction: both tenant GL journals created atomically, same-tenant guard
 *  - settleTransactions: settlement entries posted to GL, status set to SETTLED
 *  - getEliminationEntries: correct debit/credit pairs for due-to/due-from elimination
 *  - createAgreement: validates parent + child tenants + COA accounts
 *  - cancelTransaction: cannot cancel SETTLED/CANCELLED, posts reversal entries
 */

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { IntercompanyService } from '../../../apps/api/src/modules/intercompany/intercompany.service';
import {
  createMockRepository,
  createMockDataSource,
  createMockTenant,
  createMockAccount,
  createMockIntercompanyAgreement,
  createMockIntercompanyTransaction,
  mockUserId,
} from '../../setup/test-utils';

// ---------------------------------------------------------------------------
// Status enum mirrors
// ---------------------------------------------------------------------------

const IntercompanyStatus = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  SETTLED: 'SETTLED',
  CANCELLED: 'CANCELLED',
} as const;

const TenantStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;

// ---------------------------------------------------------------------------

const SOURCE_TENANT_ID = 'tenant-parent-1111';
const TARGET_TENANT_ID = 'tenant-child-1111';

// ---------------------------------------------------------------------------

describe('IntercompanyService', () => {
  let service: IntercompanyService;
  let agreementRepo: ReturnType<typeof createMockRepository>;
  let icTxRepo: ReturnType<typeof createMockRepository>;
  let tenantRepo: ReturnType<typeof createMockRepository>;
  let coaRepo: ReturnType<typeof createMockRepository>;
  let glTxRepo: ReturnType<typeof createMockRepository>;
  let dataSource: ReturnType<typeof createMockDataSource>;

  beforeEach(() => {
    agreementRepo = createMockRepository();
    icTxRepo = createMockRepository();
    tenantRepo = createMockRepository();
    coaRepo = createMockRepository();
    glTxRepo = createMockRepository();
    dataSource = createMockDataSource();

    service = new IntercompanyService(
      agreementRepo as any,
      icTxRepo as any,
      tenantRepo as any,
      coaRepo as any,
      glTxRepo as any,
      dataSource as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // createTransaction
  // =========================================================================

  describe('createTransaction', () => {
    const createDto = {
      targetTenantId: TARGET_TENANT_ID,
      amount: 5000,
      currency: 'USD',
      exchangeRate: 1,
      description: 'Management fee Q1 2024',
    };

    it('should throw BadRequestException when source and target tenants are the same', async () => {
      await expect(
        service.createTransaction(SOURCE_TENANT_ID, {
          ...createDto,
          targetTenantId: SOURCE_TENANT_ID,
        } as any, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no active agreement covers the tenant pair', async () => {
      agreementRepo.find.mockResolvedValue([]); // no agreements

      await expect(
        service.createTransaction(SOURCE_TENANT_ID, createDto as any, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when source tenant does not exist', async () => {
      const agreement = createMockIntercompanyAgreement({
        parent_tenant_id: SOURCE_TENANT_ID,
        child_tenant_ids: [TARGET_TENANT_ID],
      });
      agreementRepo.find.mockResolvedValue([agreement]);

      tenantRepo.findOne.mockResolvedValue(null); // source not found

      await expect(
        service.createTransaction(SOURCE_TENANT_ID, createDto as any, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when source tenant is not active', async () => {
      const agreement = createMockIntercompanyAgreement({
        parent_tenant_id: SOURCE_TENANT_ID,
        child_tenant_ids: [TARGET_TENANT_ID],
      });
      agreementRepo.find.mockResolvedValue([agreement]);

      tenantRepo.findOne.mockResolvedValue(
        createMockTenant({ id: SOURCE_TENANT_ID, status: TenantStatus.SUSPENDED }),
      );

      await expect(
        service.createTransaction(SOURCE_TENANT_ID, createDto as any, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create GL entries in both source and target tenant within a single DB transaction', async () => {
      const agreement = createMockIntercompanyAgreement({
        parent_tenant_id: SOURCE_TENANT_ID,
        child_tenant_ids: [TARGET_TENANT_ID],
        auto_post: true,
      });
      agreementRepo.find.mockResolvedValue([agreement]);

      // Both tenants active
      tenantRepo.findOne.mockResolvedValue(
        createMockTenant({ status: TenantStatus.ACTIVE }),
      );

      const savedIcTx = createMockIntercompanyTransaction({
        source_tenant_id: SOURCE_TENANT_ID,
        target_tenant_id: TARGET_TENANT_ID,
        amount: '5000.0000',
        status: IntercompanyStatus.POSTED,
      });

      // dataSource.transaction is called with a callback
      dataSource.transaction.mockImplementation(async (cb: Function) => {
        const em = {
          query: jest.fn().mockResolvedValue(undefined),
          save: jest.fn().mockResolvedValue(savedIcTx),
          create: jest.fn().mockReturnValue(savedIcTx),
        };
        return cb(em);
      });

      const result = await service.createTransaction(
        SOURCE_TENANT_ID,
        createDto as any,
        mockUserId,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(result.source_tenant_id).toBe(SOURCE_TENANT_ID);
      expect(result.target_tenant_id).toBe(TARGET_TENANT_ID);
    });

    it('should set status to DRAFT when agreement has auto_post = false', async () => {
      const agreement = createMockIntercompanyAgreement({
        parent_tenant_id: SOURCE_TENANT_ID,
        child_tenant_ids: [TARGET_TENANT_ID],
        auto_post: false,
      });
      agreementRepo.find.mockResolvedValue([agreement]);
      tenantRepo.findOne.mockResolvedValue(createMockTenant({ status: TenantStatus.ACTIVE }));

      const savedDraft = createMockIntercompanyTransaction({ status: IntercompanyStatus.DRAFT });
      dataSource.transaction.mockImplementation(async (cb: Function) => {
        const em = {
          query: jest.fn().mockResolvedValue(undefined),
          save: jest.fn().mockResolvedValue(savedDraft),
          create: jest.fn().mockReturnValue(savedDraft),
        };
        return cb(em);
      });

      const result = await service.createTransaction(
        SOURCE_TENANT_ID,
        createDto as any,
        mockUserId,
      );

      expect(result.status).toBe(IntercompanyStatus.DRAFT);
    });
  });

  // =========================================================================
  // settleTransactions
  // =========================================================================

  describe('settleTransactions', () => {
    it('should post settlement GL entries and mark transactions as SETTLED', async () => {
      const tx = createMockIntercompanyTransaction({
        id: 'ic-tx-001',
        source_tenant_id: SOURCE_TENANT_ID,
        target_tenant_id: TARGET_TENANT_ID,
        status: IntercompanyStatus.POSTED,
        amount: '5000.0000',
      });

      icTxRepo.find.mockResolvedValue([tx]);

      const settledTx = { ...tx, status: IntercompanyStatus.SETTLED, settlement_date: new Date() };

      const agreement = createMockIntercompanyAgreement();
      dataSource.transaction.mockImplementation(async (cb: Function) => {
        const em = {
          query: jest.fn().mockResolvedValue(undefined),
          save: jest.fn().mockResolvedValue(settledTx),
          findOne: jest.fn().mockResolvedValue(agreement),
        };
        return cb(em);
      });

      const result = await service.settleTransactions(
        SOURCE_TENANT_ID,
        {
          transactionIds: ['ic-tx-001'],
          settlementDate: '2024-01-31',
          notes: 'Q1 settlement',
        } as any,
        mockUserId,
      );

      expect(result.settled).toBe(1);
      expect(result.transactions[0].status).toBe(IntercompanyStatus.SETTLED);
    });

    it('should throw NotFoundException when any transaction ID is not found', async () => {
      icTxRepo.find.mockResolvedValue([]); // none found

      await expect(
        service.settleTransactions(
          SOURCE_TENANT_ID,
          { transactionIds: ['missing-id'], settlementDate: '2024-01-31' } as any,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when settling a non-POSTED transaction', async () => {
      const draftTx = createMockIntercompanyTransaction({
        status: IntercompanyStatus.DRAFT,
        source_tenant_id: SOURCE_TENANT_ID,
      });

      icTxRepo.find.mockResolvedValue([draftTx]);

      await expect(
        service.settleTransactions(
          SOURCE_TENANT_ID,
          { transactionIds: [draftTx.id], settlementDate: '2024-01-31' } as any,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when tenant is not a party to the transaction', async () => {
      const tx = createMockIntercompanyTransaction({
        source_tenant_id: 'some-other-tenant',
        target_tenant_id: 'another-tenant',
        status: IntercompanyStatus.POSTED,
      });

      icTxRepo.find.mockResolvedValue([tx]);

      await expect(
        service.settleTransactions(
          SOURCE_TENANT_ID, // not a party
          { transactionIds: [tx.id], settlementDate: '2024-01-31' } as any,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // getEliminationEntries
  // =========================================================================

  describe('getEliminationEntries', () => {
    it('should return elimination pairs for all POSTED intercompany transactions', async () => {
      const agreement = createMockIntercompanyAgreement({
        parent_tenant_id: SOURCE_TENANT_ID,
        child_tenant_ids: [TARGET_TENANT_ID],
        due_to_account: { id: 'acct-due-to', code: '2100', name: 'Due To' },
        due_from_account: { id: 'acct-due-from', code: '1200', name: 'Due From' },
      });

      agreementRepo.findOne.mockResolvedValue(agreement);

      const tx = createMockIntercompanyTransaction({
        source_tenant_id: SOURCE_TENANT_ID,
        target_tenant_id: TARGET_TENANT_ID,
        status: IntercompanyStatus.POSTED,
        amount: '5000.0000',
        currency: 'USD',
      });

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([tx]),
      };
      icTxRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getEliminationEntries(SOURCE_TENANT_ID);

      expect(result).toHaveLength(1);
      const elimination = result[0];

      expect(elimination.sourceTenantId).toBe(SOURCE_TENANT_ID);
      expect(elimination.targetTenantId).toBe(TARGET_TENANT_ID);
      expect(elimination.lines).toHaveLength(2);

      // One line is a debit (eliminating Due-To in target), one is a credit (eliminating Due-From in source)
      const debitLine = elimination.lines.find((l: any) => parseFloat(l.debit) > 0);
      const creditLine = elimination.lines.find((l: any) => parseFloat(l.credit) > 0);

      expect(debitLine).toBeDefined();
      expect(creditLine).toBeDefined();
      expect(debitLine?.tenantId).toBe(TARGET_TENANT_ID);  // Due-To eliminated in target
      expect(creditLine?.tenantId).toBe(SOURCE_TENANT_ID); // Due-From eliminated in source
    });

    it('should throw NotFoundException when no active agreement found for parent', async () => {
      agreementRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getEliminationEntries(SOURCE_TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when no POSTED transactions exist', async () => {
      const agreement = createMockIntercompanyAgreement();
      agreementRepo.findOne.mockResolvedValue(agreement);

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // no transactions
      };
      icTxRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getEliminationEntries(SOURCE_TENANT_ID);
      expect(result).toHaveLength(0);
    });

    it('should aggregate multiple transactions between the same pair into one elimination entry', async () => {
      const agreement = createMockIntercompanyAgreement({
        due_to_account: { id: 'acct-dt', code: '2100', name: 'Due To' },
        due_from_account: { id: 'acct-df', code: '1200', name: 'Due From' },
      });
      agreementRepo.findOne.mockResolvedValue(agreement);

      const tx1 = createMockIntercompanyTransaction({ amount: '3000.0000', status: IntercompanyStatus.POSTED });
      const tx2 = createMockIntercompanyTransaction({ amount: '2000.0000', status: IntercompanyStatus.POSTED });

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([tx1, tx2]),
      };
      icTxRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getEliminationEntries(SOURCE_TENANT_ID);

      // Should be one pair with combined amount $5000
      expect(result).toHaveLength(1);
      const totalDebit = result[0].lines.find((l: any) => parseFloat(l.debit) > 0);
      expect(totalDebit?.debit).toBe('5000.0000');
    });
  });

  // =========================================================================
  // createAgreement
  // =========================================================================

  describe('createAgreement', () => {
    it('should throw NotFoundException when parent tenant does not exist', async () => {
      tenantRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createAgreement(
          {
            parentTenantId: 'nonexistent',
            childTenantIds: [TARGET_TENANT_ID],
            dueToAccountId: 'acct-due-to',
            dueFromAccountId: 'acct-due-from',
            settlementCurrency: 'USD',
          } as any,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when one or more child tenants do not exist', async () => {
      tenantRepo.findOne.mockResolvedValue(createMockTenant()); // parent found
      tenantRepo.find.mockResolvedValue([]); // child tenants NOT found

      await expect(
        service.createAgreement(
          {
            parentTenantId: SOURCE_TENANT_ID,
            childTenantIds: ['missing-child-1', 'missing-child-2'],
            dueToAccountId: 'acct-due-to',
            dueFromAccountId: 'acct-due-from',
            settlementCurrency: 'USD',
          } as any,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when due-to COA account does not exist', async () => {
      tenantRepo.findOne.mockResolvedValue(createMockTenant());
      tenantRepo.find.mockResolvedValue([createMockTenant({ id: TARGET_TENANT_ID })]);
      coaRepo.findOne.mockResolvedValue(null); // due-to account not found

      await expect(
        service.createAgreement(
          {
            parentTenantId: SOURCE_TENANT_ID,
            childTenantIds: [TARGET_TENANT_ID],
            dueToAccountId: 'bad-acct',
            dueFromAccountId: 'acct-due-from',
            settlementCurrency: 'USD',
          } as any,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create and return agreement when all validations pass', async () => {
      tenantRepo.findOne.mockResolvedValue(createMockTenant({ id: SOURCE_TENANT_ID }));
      tenantRepo.find.mockResolvedValue([createMockTenant({ id: TARGET_TENANT_ID })]);
      coaRepo.findOne
        .mockResolvedValueOnce(createMockAccount({ id: 'acct-due-to' }))
        .mockResolvedValueOnce(createMockAccount({ id: 'acct-due-from' }));

      const agreement = createMockIntercompanyAgreement();
      agreementRepo.create.mockReturnValue(agreement);
      agreementRepo.save.mockResolvedValue(agreement);

      const result = await service.createAgreement(
        {
          parentTenantId: SOURCE_TENANT_ID,
          childTenantIds: [TARGET_TENANT_ID],
          dueToAccountId: 'acct-due-to',
          dueFromAccountId: 'acct-due-from',
          settlementCurrency: 'USD',
          autoPost: true,
        } as any,
        mockUserId,
      );

      expect(result).toEqual(agreement);
      expect(agreementRepo.save).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // cancelTransaction
  // =========================================================================

  describe('cancelTransaction', () => {
    it('should throw BadRequestException when transaction is already SETTLED', async () => {
      const tx = createMockIntercompanyTransaction({
        status: IntercompanyStatus.SETTLED,
        source_tenant_id: SOURCE_TENANT_ID,
      });

      // getTransaction calls findOne
      icTxRepo.findOne.mockResolvedValue(tx);

      await expect(
        service.cancelTransaction(SOURCE_TENANT_ID, tx.id, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when transaction is already CANCELLED', async () => {
      const tx = createMockIntercompanyTransaction({
        status: IntercompanyStatus.CANCELLED,
        source_tenant_id: SOURCE_TENANT_ID,
      });

      icTxRepo.findOne.mockResolvedValue(tx);

      await expect(
        service.cancelTransaction(SOURCE_TENANT_ID, tx.id, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should post reversal entries and mark transaction as CANCELLED', async () => {
      const tx = createMockIntercompanyTransaction({
        status: IntercompanyStatus.POSTED,
        source_tenant_id: SOURCE_TENANT_ID,
        target_tenant_id: TARGET_TENANT_ID,
      });

      icTxRepo.findOne.mockResolvedValue(tx);

      const agreement = createMockIntercompanyAgreement();
      agreementRepo.findOne.mockResolvedValue(agreement);

      const cancelledTx = { ...tx, status: IntercompanyStatus.CANCELLED };

      dataSource.transaction.mockImplementation(async (cb: Function) => {
        const em = {
          query: jest.fn().mockResolvedValue(undefined),
          save: jest.fn().mockResolvedValue(cancelledTx),
          findOne: jest.fn().mockResolvedValue(agreement),
        };
        return cb(em);
      });

      // After cancel, getTransaction is called again
      icTxRepo.findOne.mockResolvedValueOnce(tx).mockResolvedValueOnce(cancelledTx);

      const result = await service.cancelTransaction(SOURCE_TENANT_ID, tx.id, mockUserId);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result.status).toBe(IntercompanyStatus.CANCELLED);
    });

    it('should throw NotFoundException when tenant is not a party to the transaction', async () => {
      const tx = createMockIntercompanyTransaction({
        source_tenant_id: 'other-tenant-A',
        target_tenant_id: 'other-tenant-B',
      });

      icTxRepo.findOne.mockResolvedValue(tx);

      await expect(
        service.cancelTransaction(SOURCE_TENANT_ID, tx.id, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // deleteAgreement
  // =========================================================================

  describe('deleteAgreement', () => {
    it('should throw ConflictException when open transactions exist', async () => {
      agreementRepo.findOne.mockResolvedValue(createMockIntercompanyAgreement());
      icTxRepo.count.mockResolvedValue(3); // open transactions

      await expect(
        service.deleteAgreement('agreement-1111'),
      ).rejects.toThrow(ConflictException);
    });

    it('should soft-delete (set is_active = false) when no open transactions', async () => {
      const agreement = createMockIntercompanyAgreement({ is_active: true });
      agreementRepo.findOne.mockResolvedValue(agreement);
      icTxRepo.count.mockResolvedValue(0);
      agreementRepo.save.mockResolvedValue({ ...agreement, is_active: false });

      await service.deleteAgreement('agreement-1111');

      expect(agreementRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });
  });
});
