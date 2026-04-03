import { Injectable } from '@nestjs/common';

interface Workflow {
  id: string;
  workflowName: string;
  description?: string;
  definition: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class WorkflowService {
  private workflows: Map<string, Workflow> = new Map();

  async getWorkflows() {
    return Array.from(this.workflows.values());
  }

  async getWorkflow(id: string) {
    return this.workflows.get(id);
  }

  async createWorkflow(createWorkflowDto: any) {
    const id = Math.random().toString(36).substr(2, 9);
    const workflow: Workflow = {
      id,
      ...createWorkflowDto,
      isActive: true,
      createdAt: new Date(),
    };
    this.workflows.set(id, workflow);
    return workflow;
  }

  async updateWorkflow(id: string, updateWorkflowDto: any) {
    const workflow = this.workflows.get(id);
    if (!workflow) return null;
    const updated = { ...workflow, ...updateWorkflowDto };
    this.workflows.set(id, updated);
    return updated;
  }

  async deleteWorkflow(id: string) {
    this.workflows.delete(id);
    return { id, deleted: true };
  }

  async executeWorkflow(id: string, payload: any) {
    const workflow = this.workflows.get(id);
    if (!workflow) return null;
    return {
      workflowId: id,
      executionId: Math.random().toString(36).substr(2, 9),
      status: 'started',
      payload,
      timestamp: new Date(),
    };
  }
}
