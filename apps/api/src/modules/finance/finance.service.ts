import { Injectable, NotImplementedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChartOfAccounts, GlTransaction, FinancialPeriod } from '@libs/database';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(ChartOfAccounts)
    private coaRepository: Repository<ChartOfAccounts>,
    @InjectRepository(GlTransaction)
    private glTransactionRepository: Repository<GlTransaction>,
    @InjectRepository(FinancialPeriod)
    private financialPeriodRepository: Repository<FinancialPeriod>,
  ) {}

  // ─── Chart of Accounts ────────────────────────────────────────────────

  async getCOA(tenantId: string): Promise<ChartOfAccounts[]> {
    return this.coaRepository.find({
      where: { tenant_id: tenantId },
      order: { code: 'ASC' },
    });
  }

  async getCOATree(tenantId: string): Promise<any[]> {
    const accounts = await this.coaRepository.find({
      where: { tenant_id: tenantId },
      order: { code: 'ASC' },
    });

    // Build tree from flat list
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const acct of accounts) {
      map.set(acct.id, {
        id: acct.id,
        code: acct.code,
        name: acct.name,
        type: acct.account_type,
        parentId: acct.parent_id,
        balance: Number(acct.balance) || 0,
        isActive: acct.is_active,
        level: acct.level,
        currency: 'JOD',
        children: [],
      });
    }

    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async createCOA(dto: any, tenantId: string): Promise<ChartOfAccounts> {
    const account = this.coaRepository.create({
      tenant_id: tenantId,
      code: dto.account_code || dto.code,
      name: dto.account_name || dto.name,
      account_type: dto.account_type || dto.type,
      parent_id: dto.parent_id || dto.parentId || null,
      description: dto.description || null,
      is_active: true,
      level: dto.level || 0,
      balance: 0,
    });
    return this.coaRepository.save(account);
  }

  async getCOAById(id: string, tenantId: string): Promise<ChartOfAccounts | null> {
    return this.coaRepository.findOne({ where: { id, tenant_id: tenantId } });
  }

  async updateCOA(id: string, dto: any, tenantId: string): Promise<ChartOfAccounts> {
    await this.coaRepository.update({ id, tenant_id: tenantId }, {
      code: dto.account_code || dto.code,
      name: dto.account_name || dto.name,
      account_type: dto.account_type || dto.type,
      description: dto.description,
      parent_id: dto.parent_id || dto.parentId || null,
    });
    return this.coaRepository.findOne({ where: { id, tenant_id: tenantId } });
  }

  async deleteCOA(id: string, tenantId: string): Promise<void> {
    await this.coaRepository.delete({ id, tenant_id: tenantId });
  }

  // ─── Financial Periods ────────────────────────────────────────────────

  async getPeriods(tenantId: string): Promise<any[]> {
    const periods = await this.financialPeriodRepository.find({
      where: { tenant_id: tenantId },
      order: { start_date: 'DESC' },
    });
    return periods.map(p => ({
      id: p.id,
      name: p.period_name,
      startDate: p.start_date,
      endDate: p.end_date,
      status: p.status?.toUpperCase() || 'OPEN',
      year: new Date(p.start_date).getFullYear(),
      month: new Date(p.start_date).getMonth() + 1,
    }));
  }

  async closePeriod(id: string, tenantId: string): Promise<any> {
    await this.financialPeriodRepository.update(
      { id, tenant_id: tenantId },
      { status: 'closed' },
    );
    return this.financialPeriodRepository.findOne({ where: { id, tenant_id: tenantId } });
  }

  async createPeriod(dto: any, tenantId: string): Promise<FinancialPeriod> {
    const period = this.financialPeriodRepository.create({
      tenant_id: tenantId,
      period_name: dto.period_name || dto.name,
      start_date: dto.period_start || dto.startDate,
      end_date: dto.period_end || dto.endDate,
      status: 'open',
      created_by: 'system',
    });
    return this.financialPeriodRepository.save(period);
  }

  // ─── Journal Entries ──────────────────────────────────────────────────

  async getJournalEntries(tenantId: string, periodId?: string, accountId?: string): Promise<any> {
    // Return paginated result — GlTransaction entity structure TBD
    return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  }

  async createJournalEntry(dto: any, tenantId: string): Promise<any> {
    // Validate double-entry balance
    const totalDebits = (dto.lines || []).reduce(
      (sum: number, line: any) => sum + (Number(line.debit_amount || line.debit) || 0), 0,
    );
    const totalCredits = (dto.lines || []).reduce(
      (sum: number, line: any) => sum + (Number(line.credit_amount || line.credit) || 0), 0,
    );
    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new BadRequestException('Journal entry does not balance: debits must equal credits');
    }
    // Return stub until GlTransaction is fully wired
    return { id: 'pending', status: 'DRAFT', totalDebit: totalDebits, totalCredit: totalCredits };
  }

  async postJournalEntry(id: string, tenantId: string): Promise<any> {
    // Will update GlTransaction status to POSTED once entity is wired
    throw new NotImplementedException('postJournalEntry() not yet implemented');
  }

  async voidJournalEntry(id: string, tenantId: string): Promise<any> {
    // Will update GlTransaction status to VOID once entity is wired
    throw new NotImplementedException('voidJournalEntry() not yet implemented');
  }

  // ─── Stubs (pending full implementation) ──────────────────────────────

  async postDocument(documentData: any, tenantId: string): Promise<any> {
    throw new NotImplementedException('postDocument() not yet implemented');
  }

  async getTrialBalance(periodId: string, tenantId: string): Promise<any> {
    throw new NotImplementedException('getTrialBalance() not yet implemented');
  }

  async getGeneralLedger(accountId: string, tenantId: string, periodId?: string): Promise<any> {
    throw new NotImplementedException('getGeneralLedger() not yet implemented');
  }
}
