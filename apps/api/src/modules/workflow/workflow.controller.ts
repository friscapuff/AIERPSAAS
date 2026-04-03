import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

interface CreateWorkflowDto {
  workflowName: string;
  description?: string;
  definition: Record<string, any>;
}

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  async getWorkflows() {
    return this.workflowService.getWorkflows();
  }

  @Get(':id')
  async getWorkflow(@Param('id') id: string) {
    return this.workflowService.getWorkflow(id);
  }

  @Post()
  async createWorkflow(@Body() createWorkflowDto: CreateWorkflowDto) {
    return this.workflowService.createWorkflow(createWorkflowDto);
  }

  @Put(':id')
  async updateWorkflow(
    @Param('id') id: string,
    @Body() updateWorkflowDto: Partial<CreateWorkflowDto>,
  ) {
    return this.workflowService.updateWorkflow(id, updateWorkflowDto);
  }

  @Delete(':id')
  async deleteWorkflow(@Param('id') id: string) {
    return this.workflowService.deleteWorkflow(id);
  }

  @Post(':id/execute')
  async executeWorkflow(
    @Param('id') id: string,
    @Body() payload: Record<string, any>,
  ) {
    return this.workflowService.executeWorkflow(id, payload);
  }
}
