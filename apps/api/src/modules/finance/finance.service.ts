import { Injectable } from '@nestjs/common';

@Injectable()
export class FinanceService {
  async getAccounts(tenantId: string) {
    return { data: [] };
  }

  async createJournalEntry(tenantId: string, data: any) {
    return { id: 'entry-1', ...data };
  }

  async getReports(tenantId: string) {
    return { reports: [] };
  }
}
