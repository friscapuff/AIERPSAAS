import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApprovalRulesService } from './approval-rules.service';

@ApiTags('Approval Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dynamic-builder/approval-rules')
export class ApprovalRulesController {
  constructor(private readonly service: ApprovalRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List approval rules, optionally filtered by table' })
  async list(@CurrentTenant() tenantId: string, @Query('tableName') tableName?: string) {
    return this.service.listRules(tenantId, tableName);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an approval rule by ID' })
  async get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.getRule(tenantId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new approval rule' })
  async create(@CurrentTenant() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.createRule(tenantId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an approval rule' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateRule(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an approval rule' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.deleteRule(tenantId, id);
  }

  @Post('evaluate/:tableName/:recordId')
  @ApiOperation({ summary: 'Evaluate approval rules for a record status change' })
  async evaluate(@CurrentTenant() tenantId: string, @Param('tableName') tableName: string, @Param('recordId') recordId: string, @Body('status') status: string) {
    return this.service.evaluateApproval(tenantId, tableName, recordId, status);
  }
}
