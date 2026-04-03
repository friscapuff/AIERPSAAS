import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('reporting')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('reports')
  async getReports() {
    return this.reportingService.getReports();
  }

  @Get('reports/financial')
  async getFinancialReports(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getFinancialReports(startDate, endDate);
  }

  @Get('reports/operational')
  async getOperationalReports(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getOperationalReports(startDate, endDate);
  }

  @Get('dashboards')
  async getDashboards() {
    return this.reportingService.getDashboards();
  }

  @Get('kpis')
  async getKPIs() {
    return this.reportingService.getKPIs();
  }
}
