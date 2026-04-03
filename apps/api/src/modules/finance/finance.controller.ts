import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

interface CreateAccountDto {
  accountNumber: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normalBalance: 'debit' | 'credit';
}

interface CreateTransactionDto {
  transactionDate: string;
  description: string;
  debitAmount?: number;
  creditAmount?: number;
  accountId: string;
  referenceNumber?: string;
}

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('accounts')
  async getAccounts() {
    return this.financeService.getAccounts();
  }

  @Get('accounts/:id')
  async getAccount(@Param('id') id: string) {
    return this.financeService.getAccount(id);
  }

  @Post('accounts')
  async createAccount(@Body() createAccountDto: CreateAccountDto) {
    return this.financeService.createAccount(createAccountDto);
  }

  @Put('accounts/:id')
  async updateAccount(
    @Param('id') id: string,
    @Body() updateAccountDto: Partial<CreateAccountDto>,
  ) {
    return this.financeService.updateAccount(id, updateAccountDto);
  }

  @Get('transactions')
  async getTransactions(
    @Query('accountId') accountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getTransactions(accountId, startDate, endDate);
  }

  @Post('transactions')
  async createTransaction(@Body() createTransactionDto: CreateTransactionDto) {
    return this.financeService.createTransaction(createTransactionDto);
  }

  @Get('reports/trial-balance')
  async getTrialBalance() {
    return this.financeService.getTrialBalance();
  }

  @Get('reports/income-statement')
  async getIncomeStatement(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.financeService.getIncomeStatement(startDate, endDate);
  }
}
