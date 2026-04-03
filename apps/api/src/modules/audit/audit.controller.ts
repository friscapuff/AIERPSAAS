import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getLogs(
    @Query('skip') skip = 0,
    @Query('take') take = 100,
  ) {
    return this.auditService.findLogs(skip, take);
  }

  @Get('logs/:id')
  async getLogById(@Query('id') id: string) {
    return this.auditService.findLogById(id);
  }
}
