import { Controller, Get, Post, Body, UseGuards, Logger, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkflowService } from './workflow.service';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowController {
  private readonly logger = new Logger(WorkflowController.name);

  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  async createWorkflow(
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return this.workflowService.createWorkflow(user.tenant_id, user.id, dto);
  }

  @Get()
  async getWorkflows(@CurrentUser() user: any) {
    return this.workflowService.getWorkflows(user.tenant_id);
  }

  @Delete(':id')
  async deleteWorkflow(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.workflowService.deleteWorkflow(user.tenant_id, id);
  }
}
