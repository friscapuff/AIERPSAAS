import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateWorkflowDto, UpdateWorkflowDto, SubmitForApprovalDto, ApproveRejectDto, QueryWorkflowDto } from './dto';

@ApiTags('Workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  @ApiOperation({ summary: 'List all workflow templates' })
  async listWorkflows(@CurrentTenant() tenantId: string) { return this.workflowService.listWorkflows(tenantId); }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow template by ID' })
  async getWorkflow(@Param('id') id: string, @CurrentTenant() tenantId: string) { return this.workflowService.getWorkflow(tenantId, id); }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create workflow template' })
  @ApiBody({ type: CreateWorkflowDto })
  async createWorkflow(@Body() dto: CreateWorkflowDto, @CurrentTenant() tenantId: string) { return this.workflowService.createWorkflow(tenantId, dto); }

  @Put(':id')
  @ApiOperation({ summary: 'Update workflow template' })
  @ApiBody({ type: UpdateWorkflowDto })
  async updateWorkflow(@Param('id') id: string, @Body() dto: UpdateWorkflowDto, @CurrentTenant() tenantId: string) { return this.workflowService.updateWorkflow(tenantId, id, dto); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete (soft) workflow template' })
  async deleteWorkflow(@Param('id') id: string, @CurrentTenant() tenantId: string) { await this.workflowService.deleteWorkflow(tenantId, id); }

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit document for approval' })
  @ApiBody({ type: SubmitForApprovalDto })
  async submitForApproval(@Body() dto: SubmitForApprovalDto, @CurrentUser() user: any, @CurrentTenant() tenantId: string) { return this.workflowService.submitForApproval(tenantId, user.id, dto); }

  @Post('instances/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve workflow instance' })
  @ApiBody({ type: ApproveRejectDto })
  async approveInstance(@Param('id') instanceId: string, @Body() dto: ApproveRejectDto, @CurrentUser() user: any, @CurrentTenant() tenantId: string) { return this.workflowService.approveOrReject(tenantId, user.id, instanceId, dto); }

  @Post('instances/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject workflow instance' })
  @ApiBody({ type: ApproveRejectDto })
  async rejectInstance(@Param('id') instanceId: string, @Body() dto: ApproveRejectDto, @CurrentUser() user: any, @CurrentTenant() tenantId: string) { return this.workflowService.approveOrReject(tenantId, user.id, instanceId, dto); }

  @Post('instances/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel workflow instance' })
  async cancelInstance(@Param('id') instanceId: string, @CurrentUser() user: any, @CurrentTenant() tenantId: string) { return this.workflowService.cancelWorkflow(tenantId, user.id, instanceId); }

  @Get('instances')
  @ApiOperation({ summary: 'Query workflow instances with filters' })
  async queryInstances(@Query() queryDto: QueryWorkflowDto, @CurrentTenant() tenantId: string) { return this.workflowService.queryInstances(tenantId, queryDto); }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get workflow instance with approval history' })
  async getInstanceHistory(@Param('id') instanceId: string, @CurrentTenant() tenantId: string) { return this.workflowService.getInstanceHistory(tenantId, instanceId); }

  @Get('my-approvals')
  @ApiOperation({ summary: 'Get current user pending approvals' })
  async getMyApprovals(@CurrentUser() user: any, @CurrentTenant() tenantId: string) { return this.workflowService.getMyPendingApprovals(tenantId, user.id); }
}
