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
  HttpCode,
  HttpStatus,
  Res,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiProduces,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import {
  GenerateReportDto,
} from './dto/generate-report.dto';
import { CreateSavedReportDto } from './dto/create-saved-report.dto';
import { UpdateSavedReportDto } from './dto/update-saved-report.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import { ReportType, OutputFormat } from '@libs/database';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate any report type', description: 'Unified report generation endpoint. Supply reportType in the body to select the report. For file output set format to EXCEL or PDF.' })
  @ApiResponse({ status: 200, description: 'Report data or file download' })
  @ApiProduces('application/json', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/html')
  async generateReport(@Body() dto: GenerateReportDto, @CurrentTenant() tenantId: string, @Res() res: Response) {
    const data = await this.dispatchReport(tenantId, dto);
    if (dto.format === OutputFormat.EXCEL) return this.sendExcel(res, data, dto.reportType);
    if (dto.format === OutputFormat.PDF) return this.sendPdf(res, data, dto.reportType);
    return res.json(data);
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Trial Balance' })
  @ApiQuery({ name: 'period_id', required: false })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  async getTrialBalance(@CurrentTenant() tenantId: string, @Query('period_id') periodId?: string, @Query('start_date') startDate?: string, @Query('end_date') endDate?: string) {
    return this.reportingService.generateTrialBalance(tenantId, periodId, startDate, endDate);
  }

  @Get('income-statement')
  @ApiOperation({ summary: 'Income Statement (P&L)' })
  @ApiQuery({ name: 'period_id', required: false })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  async getIncomeStatement(@CurrentTenant() tenantId: string, @Query('period_id') periodId?: string, @Query('start_date') startDate?: string, @Query('end_date') endDate?: string) {
    return this.reportingService.generateIncomeStatement(tenantId, periodId, startDate, endDate);
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Balance Sheet' })
  @ApiQuery({ name: 'as_of_date', required: false })
  async getBalanceSheet(@CurrentTenant() tenantId: string, @Query('as_of_date') asOfDate?: string) {
    return this.reportingService.generateBalanceSheet(tenantId, asOfDate);
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Cash Flow Statement' })
  @ApiQuery({ name: 'period_id', required: false })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  async getCashFlow(@CurrentTenant() tenantId: string, @Query('period_id') periodId?: string, @Query('start_date') startDate?: string, @Query('end_date') endDate?: string) {
    return this.reportingService.generateCashFlow(tenantId, periodId, startDate, endDate);
  }

  @Get('gl-detail')
  @ApiOperation({ summary: 'General Ledger Detail' })
  @ApiQuery({ name: 'account_id', required: false })
  @ApiQuery({ name: 'period_id', required: false })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getGLDetail(@CurrentTenant() tenantId: string, @Query('account_id') accountId?: string, @Query('period_id') periodId?: string, @Query('start_date') startDate?: string, @Query('end_date') endDate?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.reportingService.generateGLDetail(tenantId, { accountId, periodId, startDate, endDate, page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get('inventory-valuation')
  @ApiOperation({ summary: 'Inventory Valuation' })
  @ApiQuery({ name: 'warehouse_id', required: false })
  async getInventoryValuation(@CurrentTenant() tenantId: string, @Query('warehouse_id') warehouseId?: string) {
    return this.reportingService.generateInventoryValuation(tenantId, warehouseId);
  }

  @Post('export/excel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export report to Excel (.xlsx)' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiBody({ type: GenerateReportDto })
  async exportExcel(@Body() dto: GenerateReportDto, @CurrentTenant() tenantId: string, @Res() res: Response) {
    const data = await this.dispatchReport(tenantId, dto);
    return this.sendExcel(res, data, dto.reportType);
  }

  @Post('export/pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export report to PDF (HTML print-ready)' })
  @ApiProduces('text/html')
  @ApiBody({ type: GenerateReportDto })
  async exportPdf(@Body() dto: GenerateReportDto, @CurrentTenant() tenantId: string, @Res() res: Response) {
    const data = await this.dispatchReport(tenantId, dto);
    return this.sendPdf(res, data, dto.reportType);
  }

  @Post('saved')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a saved report definition' })
  async createSavedReport(@Body() dto: CreateSavedReportDto, @CurrentTenant() tenantId: string, @Request() req: any) {
    const userId: string = req.user?.id ?? req.user?.sub ?? 'system';
    return this.reportingService.createSavedReport(tenantId, dto, userId);
  }

  @Get('saved')
  @ApiOperation({ summary: 'List saved report definitions' })
  async listSavedReports(@CurrentTenant() tenantId: string, @Query() query: QueryReportsDto) {
    return this.reportingService.listSavedReports(tenantId, query);
  }

  @Get('saved/:id')
  @ApiOperation({ summary: 'Get a saved report definition by ID' })
  @ApiParam({ name: 'id', description: 'Saved report UUID' })
  async getSavedReport(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string) {
    return this.reportingService.getSavedReport(tenantId, id);
  }

  @Put('saved/:id')
  @ApiOperation({ summary: 'Update a saved report definition' })
  @ApiParam({ name: 'id', description: 'Saved report UUID' })
  async updateSavedReport(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSavedReportDto, @CurrentTenant() tenantId: string) {
    return this.reportingService.updateSavedReport(tenantId, id, dto);
  }

  @Delete('saved/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved report definition' })
  @ApiParam({ name: 'id', description: 'Saved report UUID' })
  async deleteSavedReport(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string) {
    await this.reportingService.deleteSavedReport(tenantId, id);
  }

  @Post('saved/:id/run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a saved report' })
  @ApiParam({ name: 'id', description: 'Saved report UUID' })
  async runSavedReport(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenantId: string) {
    return this.reportingService.runSavedReport(tenantId, id);
  }

  private async dispatchReport(tenantId: string, dto: GenerateReportDto): Promise<any> {
    switch (dto.reportType) {
      case ReportType.TRIAL_BALANCE: return this.reportingService.generateTrialBalance(tenantId, dto.periodId, dto.startDate, dto.endDate);
      case ReportType.INCOME_STATEMENT: return this.reportingService.generateIncomeStatement(tenantId, dto.periodId, dto.startDate, dto.endDate);
      case ReportType.BALANCE_SHEET: return this.reportingService.generateBalanceSheet(tenantId, dto.asOfDate);
      case ReportType.CASH_FLOW: return this.reportingService.generateCashFlow(tenantId, dto.periodId, dto.startDate, dto.endDate);
      case ReportType.GL_DETAIL: return this.reportingService.generateGLDetail(tenantId, { accountId: dto.accountIds?.[0], periodId: dto.periodId, startDate: dto.startDate, endDate: dto.endDate, page: dto.page, limit: dto.limit });
      case ReportType.INVENTORY_VALUATION: return this.reportingService.generateInventoryValuation(tenantId, dto.warehouseId);
      default: return this.reportingService.executeCustomQuery(tenantId, dto as any);
    }
  }

  private sendExcel(res: Response, data: any, reportType: ReportType): void {
    const exportData = this.reportingService.exportToExcel(data, reportType);
    const buffer = this.reportingService.buildXlsxBuffer(exportData);
    const filename = `${reportType.toLowerCase()}_${Date.now()}.xlsx`;
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': String(buffer.length) });
    res.end(buffer);
  }

  private sendPdf(res: Response, data: any, reportType: ReportType): void {
    const exportData = this.reportingService.exportToPdf(data, reportType);
    const buffer = this.reportingService.buildPdfBuffer(exportData);
    const filename = `${reportType.toLowerCase()}_${Date.now()}.html`;
    res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': String(buffer.length) });
    res.end(buffer);
  }
}
