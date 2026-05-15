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

  async createJournalEntry(journalEntryDto: any, tenantId: string): Promise<any> {
    const totalDebits = journalEntryDto.lines.reduce((sum: number, line: any) => sum + (line.debit_amount || 0), 0);
    const totalCredits = journalEntryDto.lines.reduce((sum: number, line: any) => sum + (line.credit_amount || 0), 0);

    if (totalDebits !== totalCredits) {
      throw new BadRequestException('Journal entry does not balance: debits must equal credits');
    }

    throw new NotImplementedException('createJournalEntry() not yet implemented');
  }

  async postDocument(documentData: any, tenantId: string): Promise<any> {
    throw new NotImplementedException('postDocument() not yet implemented');
  }

  async getTrialBalance(periodId: string, tenantId: string): Promise<any> {
    throw new NotImplementedException('getTrialBalance() not yet implemented');
  }

  async closePeriod(periodId: string, tenantId: string): Promise<FinancialPeriod> {
    throw new NotImplementedException('closePeriod() not yet implemented');
  }

  async getCOA(tenantId: string): Promise<ChartOfAccounts[]> {
    throw new NotImplementedException('getCOA() not yet implemented');
  }

  async getCOAById(id: string, tenantId: string): Promise<ChartOfAccounts | null> {
    throw new NotImplementedException('getCOAById() not yet implemented');
  }

  async createCOA(createCOADto: any, tenantId: string): Promise<ChartOfAccounts> {
    throw new NotImplementedException('createCOA() not yet implemented');
  }

  async updateCOA(id: string, updateCOADto: any, tenantId: string): Promise<ChartOfAccounts> {
    throw new NotImplementedException('updateCOA() not yet implemented');
  }

  async deleteCOA(id: string, tenantId: string): Promise<void> {
    throw new NotImplementedException('deleteCOA() not yet implemented');
  }

  async getGeneralLedger(accountId: string, tenantId: string, periodId?: string): Promise<any> {
    throw new NotImplementedException('getGeneralLedger() not yet implemented');
  }

  async getPeriods(tenantId: string): Promise<FinancialPeriod[]> {
    throw new NotImplementedException('getPeriods() not yet implemented');
  }

  async createPeriod(createPeriodDto: any, tenantId: string): Promise<FinancialPeriod> {
    throw new NotImplementedException('createPeriod() not yet implemented');
  }

  async getJournalEntries(tenantId: string, periodId?: string, accountId?: string): Promise<any> {
    throw new NotImplementedException('getJournalEntries() not yet implemented');
  }
}
