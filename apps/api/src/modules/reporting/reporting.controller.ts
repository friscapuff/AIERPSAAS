import { Controller, Get, UseGuards, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportingService } from './reporting.service';

@ApiTags('Reporting')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportingController {
  private readonly logger = new Logger(ReportingController.name);

  constructor(private readonly reportingService: ReportingService) {}

  @Get('financial-summary')
  async getFinancialSummary(
    @CurrentUser() user: any,
    @Query('period') period: string,
  ) {
    return this.reportingService.getFinancialSummary(user.tenant_id, period);
  }

  @Get('inventory-status')
  async getInventoryStatus(
    @CurrentUser() user: any,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.reportingService.getInventoryStatus(user.tenant_id, warehouseId);
  }
}
