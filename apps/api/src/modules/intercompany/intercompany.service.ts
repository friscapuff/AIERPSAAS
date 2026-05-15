import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import {
  IntercompanyAgreement,
  IntercompanyTransaction,
  IntercompanyStatus,
  Tenant,
  ChartOfAccounts,
  GLTransaction,
} from '@libs/database';

import {
  CreateAgreementDto,
  CreateIntercompanyTxDto,
  SettleTransactionDto,
  QueryIntercompanyDto,
} from './dto';

function toFixed4(value: number): string {
  return (Math.round(value * 10_000) / 10_000).toFixed(4);
}

function parseDecimal(value: string | number): number {
  return typeof value === 'string' ? parseFloat(value) : value;
}

function multiply(a: string | number, b: string | number): string {
  return toFixed4(parseDecimal(a) * parseDecimal(b));
}

export interface IntercompanyBalanceMatrix {
  pairKey: string;
  sourceTenantId: string;
  sourceTenantName: string;
  targetTenantId: string;
  targetTenantName: string;
  outstandingAmount: string;
  currency: string;
  transactionCount: number;
}

export interface EliminationEntry {
  sourceTenantId: string;
  targetTenantId: string;
  description: string;
  lines: Array<{
    tenantId: string;
    accountId: string;
    accountCode: string;
    accountName: string;
    debit: string;
    credit: string;
    currency: string;
  }>;
}

export interface ConsolidatedTrialBalanceLine {
  accountCode: string;
  accountName: string;
  accountType: string;
  grossDebit: string;
  grossCredit: string;
  eliminationDebit: string;
  eliminationCredit: string;
  netDebit: string;
  netCredit: string;
  tenantBreakdown: Array<{ tenantId: string; debit: string; credit: string }>;
}

@Injectable()
export class IntercompanyService {
  private readonly logger = new Logger(IntercompanyService.name);

  constructor(
    @InjectRepository(IntercompanyAgreement)
    private agreementRepo: Repository<IntercompanyAgreement>,
    @InjectRepository(IntercompanyTransaction)
    private icTxRepo: Repository<IntercompanyTransaction>,
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    @InjectRepository(ChartOfAccounts)
    private coaRepo: Repository<ChartOfAccounts>,
    @InjectRepository(GLTransaction)
    private glTxRepo: Repository<GLTransaction>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async createAgreement(dto: CreateAgreementDto, createdBy: string): Promise<IntercompanyAgreement> {
    const parentTenant = await this.tenantRepo.findOne({ where: { id: dto.parentTenantId } });
    if (!parentTenant) throw new NotFoundException(`Parent tenant ${dto.parentTenantId} not found`);

    const childTenants = await this.tenantRepo.find({ where: { id: In(dto.childTenantIds) } });
    if (childTenants.length !== dto.childTenantIds.length) {
      const missing = dto.childTenantIds.filter((id) => !childTenants.map((t) => t.id).includes(id));
      throw new NotFoundException(`Child tenants not found: ${missing.join(', ')}`);
    }

    const dueToAccount = await this.coaRepo.findOne({ where: { id: dto.dueToAccountId } });
    if (!dueToAccount) throw new NotFoundException(`Due-To account ${dto.dueToAccountId} not found`);

    const dueFromAccount = await this.coaRepo.findOne({ where: { id: dto.dueFromAccountId } });
    if (!dueFromAccount) throw new NotFoundException(`Due-From account ${dto.dueFromAccountId} not found`);

    const agreement = this.agreementRepo.create({
      id: uuidv4(),
      parent_tenant_id: dto.parentTenantId,
      child_tenant_ids: dto.childTenantIds,
      due_to_account_id: dto.dueToAccountId,
      due_from_account_id: dto.dueFromAccountId,
      settlement_currency: dto.settlementCurrency,
      auto_post: dto.autoPost ?? true,
      is_active: true,
      created_by: createdBy,
    });

    return this.agreementRepo.save(agreement);
  }

  async updateAgreement(id: string, updates: Partial<CreateAgreementDto>, updatedBy: string): Promise<IntercompanyAgreement> {
    const agreement = await this.agreementRepo.findOne({ where: { id } });
    if (!agreement) throw new NotFoundException(`Intercompany agreement ${id} not found`);

    if (updates.childTenantIds !== undefined) {
      const childTenants = await this.tenantRepo.find({ where: { id: In(updates.childTenantIds) } });
      if (childTenants.length !== updates.childTenantIds.length) throw new NotFoundException('One or more child tenant IDs are invalid');
      agreement.child_tenant_ids = updates.childTenantIds;
    }

    if (updates.dueToAccountId !== undefined) {
      const acct = await this.coaRepo.findOne({ where: { id: updates.dueToAccountId } });
      if (!acct) throw new NotFoundException(`Due-To account ${updates.dueToAccountId} not found`);
      agreement.due_to_account_id = updates.dueToAccountId;
    }

    if (updates.dueFromAccountId !== undefined) {
      const acct = await this.coaRepo.findOne({ where: { id: updates.dueFromAccountId } });
      if (!acct) throw new NotFoundException(`Due-From account ${updates.dueFromAccountId} not found`);
      agreement.due_from_account_id = updates.dueFromAccountId;
    }

    if (updates.settlementCurrency !== undefined) agreement.settlement_currency = updates.settlementCurrency;
    if (updates.autoPost !== undefined) agreement.auto_post = updates.autoPost;

    return this.agreementRepo.save(agreement);
  }

  async deleteAgreement(id: string): Promise<void> {
    const agreement = await this.agreementRepo.findOne({ where: { id } });
    if (!agreement) throw new NotFoundException(`Intercompany agreement ${id} not found`);

    const openTx = await this.icTxRepo.count({
      where: { agreement_id: id, status: In([IntercompanyStatus.DRAFT, IntercompanyStatus.POSTED]) },
    });
    if (openTx > 0) throw new ConflictException(`Cannot delete agreement ${id}: ${openTx} open transactions exist.`);

    agreement.is_active = false;
    await this.agreementRepo.save(agreement);
  }

  async getAgreement(id: string): Promise<IntercompanyAgreement> {
    const agreement = await this.agreementRepo.findOne({
      where: { id },
      relations: ['parent_tenant', 'due_to_account', 'due_from_account'],
    });
    if (!agreement) throw new NotFoundException(`Intercompany agreement ${id} not found`);
    return agreement;
  }

  async listAgreements(parentTenantId?: string, activeOnly = true): Promise<IntercompanyAgreement[]> {
    const where: Record<string, any> = {};
    if (parentTenantId) where.parent_tenant_id = parentTenantId;
    if (activeOnly) where.is_active = true;

    return this.agreementRepo.find({
      where,
      relations: ['parent_tenant', 'due_to_account', 'due_from_account'],
      order: { created_at: 'DESC' },
    });
  }

  async createTransaction(sourceTenantId: string, dto: CreateIntercompanyTxDto, createdBy: string): Promise<IntercompanyTransaction> {
    const { targetTenantId, amount, currency, exchangeRate = 1, description } = dto;

    if (sourceTenantId === targetTenantId) throw new BadRequestException('Source and target tenants must be different');

    const agreement = await this.findAgreementForPair(sourceTenantId, targetTenantId);
    await this.assertTenantActive(sourceTenantId);
    await this.assertTenantActive(targetTenantId);

    const postingDate = new Date();
    const icTxId = uuidv4();
    const sourceJournalId = uuidv4();
    const targetJournalId = uuidv4();
    const amountStr = toFixed4(amount);
    const exchangeRateStr = (exchangeRate || 1).toFixed(6);
    const status = agreement.auto_post ? IntercompanyStatus.POSTED : IntercompanyStatus.DRAFT;

    const savedIcTx = await this.dataSource.transaction(async (em: EntityManager) => {
      await em.query(`SET LOCAL role = current_user`);

      await em.save(GLTransaction, { id: uuidv4(), tenant_id: sourceTenantId, journal_id: sourceJournalId, account_id: agreement.due_from_account_id, debit: amountStr, credit: '0.0000', currency, exchange_rate: exchangeRateStr, posting_date: postingDate, source_doc_type: dto.sourceDocType || 'INTERCOMPANY', source_doc_id: dto.sourceDocId || icTxId, description: `[IC-DR] ${description}`, created_by: createdBy });
      await em.save(GLTransaction, { id: uuidv4(), tenant_id: sourceTenantId, journal_id: sourceJournalId, account_id: agreement.due_from_account_id, debit: '0.0000', credit: amountStr, currency, exchange_rate: exchangeRateStr, posting_date: postingDate, source_doc_type: dto.sourceDocType || 'INTERCOMPANY', source_doc_id: dto.sourceDocId || icTxId, description: `[IC-CR-CLEARING] ${description}`, created_by: createdBy });
      await em.save(GLTransaction, { id: uuidv4(), tenant_id: targetTenantId, journal_id: targetJournalId, account_id: agreement.due_to_account_id, debit: amountStr, credit: '0.0000', currency, exchange_rate: exchangeRateStr, posting_date: postingDate, source_doc_type: dto.sourceDocType || 'INTERCOMPANY', source_doc_id: dto.sourceDocId || icTxId, description: `[IC-DR-EXPENSE] ${description}`, created_by: createdBy });
      await em.save(GLTransaction, { id: uuidv4(), tenant_id: targetTenantId, journal_id: targetJournalId, account_id: agreement.due_to_account_id, debit: '0.0000', credit: amountStr, currency, exchange_rate: exchangeRateStr, posting_date: postingDate, source_doc_type: dto.sourceDocType || 'INTERCOMPANY', source_doc_id: dto.sourceDocId || icTxId, description: `[IC-CR] ${description}`, created_by: createdBy });

      const icTx = em.create(IntercompanyTransaction, { id: icTxId, source_tenant_id: sourceTenantId, target_tenant_id: targetTenantId, agreement_id: agreement.id, amount: amountStr, currency, exchange_rate: exchangeRateStr, description, source_doc_type: dto.sourceDocType, source_doc_id: dto.sourceDocId, source_journal_id: sourceJournalId, target_journal_id: targetJournalId, status, created_by: createdBy });
      return em.save(IntercompanyTransaction, icTx);
    });

    this.logger.log(`IntercompanyTransaction created: ${savedIcTx.id} | ${sourceTenantId} -> ${targetTenantId} | ${amountStr} ${currency}`);
    return savedIcTx;
  }

  async settleTransactions(tenantId: string, dto: SettleTransactionDto, settledBy: string): Promise<{ settled: number; transactions: IntercompanyTransaction[] }> {
    const settlementDate = new Date(dto.settlementDate);
    const transactions = await this.icTxRepo.find({ where: { id: In(dto.transactionIds) } });

    if (transactions.length !== dto.transactionIds.length) {
      const missing = dto.transactionIds.filter((id) => !transactions.map((t) => t.id).includes(id));
      throw new NotFoundException(`Transactions not found: ${missing.join(', ')}`);
    }

    for (const tx of transactions) {
      if (tx.source_tenant_id !== tenantId && tx.target_tenant_id !== tenantId) throw new BadRequestException(`Tenant ${tenantId} is not a party to transaction ${tx.id}`);
      if (tx.status !== IntercompanyStatus.POSTED) throw new BadRequestException(`Transaction ${tx.id} is in status ${tx.status}; only POSTED transactions can be settled`);
    }

    const settledTxs = await this.dataSource.transaction(async (em: EntityManager) => {
      await em.query(`SET LOCAL role = current_user`);
      const results: IntercompanyTransaction[] = [];

      for (const tx of transactions) {
        const settlementJournalId = uuidv4();
        const agreement = await this.findAgreementById(tx.agreement_id, em);

        await em.save(GLTransaction, { id: uuidv4(), tenant_id: tx.source_tenant_id, journal_id: settlementJournalId, account_id: agreement.due_from_account_id, debit: '0.0000', credit: tx.amount, currency: tx.currency, exchange_rate: tx.exchange_rate, posting_date: settlementDate, source_doc_type: 'IC_SETTLEMENT', source_doc_id: tx.id, description: `Settlement of IC tx ${tx.id}`, created_by: settledBy });
        await em.save(GLTransaction, { id: uuidv4(), tenant_id: tx.target_tenant_id, journal_id: settlementJournalId, account_id: agreement.due_to_account_id, debit: tx.amount, credit: '0.0000', currency: tx.currency, exchange_rate: tx.exchange_rate, posting_date: settlementDate, source_doc_type: 'IC_SETTLEMENT', source_doc_id: tx.id, description: `Settlement of IC tx ${tx.id}`, created_by: settledBy });

        tx.status = IntercompanyStatus.SETTLED;
        tx.settlement_date = settlementDate;
        tx.settlement_notes = dto.notes ?? null;
        results.push(await em.save(IntercompanyTransaction, tx));
      }

      return results;
    });

    return { settled: settledTxs.length, transactions: settledTxs };
  }

  async getIntercompanyBalances(parentTenantId: string): Promise<IntercompanyBalanceMatrix[]> {
    const agreement = await this.agreementRepo.findOne({ where: { parent_tenant_id: parentTenantId, is_active: true }, relations: ['parent_tenant'] });
    if (!agreement) throw new NotFoundException(`No active agreement found for parent tenant ${parentTenantId}`);

    const allTenantIds = [parentTenantId, ...agreement.child_tenant_ids];
    const openTxs = await this.icTxRepo.createQueryBuilder('tx').where('tx.source_tenant_id IN (:...ids)', { ids: allTenantIds }).andWhere('tx.target_tenant_id IN (:...ids)', { ids: allTenantIds }).andWhere('tx.status = :status', { status: IntercompanyStatus.POSTED }).getMany();

    const tenants = await this.tenantRepo.find({ where: { id: In(allTenantIds) } });
    const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));
    const pairMap = new Map<string, IntercompanyBalanceMatrix>();

    for (const tx of openTxs) {
      const [a, b] = tx.source_tenant_id < tx.target_tenant_id ? [tx.source_tenant_id, tx.target_tenant_id] : [tx.target_tenant_id, tx.source_tenant_id];
      const key = `${a}::${b}`;

      if (!pairMap.has(key)) pairMap.set(key, { pairKey: key, sourceTenantId: a, sourceTenantName: tenantMap.get(a) ?? a, targetTenantId: b, targetTenantName: tenantMap.get(b) ?? b, outstandingAmount: '0.0000', currency: tx.currency, transactionCount: 0 });

      const entry = pairMap.get(key)!;
      const sign = tx.source_tenant_id === a ? 1 : -1;
      entry.outstandingAmount = toFixed4(Math.abs(parseDecimal(entry.outstandingAmount) + sign * parseDecimal(tx.amount)));
      entry.transactionCount += 1;
    }

    return Array.from(pairMap.values());
  }

  async getEliminationEntries(parentTenantId: string, periodId?: string): Promise<EliminationEntry[]> {
    const agreement = await this.agreementRepo.findOne({ where: { parent_tenant_id: parentTenantId, is_active: true }, relations: ['due_from_account', 'due_to_account'] });
    if (!agreement) throw new NotFoundException(`No active agreement found for parent tenant ${parentTenantId}`);

    const allTenantIds = [parentTenantId, ...agreement.child_tenant_ids];
    const openTxs = await this.icTxRepo.createQueryBuilder('tx').where('tx.source_tenant_id IN (:...ids)', { ids: allTenantIds }).andWhere('tx.target_tenant_id IN (:...ids)', { ids: allTenantIds }).andWhere('tx.status IN (:...statuses)', { statuses: [IntercompanyStatus.POSTED] }).getMany();

    const pairTotals = new Map<string, { sourceTenantId: string; targetTenantId: string; total: number; currency: string }>();
    for (const tx of openTxs) {
      const key = `${tx.source_tenant_id}::${tx.target_tenant_id}`;
      if (!pairTotals.has(key)) pairTotals.set(key, { sourceTenantId: tx.source_tenant_id, targetTenantId: tx.target_tenant_id, total: 0, currency: tx.currency });
      pairTotals.get(key)!.total += parseDecimal(tx.amount);
    }

    return Array.from(pairTotals.values()).map((pair) => ({
      sourceTenantId: pair.sourceTenantId,
      targetTenantId: pair.targetTenantId,
      description: `Elimination: IC receivable/payable between ${pair.sourceTenantId} and ${pair.targetTenantId}`,
      lines: [
        { tenantId: pair.targetTenantId, accountId: agreement.due_to_account_id, accountCode: agreement.due_to_account?.code ?? '', accountName: agreement.due_to_account?.name ?? 'Due-To Account', debit: toFixed4(pair.total), credit: '0.0000', currency: pair.currency },
        { tenantId: pair.sourceTenantId, accountId: agreement.due_from_account_id, accountCode: agreement.due_from_account?.code ?? '', accountName: agreement.due_from_account?.name ?? 'Due-From Account', debit: '0.0000', credit: toFixed4(pair.total), currency: pair.currency },
      ],
    }));
  }

  async getConsolidatedTrialBalance(parentTenantId: string, periodId?: string): Promise<ConsolidatedTrialBalanceLine[]> {
    const agreement = await this.agreementRepo.findOne({ where: { parent_tenant_id: parentTenantId, is_active: true } });
    if (!agreement) throw new NotFoundException(`No active agreement found for parent tenant ${parentTenantId}`);

    const allTenantIds = [parentTenantId, ...agreement.child_tenant_ids];
    const qb = this.glTxRepo.createQueryBuilder('gl').select('gl.tenant_id', 'tenantId').addSelect('gl.account_id', 'accountId').addSelect('SUM(CAST(gl.debit AS numeric))', 'totalDebit').addSelect('SUM(CAST(gl.credit AS numeric))', 'totalCredit').where('gl.tenant_id IN (:...ids)', { ids: allTenantIds }).groupBy('gl.tenant_id, gl.account_id');
    if (periodId) qb.andWhere('gl.period_id = :periodId', { periodId });

    const rawBalances: Array<{ tenantId: string; accountId: string; totalDebit: string; totalCredit: string }> = await qb.getRawMany();
    const accountIds = [...new Set(rawBalances.map((r) => r.accountId))];
    const accounts = await this.coaRepo.find({ where: { id: In(accountIds) } });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    const aggregated = new Map<string, { accountCode: string; accountName: string; accountType: string; grossDebit: number; grossCredit: number; tenantBreakdown: Array<{ tenantId: string; debit: number; credit: number }> }>();
    for (const row of rawBalances) {
      const account = accountMap.get(row.accountId);
      if (!account) continue;
      const key = account.code;
      if (!aggregated.has(key)) aggregated.set(key, { accountCode: account.code, accountName: account.name, accountType: account.account_type, grossDebit: 0, grossCredit: 0, tenantBreakdown: [] });
      const entry = aggregated.get(key)!;
      entry.grossDebit += parseDecimal(row.totalDebit);
      entry.grossCredit += parseDecimal(row.totalCredit);
      entry.tenantBreakdown.push({ tenantId: row.tenantId, debit: parseDecimal(row.totalDebit), credit: parseDecimal(row.totalCredit) });
    }

    const elimEntries = await this.getEliminationEntries(parentTenantId, periodId);
    const elimMap = new Map<string, { elimDebit: number; elimCredit: number }>();
    for (const elim of elimEntries) {
      for (const line of elim.lines) {
        const account = accountMap.get(line.accountId);
        if (!account) continue;
        const key = account.code;
        if (!elimMap.has(key)) elimMap.set(key, { elimDebit: 0, elimCredit: 0 });
        elimMap.get(key)!.elimDebit += parseDecimal(line.debit);
        elimMap.get(key)!.elimCredit += parseDecimal(line.credit);
      }
    }

    const result: ConsolidatedTrialBalanceLine[] = [];
    for (const [, entry] of aggregated) {
      const elim = elimMap.get(entry.accountCode) ?? { elimDebit: 0, elimCredit: 0 };
      result.push({
        accountCode: entry.accountCode,
        accountName: entry.accountName,
        accountType: entry.accountType,
        grossDebit: toFixed4(entry.grossDebit),
        grossCredit: toFixed4(entry.grossCredit),
        eliminationDebit: toFixed4(elim.elimDebit),
        eliminationCredit: toFixed4(elim.elimCredit),
        netDebit: toFixed4(Math.max(0, entry.grossDebit - elim.elimDebit)),
        netCredit: toFixed4(Math.max(0, entry.grossCredit - elim.elimCredit)),
        tenantBreakdown: entry.tenantBreakdown.map((tb) => ({ tenantId: tb.tenantId, debit: toFixed4(tb.debit), credit: toFixed4(tb.credit) })),
      });
    }

    result.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    return result;
  }

  async listTransactions(tenantId: string, dto: QueryIntercompanyDto): Promise<{ data: IntercompanyTransaction[]; total: number; page: number; limit: number }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const qb = this.icTxRepo.createQueryBuilder('tx').where('(tx.source_tenant_id = :tid OR tx.target_tenant_id = :tid)', { tid: tenantId }).orderBy('tx.created_at', 'DESC').skip((page - 1) * limit).take(limit);

    if (dto.targetTenantId) qb.andWhere('(tx.source_tenant_id = :other OR tx.target_tenant_id = :other)', { other: dto.targetTenantId });
    if (dto.status) qb.andWhere('tx.status = :status', { status: dto.status });
    if (dto.startDate) qb.andWhere('tx.created_at >= :startDate', { startDate: new Date(dto.startDate) });
    if (dto.endDate) qb.andWhere('tx.created_at <= :endDate', { endDate: new Date(dto.endDate + 'T23:59:59Z') });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getTransaction(tenantId: string, txId: string): Promise<IntercompanyTransaction> {
    const tx = await this.icTxRepo.findOne({ where: { id: txId }, relations: ['source_tenant', 'target_tenant', 'agreement'] });
    if (!tx) throw new NotFoundException(`Intercompany transaction ${txId} not found`);
    if (tx.source_tenant_id !== tenantId && tx.target_tenant_id !== tenantId) throw new NotFoundException(`Intercompany transaction ${txId} not found`);
    return tx;
  }

  async cancelTransaction(tenantId: string, txId: string, cancelledBy: string): Promise<IntercompanyTransaction> {
    const tx = await this.getTransaction(tenantId, txId);
    if (tx.status === IntercompanyStatus.SETTLED) throw new BadRequestException(`Transaction ${txId} is already SETTLED`);
    if (tx.status === IntercompanyStatus.CANCELLED) throw new BadRequestException(`Transaction ${txId} is already CANCELLED`);

    const agreement = await this.agreementRepo.findOne({ where: { id: tx.agreement_id } });
    if (!agreement) throw new NotFoundException(`Agreement ${tx.agreement_id} not found`);

    const reversalJournalId = uuidv4();
    const postingDate = new Date();

    await this.dataSource.transaction(async (em: EntityManager) => {
      await em.query(`SET LOCAL role = current_user`);
      await em.save(GLTransaction, { id: uuidv4(), tenant_id: tx.source_tenant_id, journal_id: reversalJournalId, account_id: agreement.due_from_account_id, debit: '0.0000', credit: tx.amount, currency: tx.currency, exchange_rate: tx.exchange_rate, posting_date: postingDate, source_doc_type: 'IC_REVERSAL', source_doc_id: tx.id, description: `Reversal of IC tx ${tx.id}`, created_by: cancelledBy });
      await em.save(GLTransaction, { id: uuidv4(), tenant_id: tx.source_tenant_id, journal_id: reversalJournalId, account_id: agreement.due_from_account_id, debit: tx.amount, credit: '0.0000', currency: tx.currency, exchange_rate: tx.exchange_rate, posting_date: postingDate, source_doc_type: 'IC_REVERSAL', source_doc_id: tx.id, description: `Reversal of IC tx ${tx.id} clearing`, created_by: cancelledBy });
      await em.save(GLTransaction, { id: uuidv4(), tenant_id: tx.target_tenant_id, journal_id: reversalJournalId, account_id: agreement.due_to_account_id, debit: '0.0000', credit: tx.amount, currency: tx.currency, exchange_rate: tx.exchange_rate, posting_date: postingDate, source_doc_type: 'IC_REVERSAL', source_doc_id: tx.id, description: `Reversal of IC tx ${tx.id}`, created_by: cancelledBy });
      await em.save(GLTransaction, { id: uuidv4(), tenant_id: tx.target_tenant_id, journal_id: reversalJournalId, account_id: agreement.due_to_account_id, debit: tx.amount, credit: '0.0000', currency: tx.currency, exchange_rate: tx.exchange_rate, posting_date: postingDate, source_doc_type: 'IC_REVERSAL', source_doc_id: tx.id, description: `Reversal of IC tx ${tx.id} clearing`, created_by: cancelledBy });
      tx.status = IntercompanyStatus.CANCELLED;
      await em.save(IntercompanyTransaction, tx);
    });

    return this.getTransaction(tenantId, txId);
  }

  private async findAgreementForPair(sourceTenantId: string, targetTenantId: string): Promise<IntercompanyAgreement> {
    const agreements = await this.agreementRepo.find({ where: { is_active: true } });
    const match = agreements.find((a) => { const allIds = [a.parent_tenant_id, ...a.child_tenant_ids]; return allIds.includes(sourceTenantId) && allIds.includes(targetTenantId); });
    if (!match) throw new BadRequestException(`No active intercompany agreement found covering tenants ${sourceTenantId} and ${targetTenantId}`);
    return match;
  }

  private async assertTenantActive(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    if (tenant.status !== 'active') throw new BadRequestException(`Tenant ${tenantId} is not active`);
  }

  private async findAgreementById(agreementId: string, em: EntityManager): Promise<IntercompanyAgreement> {
    const agreement = await em.findOne(IntercompanyAgreement, { where: { id: agreementId } });
    if (!agreement) throw new NotFoundException(`Agreement ${agreementId} not found`);
    return agreement;
  }
}
