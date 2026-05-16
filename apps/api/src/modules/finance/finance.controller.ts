import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse, ApiQuery, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsDateString, IsBoolean, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

// ─── DTOs with class-validator decorators ───────────────────────────────────
// (Required because ValidationPipe uses forbidNonWhitelisted: true)

export class CreateChartOfAccountsDto {
  @ApiProperty()
  @IsString()
  account_code: string;

  @ApiProperty()
  @IsString()
  account_name: string;

  @ApiProperty()
  @IsString()
  account_type: string;

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
  @IsNumber()
  level?: number;
}

class JournalLineDto {
  @ApiProperty()
  @IsString()
  account_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  debit_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  credit_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateJournalEntryDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsDateString()
  transaction_date: Date;

  @ApiProperty()
  @IsString()
  reference_number: string;

  @ApiProperty({ type: [JournalLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}

export class CreateFinancialPeriodDto {
  @ApiProperty()
  @IsDateString()
  period_start: Date;

  @ApiProperty()
  @IsDateString()
  period_end: Date;

  @ApiProperty()
  @IsString()
  period_name: string;

  @ApiProperty()
  @IsBoolean()
  is_open: boolean;
}

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ─── Frontend-compatible routes ───────────────────────────────────────

  @Get('accounts')
  @ApiOperation({ summary: 'List all accounts (flat list)' })
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

  @Patch('periods/:id/close')
  @ApiOperation({ summary: 'Close financial period (PATCH)' })
  @ApiResponse({ status: 200, description: 'Period closed' })
  async closePeriodPatch(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.financeService.closePeriod(id, tenantId);
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

  // ─── Original Swagger-compatible routes ───────────────────────────────

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

  @Post('journal-entries')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created' })
  async createJournalEntry(@Body() createJournalEntryDto: CreateJournalEntryDto, @CurrentTenant() tenantId: string) {
    return this.financeService.createJournalEntry(createJournalEntryDto, tenantId);
  }

  @Get('journal-entries')
  @ApiOperation({ summary: 'List journal entries' })
  @ApiQuery({ name: 'period_id', required: false })
  @ApiQuery({ name: 'account_id', required: false })
  @ApiResponse({ status: 200, description: 'List of journal entries' })
  async getJournalEntries(
    @Query('period_id') periodId?: string,
    @Query('account_id') accountId?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    return this.financeService.getJournalEntries(tenantId, periodId, accountId);
  }

  @Get('general-ledger/:account_id')
  @ApiOperation({ summary: 'Get general ledger for account' })
  @ApiQuery({ name: 'period_id', required: false })
  @ApiResponse({ status: 200, description: 'GL data for account' })
  async getGeneralLedger(@Param('account_id') accountId: string, @Query('period_id') periodId?: string, @CurrentTenant() tenantId?: string) {
    return this.financeService.getGeneralLedger(accountId, tenantId, periodId);
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Get trial balance' })
  @ApiQuery({ name: 'period_id', required: true })
  @ApiResponse({ status: 200, description: 'Trial balance data' })
  async getTrialBalance(@Query('period_id') periodId: string, @CurrentTenant() tenantId: string) {
    return this.financeService.getTrialBalance(periodId, tenantId);
  }

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
  async createPeriod(@Body() createPeriodDto: CreateFinancialPeriodDto, @CurrentTenant() tenantId: string) {
    return this.financeService.createPeriod(createPeriodDto, tenantId);
  }

  @Put('periods/:id/close')
  @ApiOperation({ summary: 'Close financial period' })
  @ApiResponse({ status: 200, description: 'Period closed' })
  async closePeriod(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.financeService.closePeriod(id, tenantId);
  }

  @Post('post-document')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post document to GL' })
  @ApiResponse({ status: 201, description: 'Document posted to GL' })
  async postDocument(@Body() documentData: any, @CurrentTenant() tenantId: string) {
    return this.financeService.postDocument(documentData, tenantId);
  }
}
