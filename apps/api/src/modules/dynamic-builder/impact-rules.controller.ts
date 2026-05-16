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
  @ApiOperation({ summary: 'List impact rules, optionally filtered by table' })
  async list(@CurrentTenant() tenantId: string, @Query('tableName') tableName?: string) {
    return this.service.listRules(tenantId, tableName);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an impact rule by ID' })
  async get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.getRule(tenantId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an impact rule' })
  async create(@CurrentTenant() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.createRule(tenantId, userId, dto);
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

  @Post('execute/:tableName/:recordId')
  @ApiOperation({ summary: 'Execute all impact rules for a record status change' })
  async execute(@CurrentTenant() tenantId: string, @Param('tableName') tableName: string, @Param('recordId') recordId: string, @Body('status') status: string) {
    return this.service.executeImpacts(tenantId, tableName, recordId, status);
  }
}
