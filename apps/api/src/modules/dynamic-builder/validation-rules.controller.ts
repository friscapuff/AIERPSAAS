import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ValidationRulesService } from './validation-rules.service';

@ApiTags('Validation Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dynamic-builder/validation-rules')
export class ValidationRulesController {
  constructor(private readonly service: ValidationRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List validation rules, optionally filtered by table' })
  async list(@CurrentTenant() tenantId: string, @Query('tableName') tableName?: string) {
    return this.service.listRules(tenantId, tableName);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a validation rule by ID' })
  async get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.getRule(tenantId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a validation rule' })
  async create(@CurrentTenant() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.createRule(tenantId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a validation rule' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateRule(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a validation rule' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.deleteRule(tenantId, id);
  }

  @Post('validate/:tableName')
  @ApiOperation({ summary: 'Validate record data against all active rules for a table' })
  async validate(@CurrentTenant() tenantId: string, @Param('tableName') tableName: string, @Body() body: { data: Record<string, any>; isUpdate?: boolean }) {
    return this.service.validateRecord(tenantId, tableName, body.data, body.isUpdate ?? false);
  }
}
