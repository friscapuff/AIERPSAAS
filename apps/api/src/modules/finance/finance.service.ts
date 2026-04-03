import { Injectable } from '@nestjs/common';

interface Account {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
}

interface Transaction {
  id: string;
  accountId: string;
  debitAmount?: number;
  creditAmount?: number;
  transactionDate: string;
  description: string;
}

@Injectable()
export class FinanceService {
  private accounts: Map<string, Account> = new Map();
  private transactions: Transaction[] = [];

  async getAccounts() {
    return Array.from(this.accounts.values());
  }

  async getAccount(id: string) {
    return this.accounts.get(id);
  }

  async createAccount(createAccountDto: any) {
    const id = Math.random().toString(36).substr(2, 9);
    const account = { id, ...createAccountDto };
    this.accounts.set(id, account);
    return account;
  }

  async updateAccount(id: string, updateAccountDto: any) {
    const account = this.accounts.get(id);
    if (!account) return null;
    const updated = { ...account, ...updateAccountDto };
    this.accounts.set(id, updated);
    return updated;
  }

  async getTransactions(
    accountId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    return this.transactions.filter((t) => {
      if (accountId && t.accountId !== accountId) return false;
      if (startDate && new Date(t.transactionDate) < new Date(startDate))
        return false;
      if (endDate && new Date(t.transactionDate) > new Date(endDate))
        return false;
      return true;
    });
  }

  async createTransaction(createTransactionDto: any) {
    const transaction = {
      id: Math.random().toString(36).substr(2, 9),
      ...createTransactionDto,
    };
    this.transactions.push(transaction);
    return transaction;
  }

  async getTrialBalance() {
    return {
      accounts: Array.from(this.accounts.values()),
      timestamp: new Date(),
    };
  }

  async getIncomeStatement(startDate: string, endDate: string) {
    return {
      period: { startDate, endDate },
      revenues: 0,
      expenses: 0,
      netIncome: 0,
    };
  }
}
