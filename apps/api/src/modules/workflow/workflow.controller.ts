import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { WorkflowService } from './workflow.service';

@ApiTags('Workflow')
@Controller('api/v1/workflow')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get('definitions')
  getDefinitions(@CurrentTenant() tenantId: string) {
    return this.workflowService.getDefinitions(tenantId);
  }

  @Post('definitions')
  createDefinition(@Body() data: any, @CurrentTenant() tenantId: string) {
    return this.workflowService.createDefinition(tenantId, data);
  }

  @Post('execute')
  executeWorkflow(@Body() data: any, @CurrentTenant() tenantId: string) {
    return this.workflowService.execute(tenantId, data);
  }
}
