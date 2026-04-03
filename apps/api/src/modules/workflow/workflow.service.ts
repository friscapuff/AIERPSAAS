import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkflowService {
  async getDefinitions(tenantId: string) {
    return { data: [] };
  }

  async createDefinition(tenantId: string, data: any) {
    return { id: 'workflow-1', ...data };
  }

  async execute(tenantId: string, data: any) {
    return { executionId: 'exec-1', status: 'running' };
  }
}
