import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import Decimal from 'decimal.js';
import {
  GLTransaction,
  ChartOfAccounts,
  AccountType,
  FinancialPeriod,
  InventoryLog,
  Item,
  Warehouse,
  CostLayer,
  SavedReport,
  ReportType,
  OutputFormat,
} from '@libs/database';
import { GenerateReportDto } from './dto/generate-report.dto';
import { CreateSavedReportDto } from './dto/create-saved-report.dto';
import { UpdateSavedReportDto } from './dto/update-saved-report.dto';
import { QueryReportsDto } from './dto/query-reports.dto';

// ---------------------------------------------------------------------------
// Shared interfaces for report payloads
// ---------------------------------------------------------------------------

export interface AccountBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  parent_id: string | null;
  total_debit: string;
  total_credit: string;
  balance: string;
}

export interface TrialBalanceReport {
  report_type: 'TRIAL_BALANCE';
  tenant_id: string;
  period_id?: string;
  start_date?: string;
  end_date?: string;
  generated_at: string;
  accounts: AccountBalance[];
  totals: {
    total_debit: string;
    total_credit: string;
    is_balanced: boolean;
    difference: string;
  };
}

export interface IncomeStatementSection {
  title: string;
  account_type: AccountType;
  accounts: Array<{ account_id: string; code: string; name: string; amount: string }>;
  subtotal: string;
}

export interface IncomeStatementReport {
  report_type: 'INCOME_STATEMENT';
  tenant_id: string;
  period_id?: string;
  start_date?: string;
  end_date?: string;
  generated_at: string;
  revenue: IncomeStatementSection;
  expenses: IncomeStatementSection;
  net_income: string;
}

export interface BalanceSheetReport {
  report_type: 'BALANCE_SHEET';
  tenant_id: string;
  as_of_date: string;
  generated_at: string;
  assets: { accounts: AccountBalance[]; total: string };
  liabilities: { accounts: AccountBalance[]; total: string };
  equity: { accounts: AccountBalance[]; total: string; retained_earnings: string };
  total_liabilities_equity: string;
  is_balanced: boolean;
}

export interface CashFlowReport {
  report_type: 'CASH_FLOW';
  tenant_id: string;
  period_id?: string;
  start_date?: string;
  end_date?: string;
  generated_at: string;
  operating: { items: Array<{ description: string; amount: string }>; subtotal: string };
  investing: { items: Array<{ description: string; amount: string }>; subtotal: string };
  financing: { items: Array<{ description: string; amount: string }>; subtotal: string };
  net_change_in_cash: string;
}

export interface GLDetailLine {
  id: string;
  posting_date: Date;
  journal_id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  description: string | null;
  debit: string;
  credit: string;
  running_balance: string;
  source_doc_type: string;
  source_doc_id: string;
  currency: string;
}

export interface GLDetailReport {
  report_type: 'GL_DETAIL';
  tenant_id: string;
  generated_at: string;
  page: number;
  limit: number;
  total: number;
  lines: GLDetailLine[];
}

export interface InventoryValuationLine {
  item_id: string;
  item_code: string;
  item_name: string;
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;
  costing_method: string;
  qty_on_hand: string;
  unit_cost: string;
  total_value: string;
}

export interface InventoryValuationReport {
  report_type: 'INVENTORY_VALUATION';
  tenant_id: string;
  generated_at: string;
  warehouse_id?: string;
  lines: InventoryValuationLine[];
  grand_total_value: string;
}

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  type?: 'string' | 'number' | 'date' | 'currency';
}

export interface ExportSheet {
  sheetName: string;
  columns: ExportColumn[];
  rows: Record<string, any>[];
  totalsRow?: Record<string, any>;
  title?: string;
  subtitle?: string;
}

export interface ExportData {
  reportType: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  sheets: ExportSheet[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectRepository(GLTransaction)
    private readonly glRepo: Repository<GLTransaction>,
    @InjectRepository(ChartOfAccounts)
    private readonly coaRepo: Repository<ChartOfAccounts>,
    @InjectRepository(FinancialPeriod)
    private readonly periodRepo: Repository<FinancialPeriod>,
    @InjectRepository(InventoryLog)
    private readonly inventoryLogRepo: Repository<InventoryLog>,
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(CostLayer)
    private readonly costLayerRepo: Repository<CostLayer>,
    @InjectRepository(SavedReport)
    private readonly savedReportRepo: Repository<SavedReport>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================================
  // FINANCIAL REPORTS
  // =========================================================================

  /**
   * Trial Balance: aggregate GL by account, validate debits == credits.
   */
  async generateTrialBalance(
    tenantId: string,
    periodId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<TrialBalanceReport> {
    const { start, end } = await this.resolveDateRange(tenantId, periodId, startDate, endDate);

    const qb = this.dataSource
      .createQueryBuilder()
      .select('gl.account_id', 'account_id')
      .addSelect('SUM(gl.debit)', 'total_debit')
      .addSelect('SUM(gl.credit)', 'total_credit')
      .from(GLTransaction, 'gl')
      .where('gl.tenant_id = :tenantId', { tenantId })
      .groupBy('gl.account_id');

    if (start) qb.andWhere('gl.posting_date >= :start', { start });
    if (end) qb.andWhere('gl.posting_date <= :end', { end });

    const rawRows: Array<{ account_id: string; total_debit: string; total_credit: string }> =
      await qb.getRawMany();

    if (!rawRows.length) {
      return this.emptyTrialBalance(tenantId, periodId, startDate, endDate);
    }

    const accountIds = rawRows.map((r) => r.account_id);
    const accounts = await this.coaRepo.find({ where: { id: In(accountIds) } });
    const coaMap = new Map(accounts.map((a) => [a.id, a]));

    let grandDebit = new Decimal(0);
    let grandCredit = new Decimal(0);

    const balances: AccountBalance[] = rawRows.map((row) => {
      const coa = coaMap.get(row.account_id);
      const debit = new Decimal(row.total_debit ?? '0');
      const credit = new Decimal(row.total_credit ?? '0');
      grandDebit = grandDebit.plus(debit);
      grandCredit = grandCredit.plus(credit);

      return {
        account_id: row.account_id,
        account_code: coa?.code ?? '',
        account_name: coa?.name ?? '',
        account_type: coa?.account_type ?? AccountType.ASSET,
        parent_id: coa?.parent_id ?? null,
        total_debit: debit.toFixed(4),
        total_credit: credit.toFixed(4),
        balance: debit.minus(credit).toFixed(4),
      };
    });

    balances.sort((a, b) => a.account_code.localeCompare(b.account_code));

    const difference = grandDebit.minus(grandCredit).abs();

    return {
      report_type: 'TRIAL_BALANCE',
      tenant_id: tenantId,
      period_id: periodId,
      start_date: start?.toISOString(),
      end_date: end?.toISOString(),
      generated_at: new Date().toISOString(),
      accounts: balances,
      totals: {
        total_debit: grandDebit.toFixed(4),
        total_credit: grandCredit.toFixed(4),
        is_balanced: difference.lessThanOrEqualTo('0.0001'),
        difference: difference.toFixed(4),
      },
    };
  }

  /**
   * Income Statement: Revenue minus Expenses = Net Income.
   */
  async generateIncomeStatement(
    tenantId: string,
    periodId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<IncomeStatementReport> {
    const { start, end } = await this.resolveDateRange(tenantId, periodId, startDate, endDate);

    const rows = await this.aggregateGLByType(tenantId, start, end, [
      AccountType.REVENUE,
      AccountType.EXPENSE,
    ]);

    const revenueAccounts: IncomeStatementSection['accounts'] = [];
    const expenseAccounts: IncomeStatementSection['accounts'] = [];
    let totalRevenue = new Decimal(0);
    let totalExpenses = new Decimal(0);

    for (const row of rows) {
      const debit = new Decimal(row.total_debit ?? '0');
      const credit = new Decimal(row.total_credit ?? '0');

      if (row.account_type === AccountType.REVENUE) {
        const amount = credit.minus(debit);
        totalRevenue = totalRevenue.plus(amount);
        revenueAccounts.push({
          account_id: row.account_id,
          code: row.account_code,
          name: row.account_name,
          amount: amount.toFixed(4),
        });
      } else if (row.account_type === AccountType.EXPENSE) {
        const amount = debit.minus(credit);
        totalExpenses = totalExpenses.plus(amount);
        expenseAccounts.push({
          account_id: row.account_id,
          code: row.account_code,
          name: row.account_name,
          amount: amount.toFixed(4),
        });
      }
    }

    revenueAccounts.sort((a, b) => a.code.localeCompare(b.code));
    expenseAccounts.sort((a, b) => a.code.localeCompare(b.code));

    const netIncome = totalRevenue.minus(totalExpenses);

    return {
      report_type: 'INCOME_STATEMENT',
      tenant_id: tenantId,
      period_id: periodId,
      start_date: start?.toISOString(),
      end_date: end?.toISOString(),
      generated_at: new Date().toISOString(),
      revenue: {
        title: 'Revenue',
        account_type: AccountType.REVENUE,
        accounts: revenueAccounts,
        subtotal: totalRevenue.toFixed(4),
      },
      expenses: {
        title: 'Expenses',
        account_type: AccountType.EXPENSE,
        accounts: expenseAccounts,
        subtotal: totalExpenses.toFixed(4),
      },
      net_income: netIncome.toFixed(4),
    };
  }

  /**
   * Balance Sheet: Assets = Liabilities + Equity (+ Retained Earnings).
   */
  async generateBalanceSheet(
    tenantId: string,
    asOfDate?: string,
  ): Promise<BalanceSheetReport> {
    const asOf = asOfDate ? new Date(asOfDate) : new Date();

    const rows = await this.aggregateGLByType(
      tenantId,
      undefined,
      asOf,
      [AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY, AccountType.REVENUE, AccountType.EXPENSE],
    );

    const assetAccounts: AccountBalance[] = [];
    const liabilityAccounts: AccountBalance[] = [];
    const equityAccounts: AccountBalance[] = [];
    let totalAssets = new Decimal(0);
    let totalLiabilities = new Decimal(0);
    let totalEquity = new Decimal(0);
    let cumulativeRevenue = new Decimal(0);
    let cumulativeExpenses = new Decimal(0);

    for (const row of rows) {
      const debit = new Decimal(row.total_debit ?? '0');
      const credit = new Decimal(row.total_credit ?? '0');

      const bal: AccountBalance = {
        account_id: row.account_id,
        account_code: row.account_code,
        account_name: row.account_name,
        account_type: row.account_type,
        parent_id: row.parent_id ?? null,
        total_debit: debit.toFixed(4),
        total_credit: credit.toFixed(4),
        balance: '0',
      };

      switch (row.account_type) {
        case AccountType.ASSET: {
          const balance = debit.minus(credit);
          bal.balance = balance.toFixed(4);
          totalAssets = totalAssets.plus(balance);
          assetAccounts.push(bal);
          break;
        }
        case AccountType.LIABILITY: {
          const balance = credit.minus(debit);
          bal.balance = balance.toFixed(4);
          totalLiabilities = totalLiabilities.plus(balance);
          liabilityAccounts.push(bal);
          break;
        }
        case AccountType.EQUITY: {
          const balance = credit.minus(debit);
          bal.balance = balance.toFixed(4);
          totalEquity = totalEquity.plus(balance);
          equityAccounts.push(bal);
          break;
        }
        case AccountType.REVENUE:
          cumulativeRevenue = cumulativeRevenue.plus(credit.minus(debit));
          break;
        case AccountType.EXPENSE:
          cumulativeExpenses = cumulativeExpenses.plus(debit.minus(credit));
          break;
      }
    }

    const retainedEarnings = cumulativeRevenue.minus(cumulativeExpenses);
    totalEquity = totalEquity.plus(retainedEarnings);
    const totalLiabilitiesEquity = totalLiabilities.plus(totalEquity);
    const difference = totalAssets.minus(totalLiabilitiesEquity).abs();

    assetAccounts.sort((a, b) => a.account_code.localeCompare(b.account_code));
    liabilityAccounts.sort((a, b) => a.account_code.localeCompare(b.account_code));
    equityAccounts.sort((a, b) => a.account_code.localeCompare(b.account_code));

    return {
      report_type: 'BALANCE_SHEET',
      tenant_id: tenantId,
      as_of_date: asOf.toISOString(),
      generated_at: new Date().toISOString(),
      assets: {
        accounts: assetAccounts,
        total: totalAssets.toFixed(4),
      },
      liabilities: {
        accounts: liabilityAccounts,
        total: totalLiabilities.toFixed(4),
      },
      equity: {
        accounts: equityAccounts,
        total: totalEquity.toFixed(4),
        retained_earnings: retainedEarnings.toFixed(4),
      },
      total_liabilities_equity: totalLiabilitiesEquity.toFixed(4),
      is_balanced: difference.lessThanOrEqualTo('0.0001'),
    };
  }

  /**
   * Cash Flow Statement (indirect method).
   */
  async generateCashFlow(
    tenantId: string,
    periodId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CashFlowReport> {
    const { start, end } = await this.resolveDateRange(tenantId, periodId, startDate, endDate);

    const incomeStatement = await this.generateIncomeStatement(tenantId, periodId, startDate, endDate);
    const netIncome = new Decimal(incomeStatement.net_income);

    const rows = await this.aggregateGLByType(tenantId, start, end, [
      AccountType.ASSET,
      AccountType.LIABILITY,
      AccountType.EQUITY,
    ]);

    const operatingItems: Array<{ description: string; amount: string }> = [
      { description: 'Net Income', amount: netIncome.toFixed(4) },
    ];
    const investingItems: Array<{ description: string; amount: string }> = [];
    const financingItems: Array<{ description: string; amount: string }> = [];

    let operatingSubtotal = new Decimal(netIncome);
    let investingSubtotal = new Decimal(0);
    let financingSubtotal = new Decimal(0);

    for (const row of rows) {
      const debit = new Decimal(row.total_debit ?? '0');
      const credit = new Decimal(row.total_credit ?? '0');
      const code = row.account_code ?? '';

      if (row.account_type === AccountType.ASSET) {
        const netChange = credit.minus(debit);
        const codeNum = parseInt(code, 10);
        if (!isNaN(codeNum) && codeNum >= 1500 && codeNum < 2000) {
          investingItems.push({ description: `Change in ${row.account_name}`, amount: netChange.toFixed(4) });
          investingSubtotal = investingSubtotal.plus(netChange);
        } else {
          if (!row.account_name.toLowerCase().includes('cash')) {
            operatingItems.push({ description: `Change in ${row.account_name}`, amount: netChange.toFixed(4) });
            operatingSubtotal = operatingSubtotal.plus(netChange);
          }
        }
      } else if (row.account_type === AccountType.LIABILITY) {
        const netChange = credit.minus(debit);
        const codeNum = parseInt(code, 10);
        if (!isNaN(codeNum) && codeNum >= 2500 && codeNum < 3000) {
          financingItems.push({ description: `Change in ${row.account_name}`, amount: netChange.toFixed(4) });
          financingSubtotal = financingSubtotal.plus(netChange);
        } else {
          operatingItems.push({ description: `Change in ${row.account_name}`, amount: netChange.toFixed(4) });
          operatingSubtotal = operatingSubtotal.plus(netChange);
        }
      } else if (row.account_type === AccountType.EQUITY) {
        const netChange = credit.minus(debit);
        if (!row.account_name.toLowerCase().includes('retained')) {
          financingItems.push({ description: `Change in ${row.account_name}`, amount: netChange.toFixed(4) });
          financingSubtotal = financingSubtotal.plus(netChange);
        }
      }
    }

    const netChangeCash = operatingSubtotal.plus(investingSubtotal).plus(financingSubtotal);

    return {
      report_type: 'CASH_FLOW',
      tenant_id: tenantId,
      period_id: periodId,
      start_date: start?.toISOString(),
      end_date: end?.toISOString(),
      generated_at: new Date().toISOString(),
      operating: { items: operatingItems, subtotal: operatingSubtotal.toFixed(4) },
      investing: { items: investingItems, subtotal: investingSubtotal.toFixed(4) },
      financing: { items: financingItems, subtotal: financingSubtotal.toFixed(4) },
      net_change_in_cash: netChangeCash.toFixed(4),
    };
  }

  // =========================================================================
  // DETAIL REPORTS
  // =========================================================================

  /**
   * GL Detail with running balance, paginated.
   */
  async generateGLDetail(
    tenantId: string,
    filters: {
      accountId?: string;
      periodId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<GLDetailReport> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 50));
    const skip = (page - 1) * limit;

    const qb = this.glRepo
      .createQueryBuilder('gl')
      .leftJoinAndSelect('gl.account', 'coa')
      .where('gl.tenant_id = :tenantId', { tenantId })
      .orderBy('gl.posting_date', 'ASC')
      .addOrderBy('gl.created_at', 'ASC');

    if (filters.accountId) {
      qb.andWhere('gl.account_id = :accountId', { accountId: filters.accountId });
    }
    if (filters.periodId) {
      qb.andWhere('gl.period_id = :periodId', { periodId: filters.periodId });
    }
    if (filters.startDate) {
      qb.andWhere('gl.posting_date >= :start', { start: new Date(filters.startDate) });
    }
    if (filters.endDate) {
      qb.andWhere('gl.posting_date <= :end', { end: new Date(filters.endDate) });
    }

    const total = await qb.getCount();
    const txns = await qb.skip(skip).take(limit).getMany();

    const balanceMap = new Map<string, Decimal>();
    const lines: GLDetailLine[] = txns.map((tx) => {
      const prev = balanceMap.get(tx.account_id) ?? new Decimal(0);
      const running = prev.plus(new Decimal(tx.debit)).minus(new Decimal(tx.credit));
      balanceMap.set(tx.account_id, running);

      return {
        id: tx.id,
        posting_date: tx.posting_date,
        journal_id: tx.journal_id,
        account_id: tx.account_id,
        account_code: (tx.account as any)?.code ?? '',
        account_name: (tx.account as any)?.name ?? '',
        description: tx.description,
        debit: new Decimal(tx.debit).toFixed(4),
        credit: new Decimal(tx.credit).toFixed(4),
        running_balance: running.toFixed(4),
        source_doc_type: tx.source_doc_type,
        source_doc_id: tx.source_doc_id,
        currency: tx.currency,
      };
    });

    return {
      report_type: 'GL_DETAIL',
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
      page,
      limit,
      total,
      lines,
    };
  }

  /**
   * Inventory Valuation: current qty-on-hand x unit cost per item/warehouse.
   */
  async generateInventoryValuation(
    tenantId: string,
    warehouseId?: string,
  ): Promise<InventoryValuationReport> {
    const layerQb = this.dataSource
      .createQueryBuilder()
      .select('cl.item_id', 'item_id')
      .addSelect('cl.warehouse_id', 'warehouse_id')
      .addSelect('SUM(cl.remaining_quantity)', 'qty_on_hand')
      .addSelect(
        'CASE WHEN SUM(cl.remaining_quantity) > 0 THEN SUM(cl.remaining_quantity * cl.unit_cost) / SUM(cl.remaining_quantity) ELSE 0 END',
        'unit_cost',
      )
      .addSelect('SUM(cl.remaining_quantity * cl.unit_cost)', 'total_value')
      .from(CostLayer, 'cl')
      .where('cl.tenant_id = :tenantId', { tenantId })
      .andWhere('cl.remaining_quantity > 0')
      .groupBy('cl.item_id')
      .addGroupBy('cl.warehouse_id');

    if (warehouseId) {
      layerQb.andWhere('cl.warehouse_id = :warehouseId', { warehouseId });
    }

    const rawLayers: Array<{
      item_id: string;
      warehouse_id: string;
      qty_on_hand: string;
      unit_cost: string;
      total_value: string;
    }> = await layerQb.getRawMany();

    if (!rawLayers.length) {
      return {
        report_type: 'INVENTORY_VALUATION',
        tenant_id: tenantId,
        generated_at: new Date().toISOString(),
        warehouse_id: warehouseId,
        lines: [],
        grand_total_value: '0.0000',
      };
    }

    const itemIds = [...new Set(rawLayers.map((r) => r.item_id))];
    const whIds = [...new Set(rawLayers.map((r) => r.warehouse_id))];
    const [items, warehouses] = await Promise.all([
      this.itemRepo.find({ where: { id: In(itemIds) } }),
      this.warehouseRepo.find({ where: { id: In(whIds) } }),
    ]);
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const whMap = new Map(warehouses.map((w) => [w.id, w]));

    let grandTotal = new Decimal(0);
    const lines: InventoryValuationLine[] = rawLayers.map((row) => {
      const item = itemMap.get(row.item_id);
      const wh = whMap.get(row.warehouse_id);
      const totalValue = new Decimal(row.total_value ?? '0');
      grandTotal = grandTotal.plus(totalValue);

      return {
        item_id: row.item_id,
        item_code: item?.code ?? '',
        item_name: item?.name ?? '',
        warehouse_id: row.warehouse_id,
        warehouse_code: wh?.code ?? '',
        warehouse_name: wh?.name ?? '',
        costing_method: item?.costing_method ?? 'FIFO',
        qty_on_hand: new Decimal(row.qty_on_hand ?? '0').toFixed(4),
        unit_cost: new Decimal(row.unit_cost ?? '0').toFixed(4),
        total_value: totalValue.toFixed(4),
      };
    });

    lines.sort((a, b) => a.item_code.localeCompare(b.item_code));

    return {
      report_type: 'INVENTORY_VALUATION',
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
      warehouse_id: warehouseId,
      lines,
      grand_total_value: grandTotal.toFixed(4),
    };
  }

  // =========================================================================
  // CUSTOM QUERY
  // =========================================================================

  async executeCustomQuery(
    tenantId: string,
    queryConfig: Record<string, any>,
  ): Promise<any> {
    const { reportType, periodId, startDate, endDate, accountIds, warehouseId, asOfDate, page, limit } =
      queryConfig;

    switch (reportType as ReportType) {
      case ReportType.TRIAL_BALANCE:
        return this.generateTrialBalance(tenantId, periodId, startDate, endDate);
      case ReportType.INCOME_STATEMENT:
        return this.generateIncomeStatement(tenantId, periodId, startDate, endDate);
      case ReportType.BALANCE_SHEET:
        return this.generateBalanceSheet(tenantId, asOfDate);
      case ReportType.CASH_FLOW:
        return this.generateCashFlow(tenantId, periodId, startDate, endDate);
      case ReportType.GL_DETAIL:
        return this.generateGLDetail(tenantId, {
          accountId: accountIds?.[0],
          periodId,
          startDate,
          endDate,
          page,
          limit,
        });
      case ReportType.INVENTORY_VALUATION:
        return this.generateInventoryValuation(tenantId, warehouseId);
      default:
        throw new BadRequestException(`Unsupported report type in queryConfig: ${reportType}`);
    }
  }

  // =========================================================================
  // EXPORT
  // =========================================================================

  exportToExcel(reportData: any, reportType: ReportType): ExportData {
    const title = this.reportTypeLabel(reportType);
    const subtitle = `Generated: ${new Date().toISOString()}`;

    switch (reportType) {
      case ReportType.TRIAL_BALANCE:
        return this.trialBalanceExportData(reportData as TrialBalanceReport, title, subtitle);
      case ReportType.INCOME_STATEMENT:
        return this.incomeStatementExportData(reportData as IncomeStatementReport, title, subtitle);
      case ReportType.BALANCE_SHEET:
        return this.balanceSheetExportData(reportData as BalanceSheetReport, title, subtitle);
      case ReportType.GL_DETAIL:
        return this.glDetailExportData(reportData as GLDetailReport, title, subtitle);
      case ReportType.INVENTORY_VALUATION:
        return this.inventoryValuationExportData(reportData as InventoryValuationReport, title, subtitle);
      default:
        return {
          reportType,
          title,
          subtitle,
          generatedAt: new Date().toISOString(),
          sheets: [
            {
              sheetName: 'Report',
              title,
              subtitle,
              columns: [{ header: 'Data', key: 'data' }],
              rows: [{ data: JSON.stringify(reportData) }],
            },
          ],
        };
    }
  }

  exportToPdf(reportData: any, reportType: ReportType): ExportData {
    return this.exportToExcel(reportData, reportType);
  }

  buildXlsxBuffer(exportData: ExportData): Buffer {
    const sheets = exportData.sheets;

    const sharedStrings: string[] = [];
    const sharedStringMap = new Map<string, number>();

    function ssIndex(value: string): number {
      if (sharedStringMap.has(value)) return sharedStringMap.get(value)!;
      const idx = sharedStrings.length;
      sharedStrings.push(value);
      sharedStringMap.set(value, idx);
      return idx;
    }

    function escapeXml(str: string): string {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    function colLetter(n: number): string {
      let s = '';
      let col = n;
      while (col > 0) {
        col--;
        s = String.fromCharCode(65 + (col % 26)) + s;
        col = Math.floor(col / 26);
      }
      return s;
    }

    const worksheetXmls: string[] = [];

    for (const sheet of sheets) {
      const allRows: Array<Record<string, any>> = [];
      if (sheet.title) allRows.push({ _title: sheet.title });
      if (sheet.subtitle) allRows.push({ _subtitle: sheet.subtitle });
      allRows.push({});
      const headerRow: Record<string, any> = {};
      sheet.columns.forEach((col) => { headerRow[col.key] = col.header; });
      allRows.push(headerRow);
      allRows.push(...sheet.rows);
      if (sheet.totalsRow) allRows.push(sheet.totalsRow);

      let rowXml = '';
      allRows.forEach((row, rowIdx) => {
        const rNum = rowIdx + 1;
        let cellXml = '';
        const keys = Object.keys(row);
        keys.forEach((key, colIdx) => {
          const cellRef = `${colLetter(colIdx + 1)}${rNum}`;
          const val = row[key];
          if (val === null || val === undefined || val === '') return;
          const strVal = String(val);
          const num = Number(strVal);
          if (!isNaN(num) && strVal.trim() !== '') {
            cellXml += `<c r="${cellRef}" t="n"><v>${escapeXml(strVal)}</v></c>`;
          } else {
            const idx = ssIndex(strVal);
            cellXml += `<c r="${cellRef}" t="s"><v>${idx}</v></c>`;
          }
        });
        if (cellXml) rowXml += `<row r="${rNum}">${cellXml}</row>`;
      });

      worksheetXmls.push(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
          `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
          `<sheetData>${rowXml}</sheetData></worksheet>`,
      );
    }

    const ssXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">` +
      sharedStrings.map((s) => `<si><t>${escapeXml(s)}</t></si>`).join('') +
      `</sst>`;

    const sheetsRefXml = sheets
      .map((s, i) => `<sheet name="${escapeXml(s.sheetName)}" sheetId="${i + 1}" r:id="rId${i + 2}"/>`)
      .join('');
    const workbookXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets>${sheetsRefXml}</sheets></workbook>`;

    const wbRelsXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
      sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
        )
        .join('') +
      `</Relationships>`;

    const contentTypesXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
      sheets
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        )
        .join('') +
      `</Types>`;

    const rootRelsXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`;

    const files: Array<{ name: string; data: Buffer }> = [
      { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf8') },
      { name: '_rels/.rels', data: Buffer.from(rootRelsXml, 'utf8') },
      { name: 'xl/workbook.xml', data: Buffer.from(workbookXml, 'utf8') },
      { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(wbRelsXml, 'utf8') },
      { name: 'xl/sharedStrings.xml', data: Buffer.from(ssXml, 'utf8') },
      ...worksheetXmls.map((xml, i) => ({
        name: `xl/worksheets/sheet${i + 1}.xml`,
        data: Buffer.from(xml, 'utf8'),
      })),
    ];

    return this.packZip(files);
  }

  buildPdfBuffer(exportData: ExportData): Buffer {
    const sheetHtml = exportData.sheets
      .map((sheet) => {
        const headerCells = sheet.columns.map((c) => `<th>${this.escapeHtml(c.header)}</th>`).join('');
        const dataRows = sheet.rows
          .map(
            (row) =>
              `<tr>${sheet.columns
                .map((c) => `<td>${this.escapeHtml(String(row[c.key] ?? ''))}</td>`)
                .join('')}</tr>`,
          )
          .join('');
        const totalsRow = sheet.totalsRow
          ? `<tr class="totals">${sheet.columns
              .map((c) => `<td><strong>${this.escapeHtml(String(sheet.totalsRow![c.key] ?? ''))}</strong></td>`)
              .join('')}</tr>`
          : '';

        return `
          <div class="section">
            ${sheet.title ? `<h2>${this.escapeHtml(sheet.title)}</h2>` : ''}
            ${sheet.subtitle ? `<p class="subtitle">${this.escapeHtml(sheet.subtitle)}</p>` : ''}
            <table>
              <thead><tr>${headerCells}</tr></thead>
              <tbody>${dataRows}${totalsRow}</tbody>
            </table>
          </div>`;
      })
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${this.escapeHtml(exportData.title)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 10pt; margin: 20px; color: #333; }
  h1 { font-size: 14pt; margin-bottom: 4px; }
  h2 { font-size: 11pt; margin-top: 16px; margin-bottom: 4px; color: #555; }
  p.subtitle { font-size: 9pt; color: #888; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #2c3e50; color: #fff; padding: 6px 8px; text-align: left; font-size: 9pt; }
  td { padding: 4px 8px; border-bottom: 1px solid #eee; font-size: 9pt; }
  tr:nth-child(even) td { background: #f9f9f9; }
  tr.totals td { border-top: 2px solid #2c3e50; background: #ecf0f1; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h1>${this.escapeHtml(exportData.title)}</h1>
<p class="subtitle">${this.escapeHtml(exportData.subtitle)}</p>
${sheetHtml}
</body>
</html>`;

    return Buffer.from(html, 'utf8');
  }

  // =========================================================================
  // SAVED REPORTS
  // =========================================================================

  async createSavedReport(
    tenantId: string,
    dto: CreateSavedReportDto,
    userId: string,
  ): Promise<SavedReport> {
    const report = this.savedReportRepo.create({
      tenant_id: tenantId,
      name: dto.name,
      description: dto.description,
      report_type: dto.reportType,
      query_config: dto.queryConfig,
      output_format: dto.outputFormat ?? OutputFormat.JSON,
      schedule: dto.schedule ?? null,
      created_by: userId,
      last_run_at: null,
    });
    return this.savedReportRepo.save(report);
  }

  async updateSavedReport(
    tenantId: string,
    id: string,
    dto: UpdateSavedReportDto,
  ): Promise<SavedReport> {
    const report = await this.findSavedReportOrFail(id, tenantId);
    if (dto.name !== undefined) report.name = dto.name;
    if (dto.description !== undefined) report.description = dto.description ?? '';
    if (dto.reportType !== undefined) report.report_type = dto.reportType;
    if (dto.queryConfig !== undefined) report.query_config = dto.queryConfig;
    if (dto.outputFormat !== undefined) report.output_format = dto.outputFormat;
    if (dto.schedule !== undefined) report.schedule = dto.schedule ?? null;
    return this.savedReportRepo.save(report);
  }

  async deleteSavedReport(tenantId: string, id: string): Promise<void> {
    const report = await this.findSavedReportOrFail(id, tenantId);
    await this.savedReportRepo.remove(report);
  }

  async listSavedReports(
    tenantId: string,
    query: QueryReportsDto,
  ): Promise<{ data: SavedReport[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.savedReportRepo
      .createQueryBuilder('sr')
      .where('sr.tenant_id = :tenantId', { tenantId })
      .orderBy('sr.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.reportType) {
      qb.andWhere('sr.report_type = :reportType', { reportType: query.reportType });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getSavedReport(tenantId: string, id: string): Promise<SavedReport> {
    return this.findSavedReportOrFail(id, tenantId);
  }

  async runSavedReport(tenantId: string, id: string): Promise<any> {
    const report = await this.findSavedReportOrFail(id, tenantId);
    const result = await this.executeCustomQuery(tenantId, {
      reportType: report.report_type,
      ...report.query_config,
    });
    report.last_run_at = new Date();
    await this.savedReportRepo.save(report);
    return result;
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================

  private async findSavedReportOrFail(id: string, tenantId: string): Promise<SavedReport> {
    const report = await this.savedReportRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!report) throw new NotFoundException(`Saved report ${id} not found`);
    return report;
  }

  private async resolveDateRange(
    tenantId: string,
    periodId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ start: Date | undefined; end: Date | undefined }> {
    if (periodId) {
      const period = await this.periodRepo.findOne({ where: { id: periodId, tenant_id: tenantId } });
      if (!period) throw new NotFoundException(`Financial period ${periodId} not found`);
      return { start: new Date(period.start_date), end: new Date(period.end_date) };
    }
    return {
      start: startDate ? new Date(startDate) : undefined,
      end: endDate ? new Date(endDate) : undefined,
    };
  }

  private async aggregateGLByType(
    tenantId: string,
    start: Date | undefined,
    end: Date | undefined,
    accountTypes: AccountType[],
  ): Promise<
    Array<{
      account_id: string;
      account_code: string;
      account_name: string;
      account_type: AccountType;
      parent_id: string | null;
      total_debit: string;
      total_credit: string;
    }>
  > {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('gl.account_id', 'account_id')
      .addSelect('coa.code', 'account_code')
      .addSelect('coa.name', 'account_name')
      .addSelect('coa.account_type', 'account_type')
      .addSelect('coa.parent_id', 'parent_id')
      .addSelect('SUM(gl.debit)', 'total_debit')
      .addSelect('SUM(gl.credit)', 'total_credit')
      .from(GLTransaction, 'gl')
      .innerJoin(ChartOfAccounts, 'coa', 'coa.id = gl.account_id AND coa.tenant_id = gl.tenant_id')
      .where('gl.tenant_id = :tenantId', { tenantId })
      .andWhere('coa.account_type IN (:...accountTypes)', { accountTypes })
      .groupBy('gl.account_id')
      .addGroupBy('coa.code')
      .addGroupBy('coa.name')
      .addGroupBy('coa.account_type')
      .addGroupBy('coa.parent_id');

    if (start) qb.andWhere('gl.posting_date >= :start', { start });
    if (end) qb.andWhere('gl.posting_date <= :end', { end });

    return qb.getRawMany();
  }

  private emptyTrialBalance(
    tenantId: string,
    periodId?: string,
    startDate?: string,
    endDate?: string,
  ): TrialBalanceReport {
    return {
      report_type: 'TRIAL_BALANCE',
      tenant_id: tenantId,
      period_id: periodId,
      start_date: startDate,
      end_date: endDate,
      generated_at: new Date().toISOString(),
      accounts: [],
      totals: { total_debit: '0.0000', total_credit: '0.0000', is_balanced: true, difference: '0.0000' },
    };
  }

  private reportTypeLabel(rt: ReportType): string {
    const labels: Record<ReportType, string> = {
      [ReportType.TRIAL_BALANCE]: 'Trial Balance',
      [ReportType.INCOME_STATEMENT]: 'Income Statement (P&L)',
      [ReportType.BALANCE_SHEET]: 'Balance Sheet',
      [ReportType.CASH_FLOW]: 'Cash Flow Statement',
      [ReportType.GL_DETAIL]: 'General Ledger Detail',
      [ReportType.INVENTORY_VALUATION]: 'Inventory Valuation',
      [ReportType.CUSTOM]: 'Custom Report',
    };
    return labels[rt] ?? rt;
  }

  private trialBalanceExportData(data: TrialBalanceReport, title: string, subtitle: string): ExportData {
    const columns: ExportColumn[] = [
      { header: 'Code', key: 'account_code', width: 12 },
      { header: 'Account Name', key: 'account_name', width: 40 },
      { header: 'Type', key: 'account_type', width: 12 },
      { header: 'Debit', key: 'total_debit', width: 16, type: 'currency' },
      { header: 'Credit', key: 'total_credit', width: 16, type: 'currency' },
      { header: 'Balance', key: 'balance', width: 16, type: 'currency' },
    ];
    return {
      reportType: data.report_type,
      title,
      subtitle: `${subtitle} | Balanced: ${data.totals.is_balanced}`,
      generatedAt: data.generated_at,
      sheets: [
        {
          sheetName: 'Trial Balance',
          title,
          subtitle,
          columns,
          rows: data.accounts,
          totalsRow: {
            account_code: '',
            account_name: 'TOTAL',
            account_type: '',
            total_debit: data.totals.total_debit,
            total_credit: data.totals.total_credit,
            balance: '',
          },
        },
      ],
    };
  }

  private incomeStatementExportData(data: IncomeStatementReport, title: string, subtitle: string): ExportData {
    const columns: ExportColumn[] = [
      { header: 'Code', key: 'code', width: 12 },
      { header: 'Account Name', key: 'name', width: 40 },
      { header: 'Amount', key: 'amount', width: 18, type: 'currency' },
    ];
    const revenueRows = [
      { code: '', name: '--- REVENUE ---', amount: '' },
      ...data.revenue.accounts,
      { code: '', name: 'Total Revenue', amount: data.revenue.subtotal },
      { code: '', name: '', amount: '' },
      { code: '', name: '--- EXPENSES ---', amount: '' },
      ...data.expenses.accounts,
      { code: '', name: 'Total Expenses', amount: data.expenses.subtotal },
      { code: '', name: '', amount: '' },
      { code: '', name: 'NET INCOME', amount: data.net_income },
    ];
    return {
      reportType: data.report_type,
      title,
      subtitle,
      generatedAt: data.generated_at,
      sheets: [{ sheetName: 'Income Statement', title, subtitle, columns, rows: revenueRows }],
    };
  }

  private balanceSheetExportData(data: BalanceSheetReport, title: string, subtitle: string): ExportData {
    const columns: ExportColumn[] = [
      { header: 'Code', key: 'account_code', width: 12 },
      { header: 'Account Name', key: 'account_name', width: 40 },
      { header: 'Balance', key: 'balance', width: 18, type: 'currency' },
    ];
    const rows: Record<string, any>[] = [
      { account_code: '', account_name: '=== ASSETS ===', balance: '' },
      ...data.assets.accounts,
      { account_code: '', account_name: 'Total Assets', balance: data.assets.total },
      { account_code: '', account_name: '', balance: '' },
      { account_code: '', account_name: '=== LIABILITIES ===', balance: '' },
      ...data.liabilities.accounts,
      { account_code: '', account_name: 'Total Liabilities', balance: data.liabilities.total },
      { account_code: '', account_name: '', balance: '' },
      { account_code: '', account_name: '=== EQUITY ===', balance: '' },
      ...data.equity.accounts,
      { account_code: '', account_name: 'Retained Earnings', balance: data.equity.retained_earnings },
      { account_code: '', account_name: 'Total Equity', balance: data.equity.total },
      { account_code: '', account_name: '', balance: '' },
      { account_code: '', account_name: 'Total Liabilities + Equity', balance: data.total_liabilities_equity },
    ];
    return {
      reportType: data.report_type,
      title,
      subtitle: `${subtitle} | As of: ${data.as_of_date} | Balanced: ${data.is_balanced}`,
      generatedAt: data.generated_at,
      sheets: [{ sheetName: 'Balance Sheet', title, subtitle, columns, rows }],
    };
  }

  private glDetailExportData(data: GLDetailReport, title: string, subtitle: string): ExportData {
    const columns: ExportColumn[] = [
      { header: 'Date', key: 'posting_date', width: 14, type: 'date' },
      { header: 'Journal ID', key: 'journal_id', width: 38 },
      { header: 'Account Code', key: 'account_code', width: 14 },
      { header: 'Account Name', key: 'account_name', width: 36 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Debit', key: 'debit', width: 16, type: 'currency' },
      { header: 'Credit', key: 'credit', width: 16, type: 'currency' },
      { header: 'Running Balance', key: 'running_balance', width: 18, type: 'currency' },
      { header: 'Doc Type', key: 'source_doc_type', width: 14 },
      { header: 'Currency', key: 'currency', width: 10 },
    ];
    return {
      reportType: data.report_type,
      title,
      subtitle: `${subtitle} | Page ${data.page}/${Math.ceil(data.total / data.limit)}`,
      generatedAt: data.generated_at,
      sheets: [{ sheetName: 'GL Detail', title, subtitle, columns, rows: data.lines }],
    };
  }

  private inventoryValuationExportData(data: InventoryValuationReport, title: string, subtitle: string): ExportData {
    const columns: ExportColumn[] = [
      { header: 'Item Code', key: 'item_code', width: 14 },
      { header: 'Item Name', key: 'item_name', width: 36 },
      { header: 'Warehouse', key: 'warehouse_name', width: 24 },
      { header: 'Costing Method', key: 'costing_method', width: 16 },
      { header: 'Qty on Hand', key: 'qty_on_hand', width: 14, type: 'number' },
      { header: 'Unit Cost', key: 'unit_cost', width: 16, type: 'currency' },
      { header: 'Total Value', key: 'total_value', width: 18, type: 'currency' },
    ];
    return {
      reportType: data.report_type,
      title,
      subtitle,
      generatedAt: data.generated_at,
      sheets: [
        {
          sheetName: 'Inventory Valuation',
          title,
          subtitle,
          columns,
          rows: data.lines,
          totalsRow: {
            item_code: '',
            item_name: 'GRAND TOTAL',
            warehouse_name: '',
            costing_method: '',
            qty_on_hand: '',
            unit_cost: '',
            total_value: data.grand_total_value,
          },
        },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Minimal ZIP packer (no external dependencies)
  // ---------------------------------------------------------------------------

  private packZip(files: Array<{ name: string; data: Buffer }>): Buffer {
    const localHeaders: Buffer[] = [];
    const centralDirs: Buffer[] = [];
    let offset = 0;

    const crc32Table = this.buildCrc32Table();

    for (const file of files) {
      const nameBytes = Buffer.from(file.name, 'utf8');
      const data = file.data;
      const crc = this.crc32(crc32Table, data);

      const local = Buffer.alloc(30 + nameBytes.length + data.length);
      let pos = 0;
      local.writeUInt32LE(0x04034b50, pos); pos += 4;
      local.writeUInt16LE(20, pos); pos += 2;
      local.writeUInt16LE(0, pos); pos += 2;
      local.writeUInt16LE(0, pos); pos += 2;
      local.writeUInt16LE(0, pos); pos += 2;
      local.writeUInt16LE(0, pos); pos += 2;
      local.writeUInt32LE(crc, pos); pos += 4;
      local.writeUInt32LE(data.length, pos); pos += 4;
      local.writeUInt32LE(data.length, pos); pos += 4;
      local.writeUInt16LE(nameBytes.length, pos); pos += 2;
      local.writeUInt16LE(0, pos); pos += 2;
      nameBytes.copy(local, pos); pos += nameBytes.length;
      data.copy(local, pos);
      localHeaders.push(local);

      const central = Buffer.alloc(46 + nameBytes.length);
      let cp = 0;
      central.writeUInt32LE(0x02014b50, cp); cp += 4;
      central.writeUInt16LE(20, cp); cp += 2;
      central.writeUInt16LE(20, cp); cp += 2;
      central.writeUInt16LE(0, cp); cp += 2;
      central.writeUInt16LE(0, cp); cp += 2;
      central.writeUInt16LE(0, cp); cp += 2;
      central.writeUInt16LE(0, cp); cp += 2;
      central.writeUInt32LE(crc, cp); cp += 4;
      central.writeUInt32LE(data.length, cp); cp += 4;
      central.writeUInt32LE(data.length, cp); cp += 4;
      central.writeUInt16LE(nameBytes.length, cp); cp += 2;
      central.writeUInt16LE(0, cp); cp += 2;
      central.writeUInt16LE(0, cp); cp += 2;
      central.writeUInt16LE(0, cp); cp += 2;
      central.writeUInt16LE(0, cp); cp += 2;
      central.writeUInt32LE(0, cp); cp += 4;
      central.writeUInt32LE(offset, cp); cp += 4;
      nameBytes.copy(central, cp);
      centralDirs.push(central);

      offset += local.length;
    }

    const centralDir = Buffer.concat(centralDirs);
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0);
    endRecord.writeUInt16LE(0, 4);
    endRecord.writeUInt16LE(0, 6);
    endRecord.writeUInt16LE(files.length, 8);
    endRecord.writeUInt16LE(files.length, 10);
    endRecord.writeUInt32LE(centralDir.length, 12);
    endRecord.writeUInt32LE(offset, 16);
    endRecord.writeUInt16LE(0, 20);

    return Buffer.concat([...localHeaders, centralDir, endRecord]);
  }

  private buildCrc32Table(): Uint32Array {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }
    return table;
  }

  private crc32(table: Uint32Array, buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
