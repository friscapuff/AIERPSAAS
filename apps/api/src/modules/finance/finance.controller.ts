import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse, ApiQuery, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsDateString, IsBoolean, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

// ─── DTOs ───────────────────────────────────────────���───────────────────────

export class CreateChartOfAccountsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  account_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  account_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  account_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parent_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  level?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}

class JournalLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  account_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  debit_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  debit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  credit_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  credit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateJournalEntryDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  transaction_date?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  periodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period_id?: string;

  @ApiProperty({ type: [JournalLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}

export class CreateFinancialPeriodDto {
  @ApiPropertyOptional()
  @IsOptional()
  period_start?: any;

  @ApiPropertyOptional()
  @IsOptional()
  period_end?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_open?: boolean;
}

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ─── Accounts (frontend routes) ──────────────────────────────────────

  @Get('accounts')
  @ApiOperation({ summary: 'List all accounts (flat, camelCase)' })
  @ApiResponse({ status: 200, description: 'Flat list of accounts' })
  async getAccounts(@CurrentTenant() tenantId: string) {
    return this.financeService.getCOA(tenantId);
  }

  @Get('accounts/tree')
  @ApiOperation({ summary: 'Get accounts as hierarchical tree' })
  @ApiResponse({ status: 200, description: 'Hierarchical tree of accounts' })
  async getAccountsTree(@CurrentTenant() tenantId: string) {
    return this.financeService.getCOATree(tenantId);
  }

  // ─── Chart of Accounts CRUD ──────────────────────────────────────────

  @Get('chart-of-accounts')
  @ApiOperation({ summary: 'List all chart of accounts' })
  @ApiResponse({ status: 200, description: 'List of accounts' })
  async getCOA(@CurrentTenant() tenantId: string) {
    return this.financeService.getCOA(tenantId);
  }

  @Get('chart-of-accounts/:id')
  @ApiOperation({ summary: 'Get chart of accounts by ID' })
  @ApiResponse({ status: 200, description: 'Account details' })
  async getCOAById(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.financeService.getCOAById(id, tenantId);
  }

  @Post('chart-of-accounts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create chart of accounts entry' })
  @ApiBody({ type: CreateChartOfAccountsDto })
  @ApiResponse({ status: 201, description: 'Account created' })
  async createCOA(@Body() createCOADto: CreateChartOfAccountsDto, @CurrentTenant() tenantId: string) {
    return this.financeService.createCOA(createCOADto, tenantId);
  }

  @Put('chart-of-accounts/:id')
  @ApiOperation({ summary: 'Update chart of accounts entry' })
  @ApiResponse({ status: 200, description: 'Account updated' })
  async updateCOA(@Param('id') id: string, @Body() updateCOADto: CreateChartOfAccountsDto, @CurrentTenant() tenantId: string) {
    return this.financeService.updateCOA(id, updateCOADto, tenantId);
  }

  @Delete('chart-of-accounts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete chart of accounts entry' })
  @ApiResponse({ status: 204, description: 'Account deleted' })
  async deleteCOA(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.financeService.deleteCOA(id, tenantId);
  }

  // ─── Journal Entries ─────────────────────────────────────────────────

  @Post('journal-entries')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created' })
  async createJournalEntry(@Body() dto: CreateJournalEntryDto, @CurrentTenant() tenantId: string) {
    return this.financeService.createJournalEntry(dto, tenantId);
  }

  @Get('journal-entries')
  @ApiOperation({ summary: 'List journal entries' })
  @ApiQuery({ name: 'period_id', required: false })
  @ApiQuery({ name: 'periodId', required: false })
  @ApiQuery({ name: 'account_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'List of journal entries' })
  async getJournalEntries(
    @Query('period_id') periodId?: string,
    @Query('periodId') periodIdAlt?: string,
    @Query('account_id') accountId?: string,
    @Query('status') status?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    return this.financeService.getJournalEntries(tenantId, periodId || periodIdAlt, accountId);
  }

  @Patch('journal-entries/:id/post')
  @ApiOperation({ summary: 'Post a journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry posted' })
  async postJournalEntry(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.financeService.postJournalEntry(id, tenantId);
  }

  @Patch('journal-entries/:id/void')
  @ApiOperation({ summary: 'Void a journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry voided' })
  async voidJournalEntry(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.financeService.voidJournalEntry(id, tenantId);
  }

  // ─── Periods ─────────────────────────────────────────────────────────

  @Get('periods')
  @ApiOperation({ summary: 'List financial periods' })
  @ApiResponse({ status: 200, description: 'List of periods' })
  async getPeriods(@CurrentTenant() tenantId: string) {
    return this.financeService.getPeriods(tenantId);
  }

  @Post('periods')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create financial period' })
  @ApiResponse({ status: 201, description: 'Period created' })
  async createPeriod(@Body() dto: CreateFinancialPeriodDto, @CurrentTenant() tenantId: string) {
    return this.financeService.createPeriod(dto, tenantId);
  }

  @Patch('periods/:id/close')
  @ApiOperation({ summary: 'Close financial period' })
  @ApiResponse({ status: 200, description: 'Period closed' })
  async closePeriod(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.financeService.closePeriod(id, tenantId);
  }

  @Put('periods/:id/close')
  @ApiOperation({ summary: 'Close financial period (PUT alias)' })
  @ApiResponse({ status: 200, description: 'Period closed' })
  async closePeriodPut(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.financeService.closePeriod(id, tenantId);
  }

  // ─── Reports ───────────────────────────────────────────���─────────────

  @Get('general-ledger/:account_id')
  @ApiOperation({ summary: 'Get general ledger for account' })
  @ApiQuery({ name: 'period_id', required: false })
  @ApiResponse({ status: 200, description: 'GL data for account' })
  async getGeneralLedger(
    @Param('account_id') accountId: string,
    @Query('period_id') periodId?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    return this.financeService.getGeneralLedger(accountId, tenantId, periodId);
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Get trial balance' })
  @ApiQuery({ name: 'period_id', required: true })
  @ApiResponse({ status: 200, description: 'Trial balance data' })
  async getTrialBalance(@Query('period_id') periodId: string, @CurrentTenant() tenantId: string) {
    return this.financeService.getTrialBalance(periodId, tenantId);
  }

  @Post('post-document')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post document to GL' })
  @ApiResponse({ status: 201, description: 'Document posted to GL' })
  async postDocument(@Body() documentData: any, @CurrentTenant() tenantId: string) {
    return this.financeService.postDocument(documentData, tenantId);
  }

  // ─── Dashboard (stubs until real data accumulates) ───────────────────

  @Get('dashboard/kpis')
  @ApiOperation({ summary: 'Get finance dashboard KPIs' })
  async getDashboardKpis(@CurrentTenant() tenantId: string) {
    // Return basic KPIs from GL data
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      cashBalance: 0,
      revenueChange: 0,
      expensesChange: 0,
      netIncomeChange: 0,
      cashChange: 0,
    };
  }

  @Get('dashboard/revenue-chart')
  @ApiOperation({ summary: 'Get revenue chart data' })
  async getRevenueChart(@CurrentTenant() tenantId: string) {
    return [];
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate financial report' })
  async generateReport(@Body() params: any, @CurrentTenant() tenantId: string) {
    if (params.type === 'TRIAL_BALANCE') {
      // Find the period for the date range
      return { data: [] };
    }
    return { data: [] };
  }
}
