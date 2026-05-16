import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChartOfAccounts, GlTransaction, FinancialPeriod } from '@libs/database';
import { v4 as uuidv4 } from 'uuid';

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

  async getCOA(tenantId: string): Promise<any[]> {
    const accounts = await this.coaRepository.find({
      where: { tenant_id: tenantId },
      order: { code: 'ASC' },
    });
    return accounts.map((acct) => ({
      id: acct.id,
      code: acct.code,
      name: acct.name,
      type: acct.account_type?.toUpperCase() || 'ASSET',
      parentId: acct.parent_id || undefined,
      currency: acct.currency || 'JOD',
      balance: 0,
      isActive: acct.is_active,
      level: acct.level || 0,
    }));
  }

  async getCOATree(tenantId: string): Promise<any[]> {
    const accounts = await this.coaRepository.find({
      where: { tenant_id: tenantId },
      order: { code: 'ASC' },
    });

    const balances = await this.glTransactionRepository
      .createQueryBuilder('gl')
      .select('gl.account_id', 'account_id')
      .addSelect('COALESCE(SUM(gl.debit), 0)', 'total_debit')
      .addSelect('COALESCE(SUM(gl.credit), 0)', 'total_credit')
      .where('gl.tenant_id = :tenantId', { tenantId })
      .groupBy('gl.account_id')
      .getRawMany();

    const balanceMap = new Map<string, number>();
    for (const b of balances) {
      balanceMap.set(b.account_id, parseFloat(b.total_debit) - parseFloat(b.total_credit));
    }

    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const acct of accounts) {
      map.set(acct.id, {
        id: acct.id,
        code: acct.code,
        name: acct.name,
        type: acct.account_type?.toUpperCase() || 'ASSET',
        parentId: acct.parent_id,
        balance: balanceMap.get(acct.id) || 0,
        isActive: acct.is_active,
        level: acct.level,
        currency: acct.currency || 'JOD',
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

  async createCOA(dto: any, tenantId: string): Promise<any> {
    const existing = await this.coaRepository.findOne({
      where: { tenant_id: tenantId, code: dto.account_code || dto.code },
    });
    if (existing) {
      throw new BadRequestException(`Account with code "${dto.account_code || dto.code}" already exists`);
    }

    const account = this.coaRepository.create({
      tenant_id: tenantId,
      code: dto.account_code || dto.code,
      name: dto.account_name || dto.name,
      account_type: dto.account_type || dto.type,
      parent_id: dto.parent_id || dto.parentId || null,
      is_active: true,
      level: dto.level || 0,
      currency: dto.currency || 'JOD',
    });
    const saved = await this.coaRepository.save(account);

    return {
      id: saved.id,
      code: saved.code,
      name: saved.name,
      type: saved.account_type?.toUpperCase() || 'ASSET',
      parentId: saved.parent_id || undefined,
      currency: saved.currency || 'JOD',
      balance: 0,
      isActive: saved.is_active,
      level: saved.level || 0,
    };
  }

  async getCOAById(id: string, tenantId: string): Promise<any> {
    const acct = await this.coaRepository.findOne({ where: { id, tenant_id: tenantId } });
    if (!acct) throw new NotFoundException(`Account ${id} not found`);
    return {
      id: acct.id,
      code: acct.code,
      name: acct.name,
      type: acct.account_type?.toUpperCase() || 'ASSET',
      parentId: acct.parent_id || undefined,
      currency: acct.currency || 'JOD',
      balance: 0,
      isActive: acct.is_active,
      level: acct.level || 0,
    };
  }

  async updateCOA(id: string, dto: any, tenantId: string): Promise<any> {
    const existing = await this.coaRepository.findOne({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new NotFoundException(`Account ${id} not found`);

    await this.coaRepository.update({ id, tenant_id: tenantId }, {
      code: dto.account_code || dto.code || existing.code,
      name: dto.account_name || dto.name || existing.name,
      account_type: dto.account_type || dto.type || existing.account_type,
      parent_id: dto.parent_id || dto.parentId || null,
    });

    const updated = await this.coaRepository.findOne({ where: { id, tenant_id: tenantId } });
    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      type: updated.account_type?.toUpperCase() || 'ASSET',
      parentId: updated.parent_id || undefined,
      currency: updated.currency || 'JOD',
      balance: 0,
      isActive: updated.is_active,
      level: updated.level || 0,
    };
  }

  async deleteCOA(id: string, tenantId: string): Promise<void> {
    const txCount = await this.glTransactionRepository.count({
      where: { tenant_id: tenantId, account_id: id },
    });
    if (txCount > 0) {
      throw new BadRequestException('Cannot delete account with existing transactions. Deactivate it instead.');
    }
    const childCount = await this.coaRepository.count({
      where: { tenant_id: tenantId, parent_id: id },
    });
    if (childCount > 0) {
      throw new BadRequestException('Cannot delete account with child accounts. Remove children first.');
    }
    await this.coaRepository.delete({ id, tenant_id: tenantId });
  }

  // ─── Financial Periods ────────────────────────────────────────────────

  async getPeriods(tenantId: string): Promise<any[]> {
    const periods = await this.financialPeriodRepository.find({
      where: { tenant_id: tenantId },
      order: { start_date: 'DESC' },
    });
    return periods.map((p) => ({
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
    const period = await this.financialPeriodRepository.findOne({ where: { id, tenant_id: tenantId } });
    if (!period) throw new NotFoundException(`Period ${id} not found`);
    if (period.status === 'closed' || period.status === 'locked') {
      throw new BadRequestException('Period is already closed');
    }

    await this.financialPeriodRepository.update(
      { id, tenant_id: tenantId },
      { status: 'closed' },
    );

    return {
      id: period.id,
      name: period.period_name,
      startDate: period.start_date,
      endDate: period.end_date,
      status: 'CLOSED',
      year: new Date(period.start_date).getFullYear(),
      month: new Date(period.start_date).getMonth() + 1,
    };
  }

  async createPeriod(dto: any, tenantId: string): Promise<any> {
    const period = this.financialPeriodRepository.create({
      tenant_id: tenantId,
      period_name: dto.period_name || dto.name,
      start_date: dto.period_start || dto.startDate,
      end_date: dto.period_end || dto.endDate,
      status: 'open',
      created_by: 'system',
    });
    const saved = await this.financialPeriodRepository.save(period);
    return {
      id: saved.id,
      name: saved.period_name,
      startDate: saved.start_date,
      endDate: saved.end_date,
      status: 'OPEN',
      year: new Date(saved.start_date).getFullYear(),
      month: new Date(saved.start_date).getMonth() + 1,
    };
  }

  // ─── Journal Entries ──────────────────────────────────────────────────

  async getJournalEntries(tenantId: string, periodId?: string, accountId?: string): Promise<any> {
    const journalSummaries = await this.glTransactionRepository
      .createQueryBuilder('gl')
      .select('gl.journal_id', 'journal_id')
      .addSelect('MIN(gl.description)', 'description')
      .addSelect('MIN(gl.posting_date)', 'date')
      .addSelect('MIN(gl.source_doc_type)', 'status')
      .addSelect('SUM(gl.debit)', 'total_debit')
      .addSelect('SUM(gl.credit)', 'total_credit')
      .addSelect('MIN(gl.created_at)', 'created_at')
      .addSelect('MIN(gl.period_id)', 'period_id')
      .where('gl.tenant_id = :tenantId', { tenantId })
      .groupBy('gl.journal_id')
      .orderBy('MIN(gl.created_at)', 'DESC')
      .getRawMany();

    const entries = journalSummaries.map((j) => ({
      id: j.journal_id,
      reference: `JE-${j.journal_id?.substring(0, 8)?.toUpperCase()}`,
      date: j.date,
      description: j.description || '',
      status: j.status || 'DRAFT',
      currency: 'JOD',
      totalDebit: parseFloat(j.total_debit) || 0,
      totalCredit: parseFloat(j.total_credit) || 0,
      lines: [],
      periodId: j.period_id || undefined,
      createdAt: j.created_at,
    }));

    return {
      data: entries,
      meta: { total: entries.length, page: 1, limit: 50, totalPages: 1 },
    };
  }

  async createJournalEntry(dto: any, tenantId: string): Promise<any> {
    const lines = dto.lines || [];
    if (lines.length < 2) {
      throw new BadRequestException('Journal entry must have at least 2 lines');
    }

    const totalDebits = lines.reduce(
      (sum: number, line: any) => sum + (Number(line.debit_amount || line.debit) || 0), 0,
    );
    const totalCredits = lines.reduce(
      (sum: number, line: any) => sum + (Number(line.credit_amount || line.credit) || 0), 0,
    );
    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new BadRequestException(`Journal entry does not balance: debits (${totalDebits}) must equal credits (${totalCredits})`);
    }

    for (const line of lines) {
      const accountId = line.account_id || line.accountId;
      const account = await this.coaRepository.findOne({
        where: { id: accountId, tenant_id: tenantId },
      });
      if (!account) {
        throw new BadRequestException(`Account "${accountId}" not found`);
      }
    }

    const journalId = uuidv4();
    const postingDate = dto.transaction_date || dto.date || new Date();
    const description = dto.description || '';

    const savedLines = [];
    for (const line of lines) {
      const accountId = line.account_id || line.accountId;
      const debit = Number(line.debit_amount || line.debit) || 0;
      const credit = Number(line.credit_amount || line.credit) || 0;

      const glEntry = this.glTransactionRepository.create({
        tenant_id: tenantId,
        journal_id: journalId,
        account_id: accountId,
        debit: String(debit),
        credit: String(credit),
        currency: dto.currency || 'JOD',
        exchange_rate: '1',
        posting_date: postingDate,
        period_id: dto.periodId || dto.period_id || null,
        source_doc_type: 'DRAFT',
        source_doc_id: journalId,
        description: line.description || description,
        created_by: 'system',
      });
      const saved = await this.glTransactionRepository.save(glEntry);
      savedLines.push({
        id: saved.id,
        accountId: saved.account_id,
        debit: Number(saved.debit),
        credit: Number(saved.credit),
        description: saved.description,
      });
    }

    return {
      id: journalId,
      reference: `JE-${journalId.substring(0, 8).toUpperCase()}`,
      date: postingDate,
      description,
      status: 'DRAFT',
      currency: dto.currency || 'JOD',
      totalDebit: totalDebits,
      totalCredit: totalCredits,
      lines: savedLines,
      createdAt: new Date().toISOString(),
    };
  }

  async postJournalEntry(id: string, tenantId: string): Promise<any> {
    const lines = await this.glTransactionRepository.find({
      where: { tenant_id: tenantId, journal_id: id },
    });

    if (lines.length === 0) {
      throw new NotFoundException(`Journal entry ${id} not found`);
    }

    if (lines[0].source_doc_type === 'POSTED') {
      throw new BadRequestException('Journal entry is already posted');
    }

    await this.glTransactionRepository.update(
      { tenant_id: tenantId, journal_id: id },
      { source_doc_type: 'POSTED' },
    );

    const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit), 0);

    return {
      id,
      reference: `JE-${id.substring(0, 8).toUpperCase()}`,
      date: lines[0].posting_date,
      description: lines[0].description || '',
      status: 'POSTED',
      currency: lines[0].currency || 'JOD',
      totalDebit,
      totalCredit,
      postedAt: new Date().toISOString(),
    };
  }

  async voidJournalEntry(id: string, tenantId: string): Promise<any> {
    const lines = await this.glTransactionRepository.find({
      where: { tenant_id: tenantId, journal_id: id },
    });

    if (lines.length === 0) {
      throw new NotFoundException(`Journal entry ${id} not found`);
    }

    if (lines[0].source_doc_type === 'CANCELLED') {
      throw new BadRequestException('Journal entry is already voided');
    }

    await this.glTransactionRepository.update(
      { tenant_id: tenantId, journal_id: id },
      { source_doc_type: 'CANCELLED' },
    );

    return {
      id,
      reference: `JE-${id.substring(0, 8).toUpperCase()}`,
      status: 'CANCELLED',
    };
  }

  // ─── Reports & GL ─────────────────────────────────────────────────────

  async getGeneralLedger(accountId: string, tenantId: string, periodId?: string): Promise<any> {
    let query = this.glTransactionRepository
      .createQueryBuilder('gl')
      .where('gl.tenant_id = :tenantId', { tenantId })
      .andWhere('gl.account_id = :accountId', { accountId });

    if (periodId) {
      query = query.andWhere('gl.period_id = :periodId', { periodId });
    }

    const transactions = await query.orderBy('gl.posting_date', 'ASC').getMany();

    let runningBalance = 0;
    const ledger = transactions.map((tx) => {
      const debit = Number(tx.debit) || 0;
      const credit = Number(tx.credit) || 0;
      runningBalance += debit - credit;
      return {
        id: tx.id,
        date: tx.posting_date,
        description: tx.description,
        journalId: tx.journal_id,
        debit,
        credit,
        balance: runningBalance,
      };
    });

    return { accountId, entries: ledger, balance: runningBalance };
  }

  async getTrialBalance(periodId: string, tenantId: string): Promise<any> {
    const results = await this.glTransactionRepository
      .createQueryBuilder('gl')
      .select('gl.account_id', 'account_id')
      .addSelect('SUM(gl.debit)', 'total_debit')
      .addSelect('SUM(gl.credit)', 'total_credit')
      .where('gl.tenant_id = :tenantId', { tenantId })
      .andWhere('gl.period_id = :periodId', { periodId })
      .groupBy('gl.account_id')
      .getRawMany();

    const accounts = await this.coaRepository.find({ where: { tenant_id: tenantId } });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    const trialBalance = results.map((r) => {
      const acct = accountMap.get(r.account_id);
      return {
        accountId: r.account_id,
        accountCode: acct?.code || '',
        accountName: acct?.name || '',
        accountType: acct?.account_type?.toUpperCase() || '',
        debit: parseFloat(r.total_debit) || 0,
        credit: parseFloat(r.total_credit) || 0,
        balance: (parseFloat(r.total_debit) || 0) - (parseFloat(r.total_credit) || 0),
      };
    });

    const totalDebit = trialBalance.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = trialBalance.reduce((sum, t) => sum + t.credit, 0);

    return { entries: trialBalance, totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  }

  async postDocument(documentData: any, tenantId: string): Promise<any> {
    const journalId = uuidv4();
    const lines = documentData.lines || [];

    for (const line of lines) {
      const glEntry = this.glTransactionRepository.create({
        tenant_id: tenantId,
        journal_id: journalId,
        account_id: line.accountId || line.account_id,
        debit: String(Number(line.debit) || 0),
        credit: String(Number(line.credit) || 0),
        currency: documentData.currency || 'JOD',
        exchange_rate: '1',
        posting_date: documentData.date || new Date(),
        period_id: documentData.periodId || null,
        source_doc_type: documentData.docType || 'POSTED',
        source_doc_id: documentData.docId || journalId,
        description: line.description || documentData.description || '',
        created_by: 'system',
      });
      await this.glTransactionRepository.save(glEntry);
    }

    return { journalId, status: 'POSTED', linesCreated: lines.length };
  }
}
