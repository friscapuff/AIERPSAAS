import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { FinanceService } from './finance.service';

@ApiTags('Finance')
@Controller('api/v1/finance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('accounts')
  getAccounts(@CurrentTenant() tenantId: string) {
    return this.financeService.getAccounts(tenantId);
  }

  @Post('entries')
  createJournalEntry(@Body() data: any, @CurrentTenant() tenantId: string) {
    return this.financeService.createJournalEntry(tenantId, data);
  }

  @Get('reports')
  getFinancialReports(@CurrentTenant() tenantId: string) {
    return this.financeService.getReports(tenantId);
  }
}
