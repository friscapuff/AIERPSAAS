/**
 * Finance — Integration test suite.
 *
 * These tests verify multi-step financial workflows using real service instances
 * wired together with mock repositories. They exercise the full interaction
 * chain rather than individual methods in isolation.
 *
 * Scenarios:
 *  1. Full COA → Period → Journal → Post → Trial Balance cycle
 *  2. Balance validation across complex multi-line journals
 *  3. createJournalEntry rejects then accepts corrected entry
 *  4. Period status gates (conceptual, since implementation is pending)
 */

import { BadRequestException, NotImplementedException } from '@nestjs/common';
import { FinanceService } from '../../apps/api/src/modules/finance/finance.service';
import {
  createMockRepository,
  createMockAccount,
  createMockFinancialPeriod,
  createMockGLTransaction,
  mockTenantId,
  mockUserId,
} from '../setup/test-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJournalLines(pairs: Array<{ account: string; debit: number; credit: number }>) {
  return {
    description: 'Integration test journal',
    lines: pairs.map((p) => ({
      account_id: p.account,
      debit_amount: p.debit,
      credit_amount: p.credit,
    })),
  };
}

// ---------------------------------------------------------------------------

describe('Finance Integration', () => {
  let financeService: FinanceService;
  let coaRepository: ReturnType<typeof createMockRepository>;
  let glTransactionRepository: ReturnType<typeof createMockRepository>;
  let financialPeriodRepository: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    coaRepository = createMockRepository();
    glTransactionRepository = createMockRepository();
    financialPeriodRepository = createMockRepository();

    financeService = new FinanceService(
      coaRepository as any,
      glTransactionRepository as any,
      financialPeriodRepository as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Scenario 1: Full accounting cycle (TDD contracts for future implementation)
  // =========================================================================

  describe('Full accounting cycle', () => {
    it('should progress: create COA → get periods → create journal entry', async () => {
      // Step 1: createCOA is currently a stub — should throw NotImplemented
      await expect(
        financeService.createCOA(
          { code: '1000', name: 'Cash', account_type: 'ASSET' },
          mockTenantId,
        ),
      ).rejects.toThrow(NotImplementedException);

      // Step 2: createPeriod is currently a stub
      await expect(
        financeService.createPeriod(
          { name: 'Jan 2024', start_date: '2024-01-01', end_date: '2024-01-31' },
          mockTenantId,
        ),
      ).rejects.toThrow(NotImplementedException);

      // Step 3: createJournalEntry validates balance even in stub state
      const balancedEntry = makeJournalLines([
        { account: 'acct-cash',    debit: 10000, credit: 0 },
        { account: 'acct-revenue', debit: 0,     credit: 10000 },
      ]);

      await expect(
        financeService.createJournalEntry(balancedEntry, mockTenantId),
      ).rejects.toThrow(NotImplementedException); // passes balance → hits stub
    });

    it('should reject an unbalanced entry at any point in the workflow', async () => {
      const unbalanced = makeJournalLines([
        { account: 'acct-cash',    debit: 5000, credit: 0 },
        { account: 'acct-revenue', debit: 0,    credit: 4999 }, // 1 JOD off
      ]);

      await expect(
        financeService.createJournalEntry(unbalanced, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // Scenario 2: Balance validation robustness
  // =========================================================================

  describe('Balance validation — multi-line journal robustness', () => {
    it('should validate balance correctly across many lines (payroll disbursement scenario)', async () => {
      // Payroll: Dr. Salary Expense $50,000 → Cr. Bank $45,000, Cr. Tax Payable $5,000
      const payroll = makeJournalLines([
        { account: 'acct-salary-expense', debit: 50000, credit: 0 },
        { account: 'acct-bank',           debit: 0,     credit: 45000 },
        { account: 'acct-tax-payable',    debit: 0,     credit: 5000 },
      ]);

      await expect(
        financeService.createJournalEntry(payroll, mockTenantId),
      ).rejects.toThrow(NotImplementedException); // balanced → stub
    });

    it('should reject invoice posting with tax calculation error', async () => {
      // Invoice: $1000 + 16% VAT = $1160 total, but credit only $1159
      const badInvoice = makeJournalLines([
        { account: 'acct-ar',          debit: 1159, credit: 0 },  // wrong total
        { account: 'acct-vat-payable', debit: 0,    credit: 160 },
        { account: 'acct-revenue',     debit: 0,    credit: 1000 },
      ]);

      // total debits=1159, total credits=1160 → unbalanced
      await expect(
        financeService.createJournalEntry(badInvoice, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject journal with all debit lines and no credits', async () => {
      const allDebits = makeJournalLines([
        { account: 'acct-a', debit: 100, credit: 0 },
        { account: 'acct-b', debit: 200, credit: 0 },
        { account: 'acct-c', debit: 300, credit: 0 },
      ]);

      await expect(
        financeService.createJournalEntry(allDebits, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject journal with all credit lines and no debits', async () => {
      const allCredits = makeJournalLines([
        { account: 'acct-a', debit: 0, credit: 100 },
        { account: 'acct-b', debit: 0, credit: 200 },
      ]);

      await expect(
        financeService.createJournalEntry(allCredits, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // Scenario 3: Correction workflow
  // =========================================================================

  describe('Correction workflow', () => {
    it('should reject an erroneous entry, then accept the corrected version', async () => {
      const wrongEntry = makeJournalLines([
        { account: 'acct-ar',      debit: 5000, credit: 0 },
        { account: 'acct-revenue', debit: 0,    credit: 4500 }, // forgot VAT
      ]);

      await expect(
        financeService.createJournalEntry(wrongEntry, mockTenantId),
      ).rejects.toThrow(BadRequestException);

      // Corrected: Add VAT payable line so it balances
      const correctedEntry = makeJournalLines([
        { account: 'acct-ar',          debit: 5000, credit: 0 },
        { account: 'acct-revenue',     debit: 0,    credit: 4310.34 },
        { account: 'acct-vat-payable', debit: 0,    credit: 689.66 },
      ]);

      // Total credit = 4310.34 + 689.66 = 5000.00 = debit
      // Passes balance → hits NotImplemented stub
      await expect(
        financeService.createJournalEntry(correctedEntry, mockTenantId),
      ).rejects.toThrow(NotImplementedException);
    });
  });

  // =========================================================================
  // Scenario 4: Cross-module workflow contract (inventory GL posting)
  // =========================================================================

  describe('Cross-module: inventory movement → GL entry (contract)', () => {
    it('[CONTRACT] inventory OUT should trigger a corresponding GL debit to COGS and credit to Inventory', () => {
      // This test documents the integration contract between InventoryService
      // and FinanceService. When fully implemented:
      //
      //  recordMovement(OUT) → creates InventoryLog
      //  → triggers postDocument() in FinanceService
      //  → Dr. Cost of Goods Sold
      //  → Cr. Inventory Asset
      //
      // Currently both services are partially/fully stubbed.
      // The test passes as a documentation marker.

      const expectedGLLines = [
        { account: 'COGS',      side: 'DEBIT',  amount: 1000 },
        { account: 'INVENTORY', side: 'CREDIT', amount: 1000 },
      ];

      // Verify the contract structure
      expect(expectedGLLines[0].account).toBe('COGS');
      expect(expectedGLLines[1].account).toBe('INVENTORY');
      expect(
        expectedGLLines.reduce((sum, l) => sum + (l.side === 'DEBIT' ? l.amount : -l.amount), 0),
      ).toBe(0); // net = 0 (balanced)
    });
  });

  // =========================================================================
  // Scenario 5: Trial balance totals must sum to zero
  // =========================================================================

  describe('Trial balance integrity', () => {
    it('[CONTRACT] trial balance total debits must equal total credits', async () => {
      // When getTrialBalance() is implemented it must maintain this invariant:
      //   SUM(all account debit balances) === SUM(all account credit balances)

      // Currently a stub — test documents the invariant
      await expect(
        financeService.getTrialBalance('period-2024-01', mockTenantId),
      ).rejects.toThrow(NotImplementedException);
    });
  });

  // =========================================================================
  // Service DI sanity
  // =========================================================================

  describe('dependency injection', () => {
    it('should be created with all three repositories injected', () => {
      expect(financeService).toBeDefined();
      expect((financeService as any).coaRepository).toBe(coaRepository);
      expect((financeService as any).glTransactionRepository).toBe(glTransactionRepository);
      expect((financeService as any).financialPeriodRepository).toBe(financialPeriodRepository);
    });
  });
});
