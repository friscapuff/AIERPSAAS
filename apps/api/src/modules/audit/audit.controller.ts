import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Audit')
@Controller('api/v1/audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class AuditController {
  @Get('logs')
  getAuditLogs(
    @CurrentTenant() tenantId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return { data: [], meta: { page, limit, total: 0 } };
  }
}
