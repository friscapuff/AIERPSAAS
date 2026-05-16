import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ImpactRulesService } from './impact-rules.service';

@ApiTags('Impact Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dynamic-builder/impact-rules')
export class ImpactRulesController {
  constructor(private readonly service: ImpactRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List impact rules, optionally filtered by table or group' })
  async list(
    @CurrentTenant() tenantId: string,
    @Query('tableName') tableName?: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.service.listRules(tenantId, tableName, groupId);
  }

  @Get('groups')
  @ApiOperation({ summary: 'List impact rules grouped by groupId and trigger status' })
  async listGroups(
    @CurrentTenant() tenantId: string,
    @Query('tableName') tableName?: string,
  ) {
    return this.service.listGrouped(tenantId, tableName);
  }

  @Get('types')
  @ApiOperation({ summary: 'List all available impact types with descriptions' })
  async listTypes() {
    return this.service.getImpactTypes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an impact rule by ID' })
  async get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.getRule(tenantId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a single impact rule' })
  async create(@CurrentTenant() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.createRule(tenantId, userId, dto);
  }

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create multiple impact rules as a group (multi-impact transaction)' })
  async createBatch(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { groupName: string; tableName: string; triggerStatus: string; executionMode?: string; rules: any[] },
  ) {
    return this.service.createBatch(tenantId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an impact rule' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateRule(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an impact rule' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.deleteRule(tenantId, id);
  }

  @Delete('group/:groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all rules in a group' })
  async deleteGroup(@CurrentTenant() tenantId: string, @Param('groupId') groupId: string) {
    return this.service.deleteGroup(tenantId, groupId);
  }

  @Post('execute/:tableName/:recordId')
  @ApiOperation({ summary: 'Execute ALL impact rules for a record status change (multi-impact)' })
  async execute(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('tableName') tableName: string,
    @Param('recordId') recordId: string,
    @Body('status') status: string,
  ) {
    return this.service.executeImpacts(tenantId, tableName, recordId, status, userId);
  }
}
