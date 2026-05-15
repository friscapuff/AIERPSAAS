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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { IntercompanyService } from './intercompany.service';
import {
  CreateAgreementDto,
  CreateIntercompanyTxDto,
  SettleTransactionDto,
  QueryIntercompanyDto,
} from './dto';

@ApiTags('Intercompany')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('intercompany')
export class IntercompanyController {
  constructor(private readonly icService: IntercompanyService) {}

  @Post('agreements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an intercompany agreement' })
  @ApiResponse({ status: 201, description: 'Agreement created successfully' })
  async createAgreement(@Body() dto: CreateAgreementDto, @CurrentUser() user: any) {
    return this.icService.createAgreement(dto, user?.id ?? user?.sub ?? 'system');
  }

  @Get('agreements')
  @ApiOperation({ summary: 'List intercompany agreements' })
  @ApiQuery({ name: 'parentTenantId', required: false })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of agreements' })
  async listAgreements(
    @Query('parentTenantId') parentTenantId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.icService.listAgreements(parentTenantId, includeInactive !== 'true');
  }

  @Get('agreements/:id')
  @ApiOperation({ summary: 'Get a single intercompany agreement by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Agreement details' })
  async getAgreement(@Param('id', ParseUUIDPipe) id: string) {
    return this.icService.getAgreement(id);
  }

  @Put('agreements/:id')
  @ApiOperation({ summary: 'Update an intercompany agreement' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Agreement updated' })
  async updateAgreement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateAgreementDto>,
    @CurrentUser() user: any,
  ) {
    return this.icService.updateAgreement(id, dto, user?.id ?? user?.sub ?? 'system');
  }

  @Delete('agreements/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an intercompany agreement' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Agreement deactivated' })
  async deleteAgreement(@Param('id', ParseUUIDPipe) id: string) {
    await this.icService.deleteAgreement(id);
  }

  @Post('transactions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an intercompany transaction' })
  @ApiResponse({ status: 201, description: 'Intercompany transaction created and journals posted' })
  async createTransaction(
    @Body() dto: CreateIntercompanyTxDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.icService.createTransaction(tenantId, dto, user?.id ?? user?.sub ?? 'system');
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List intercompany transactions for the current tenant' })
  @ApiResponse({ status: 200, description: 'Paginated list of intercompany transactions' })
  async listTransactions(@Query() dto: QueryIntercompanyDto, @CurrentTenant() tenantId: string) {
    return this.icService.listTransactions(tenantId, dto);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get a single intercompany transaction by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Transaction detail' })
  async getTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.icService.getTransaction(tenantId, id);
  }

  @Post('transactions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an intercompany transaction' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Transaction cancelled and reversals posted' })
  async cancelTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.icService.cancelTransaction(tenantId, id, user?.id ?? user?.sub ?? 'system');
  }

  @Post('settle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Settle multiple intercompany transactions in a single batch' })
  @ApiResponse({ status: 200, description: 'Settlement completed' })
  async settleTransactions(
    @Body() dto: SettleTransactionDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.icService.settleTransactions(tenantId, dto, user?.id ?? user?.sub ?? 'system');
  }

  @Get('balances')
  @ApiOperation({ summary: 'Get intercompany balance matrix for a holding company' })
  @ApiQuery({ name: 'parentTenantId', required: true })
  @ApiResponse({ status: 200, description: 'Intercompany balance matrix' })
  async getIntercompanyBalances(@Query('parentTenantId', ParseUUIDPipe) parentTenantId: string) {
    return this.icService.getIntercompanyBalances(parentTenantId);
  }

  @Get('elimination-entries')
  @ApiOperation({ summary: 'Generate elimination journal entries for group consolidation' })
  @ApiQuery({ name: 'parentTenantId', required: true })
  @ApiQuery({ name: 'periodId', required: false })
  @ApiResponse({ status: 200, description: 'Elimination entries (for review only)' })
  async getEliminationEntries(
    @Query('parentTenantId', ParseUUIDPipe) parentTenantId: string,
    @Query('periodId') periodId?: string,
  ) {
    return this.icService.getEliminationEntries(parentTenantId, periodId);
  }

  @Get('consolidated-trial-balance')
  @ApiOperation({ summary: 'Get consolidated trial balance for a holding company' })
  @ApiQuery({ name: 'parentTenantId', required: true })
  @ApiQuery({ name: 'periodId', required: false })
  @ApiResponse({ status: 200, description: 'Consolidated trial balance with elimination detail' })
  async getConsolidatedTrialBalance(
    @Query('parentTenantId', ParseUUIDPipe) parentTenantId: string,
    @Query('periodId') periodId?: string,
  ) {
    return this.icService.getConsolidatedTrialBalance(parentTenantId, periodId);
  }
}
