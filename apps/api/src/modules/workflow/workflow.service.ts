import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from 'libs/database/src/entities/workflow.entity';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
  ) {}

  async createWorkflow(tenantId: string, userId: string, dto: any) {
    const workflow = this.workflowRepository.create({
      ...dto,
      tenant_id: tenantId,
      created_by: userId,
    });

    return this.workflowRepository.save(workflow);
  }

  async getWorkflows(tenantId: string) {
    return this.workflowRepository.find({
      where: { tenant_id: tenantId },
    });
  }

  async deleteWorkflow(tenantId: string, workflowId: string) {
    return this.workflowRepository.delete({
      id: workflowId,
      tenant_id: tenantId,
    });
  }
}
