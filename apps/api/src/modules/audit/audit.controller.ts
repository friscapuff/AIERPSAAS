import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Query audit logs (read-only)' })
  @ApiQuery({ name: 'entity_type', required: false })
  @ApiQuery({ name: 'entity_id', required: false })
  @ApiQuery({ name: 'user_id', required: false })
  @ApiQuery({ name: 'action', required: false, enum: ['CREATE', 'UPDATE', 'DELETE', 'READ'] })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Audit logs matching filters' })
  async getLogs(
    @Query('entity_type') entityType?: string,
    @Query('entity_id') entityId?: string,
    @Query('user_id') userId?: string,
    @Query('action') action?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @CurrentTenant() tenantId?: string,
  ) {
    return this.auditService.getLogs(
      {
        entityType,
        entityId,
        userId,
        action,
        fromDate,
        toDate,
        limit,
        offset,
      },
      tenantId,
    );
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get audit log entry' })
  @ApiResponse({ status: 200, description: 'Audit log entry details' })
  async getLogEntry(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.auditService.getLogEntry(id, tenantId);
  }

  @Get('entities/:entity_type/:entity_id')
  @ApiOperation({ summary: 'Get full audit trail for entity' })
  @ApiQuery({ name: 'action', required: false })
  @ApiResponse({ status: 200, description: 'Audit trail for entity' })
  async getEntityAuditTrail(
    @Param('entity_type') entityType: string,
    @Param('entity_id') entityId: string,
    @Query('action') action?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    return this.auditService.getEntityAuditTrail(entityType, entityId, tenantId, action);
  }

  @Get('users/:user_id/activity')
  @ApiOperation({ summary: 'Get activity for specific user' })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  @ApiResponse({ status: 200, description: 'User activity log' })
  async getUserActivity(
    @Param('user_id') userId: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    return this.auditService.getUserActivity(userId, tenantId, fromDate, toDate);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get audit summary statistics' })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  @ApiResponse({ status: 200, description: 'Audit summary statistics' })
  async getSummary(
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    return this.auditService.getSummary(tenantId, fromDate, toDate);
  }
}
