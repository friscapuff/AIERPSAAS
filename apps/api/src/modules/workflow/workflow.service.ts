import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow, WorkflowInstance, WorkflowInstanceStatus, ApprovalComment } from '@libs/database';
import { CreateWorkflowDto, UpdateWorkflowDto, SubmitForApprovalDto, ApproveRejectDto, ApprovalAction, QueryWorkflowDto } from './dto';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectRepository(Workflow) private workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowInstance) private workflowInstanceRepository: Repository<WorkflowInstance>,
  ) {}

  async createWorkflow(tenantId: string, dto: CreateWorkflowDto): Promise<Workflow> {
    const workflow = this.workflowRepository.create({
      tenant_id: tenantId, name: dto.name, trigger_doc_type: dto.triggerDocType,
      conditions: dto.conditions || [], approval_levels: dto.approvalLevels, is_active: dto.isActive !== false,
    });
    return await this.workflowRepository.save(workflow);
  }

  async getWorkflow(tenantId: string, workflowId: string): Promise<Workflow> {
    const workflow = await this.workflowRepository.findOne({ where: { id: workflowId, tenant_id: tenantId } });
    if (!workflow) throw new NotFoundException(`Workflow ${workflowId} not found`);
    return workflow;
  }

  async listWorkflows(tenantId: string): Promise<Workflow[]> {
    return this.workflowRepository.find({ where: { tenant_id: tenantId }, order: { created_at: 'DESC' } });
  }

  async updateWorkflow(tenantId: string, workflowId: string, dto: UpdateWorkflowDto): Promise<Workflow> {
    const workflow = await this.getWorkflow(tenantId, workflowId);
    if (dto.name) workflow.name = dto.name;
    if (dto.triggerDocType) workflow.trigger_doc_type = dto.triggerDocType;
    if (dto.conditions) workflow.conditions = dto.conditions;
    if (dto.approvalLevels) workflow.approval_levels = dto.approvalLevels;
    if (dto.isActive !== undefined) workflow.is_active = dto.isActive;
    return await this.workflowRepository.save(workflow);
  }

  async deleteWorkflow(tenantId: string, workflowId: string): Promise<void> {
    const workflow = await this.getWorkflow(tenantId, workflowId);
    workflow.is_active = false;
    await this.workflowRepository.save(workflow);
  }

  async submitForApproval(tenantId: string, userId: string, dto: SubmitForApprovalDto): Promise<WorkflowInstance> {
    const workflow = await this.workflowRepository.findOne({ where: { tenant_id: tenantId, trigger_doc_type: dto.documentType, is_active: true } });
    if (!workflow) {
      const instance = this.workflowInstanceRepository.create({ tenant_id: tenantId, workflow_id: null, document_type: dto.documentType, document_id: dto.documentId, current_status: WorkflowInstanceStatus.APPROVED, current_level: 0, initiated_by: userId, initiated_at: new Date(), completed_at: new Date(), comments: [] });
      return await this.workflowInstanceRepository.save(instance);
    }
    const shouldAutoApprove = workflow.conditions && workflow.conditions.length > 0 && !this.evaluateConditions(workflow.conditions);
    if (shouldAutoApprove) {
      const instance = this.workflowInstanceRepository.create({ tenant_id: tenantId, workflow_id: workflow.id, document_type: dto.documentType, document_id: dto.documentId, current_status: WorkflowInstanceStatus.APPROVED, current_level: 0, initiated_by: userId, initiated_at: new Date(), completed_at: new Date(), comments: [] });
      return await this.workflowInstanceRepository.save(instance);
    }
    const instance = this.workflowInstanceRepository.create({ tenant_id: tenantId, workflow_id: workflow.id, document_type: dto.documentType, document_id: dto.documentId, current_status: WorkflowInstanceStatus.PENDING_APPROVAL, current_level: 1, initiated_by: userId, initiated_at: new Date(), comments: [] });
    return await this.workflowInstanceRepository.save(instance);
  }

  async approveOrReject(tenantId: string, userId: string, instanceId: string, dto: ApproveRejectDto): Promise<WorkflowInstance> {
    const instance = await this.getWorkflowInstance(tenantId, instanceId);
    if (instance.current_status !== WorkflowInstanceStatus.PENDING_APPROVAL) throw new BadRequestException(`Workflow instance is in ${instance.current_status} status, cannot approve/reject`);
    const workflow = await this.getWorkflow(tenantId, instance.workflow_id);
    const currentLevelConfig = workflow.approval_levels.find((l) => l.level === instance.current_level);
    if (!currentLevelConfig) throw new BadRequestException(`No approval level configuration found for level ${instance.current_level}`);
    const comment: ApprovalComment = { userId, level: instance.current_level, action: dto.action === ApprovalAction.APPROVE ? 'APPROVE' : 'REJECT', comment: dto.comment, timestamp: new Date() };
    if (!instance.comments) instance.comments = [];
    instance.comments.push(comment);
    if (dto.action === ApprovalAction.REJECT) {
      instance.current_status = WorkflowInstanceStatus.REJECTED;
      instance.completed_at = new Date();
    } else {
      const nextLevelConfig = workflow.approval_levels.find((l) => l.level === instance.current_level + 1);
      if (nextLevelConfig) { instance.current_level += 1; instance.current_status = WorkflowInstanceStatus.PENDING_APPROVAL; }
      else { instance.current_status = WorkflowInstanceStatus.APPROVED; instance.completed_at = new Date(); }
    }
    return await this.workflowInstanceRepository.save(instance);
  }

  async cancelWorkflow(tenantId: string, userId: string, instanceId: string): Promise<WorkflowInstance> {
    const instance = await this.getWorkflowInstance(tenantId, instanceId);
    if (instance.initiated_by !== userId) throw new ForbiddenException('Only the workflow initiator can cancel');
    instance.current_status = WorkflowInstanceStatus.CANCELLED;
    instance.completed_at = new Date();
    return await this.workflowInstanceRepository.save(instance);
  }

  async getMyPendingApprovals(tenantId: string, userId: string): Promise<WorkflowInstance[]> {
    return this.workflowInstanceRepository.createQueryBuilder('wi').where('wi.tenant_id = :tenantId', { tenantId }).andWhere('wi.current_status = :status', { status: WorkflowInstanceStatus.PENDING_APPROVAL }).orderBy('wi.initiated_at', 'DESC').getMany();
  }

  async getInstanceHistory(tenantId: string, instanceId: string): Promise<{ instance: WorkflowInstance; workflow: Workflow | null; comments: ApprovalComment[] }> {
    const instance = await this.getWorkflowInstance(tenantId, instanceId);
    const workflow = instance.workflow_id ? await this.getWorkflow(tenantId, instance.workflow_id) : null;
    return { instance, workflow, comments: instance.comments || [] };
  }

  async queryInstances(tenantId: string, queryDto: QueryWorkflowDto): Promise<{ data: WorkflowInstance[]; total: number; page: number; limit: number }> {
    const { status, documentType, initiatedBy, page = 1, limit = 20 } = queryDto;
    const query = this.workflowInstanceRepository.createQueryBuilder('wi').where('wi.tenant_id = :tenantId', { tenantId });
    if (status) query.andWhere('wi.current_status = :status', { status });
    if (documentType) query.andWhere('wi.document_type = :documentType', { documentType });
    if (initiatedBy) query.andWhere('wi.initiated_by = :initiatedBy', { initiatedBy });
    const [data, total] = await query.orderBy('wi.initiated_at', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  private async getWorkflowInstance(tenantId: string, instanceId: string): Promise<WorkflowInstance> {
    const instance = await this.workflowInstanceRepository.findOne({ where: { id: instanceId, tenant_id: tenantId } });
    if (!instance) throw new NotFoundException(`Workflow instance ${instanceId} not found`);
    return instance;
  }

  private evaluateConditions(conditions: any[]): boolean {
    return conditions && conditions.length > 0;
  }

  async getDefinitions(tenantId: string): Promise<Workflow[]> { return this.listWorkflows(tenantId); }
  async getDefinition(id: string, tenantId: string): Promise<Workflow | null> { try { return await this.getWorkflow(tenantId, id); } catch { return null; } }
  async createDefinition(dto: any, tenantId: string): Promise<Workflow> { return this.createWorkflow(tenantId, dto); }
  async updateDefinition(id: string, dto: any, tenantId: string): Promise<Workflow> { return this.updateWorkflow(tenantId, id, dto); }
  async deleteDefinition(id: string, tenantId: string): Promise<void> { return this.deleteWorkflow(tenantId, id); }
  async executeWorkflow(dto: any, tenantId: string, userId: string): Promise<any> { return this.submitForApproval(tenantId, userId, dto); }
  async getAssignedTasks(userId: string, tenantId: string): Promise<any[]> { return this.getMyPendingApprovals(tenantId, userId); }
  async completeTask(dto: any, userId: string, tenantId: string): Promise<any> { return this.approveOrReject(tenantId, userId, dto.task_id, { action: dto.action === 'APPROVE' ? ApprovalAction.APPROVE : ApprovalAction.REJECT, comment: dto.comments }); }
}
