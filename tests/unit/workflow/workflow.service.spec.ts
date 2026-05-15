/**
 * Workflow Service — unit test suite.
 *
 * Coverage:
 *  - submitForApproval: auto-approve when no workflow, condition evaluation, pending state
 *  - approveOrReject: level advancement, final approval, rejection, wrong status guard
 *  - cancelWorkflow: only initiator can cancel, sets CANCELLED status
 */

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkflowService } from '../../../apps/api/src/modules/workflow/workflow.service';
import {
  createMockRepository,
  createMockWorkflow,
  createMockWorkflowInstance,
  mockTenantId,
  mockUserId,
} from '../../setup/test-utils';

// ---------------------------------------------------------------------------
// Enum mirrors
// ---------------------------------------------------------------------------

const WorkflowInstanceStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

const ApprovalAction = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
} as const;

// ---------------------------------------------------------------------------

describe('WorkflowService', () => {
  let service: WorkflowService;
  let workflowRepository: ReturnType<typeof createMockRepository>;
  let workflowInstanceRepository: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    workflowRepository = createMockRepository();
    workflowInstanceRepository = createMockRepository();

    service = new WorkflowService(
      workflowRepository as any,
      workflowInstanceRepository as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // submitForApproval
  // =========================================================================

  describe('submitForApproval', () => {
    const submitDto = {
      documentType: 'INVOICE',
      documentId: 'inv-001',
    };

    it('should auto-approve when no active workflow exists for the document type', async () => {
      workflowRepository.findOne.mockResolvedValue(null); // no workflow

      const savedInstance = createMockWorkflowInstance({
        current_status: WorkflowInstanceStatus.APPROVED,
        workflow_id: null,
      });
      workflowInstanceRepository.create.mockReturnValue(savedInstance);
      workflowInstanceRepository.save.mockResolvedValue(savedInstance);

      const result = await service.submitForApproval(mockTenantId, mockUserId, submitDto as any);

      expect(result.current_status).toBe(WorkflowInstanceStatus.APPROVED);
      expect(result.workflow_id).toBeNull();
    });

    it('should create PENDING_APPROVAL instance when workflow has conditions that are met', async () => {
      const workflow = createMockWorkflow({
        conditions: [{ field: 'amount', operator: 'gt', value: 1000 }],
      });
      workflowRepository.findOne.mockResolvedValue(workflow);

      const pendingInstance = createMockWorkflowInstance({
        workflow_id: workflow.id,
        current_status: WorkflowInstanceStatus.PENDING_APPROVAL,
        current_level: 1,
      });
      workflowInstanceRepository.create.mockReturnValue(pendingInstance);
      workflowInstanceRepository.save.mockResolvedValue(pendingInstance);

      const result = await service.submitForApproval(mockTenantId, mockUserId, submitDto as any);

      expect(result.current_status).toBe(WorkflowInstanceStatus.PENDING_APPROVAL);
      expect(result.current_level).toBe(1);
    });

    it('should save the initiating user id on the new workflow instance', async () => {
      workflowRepository.findOne.mockResolvedValue(null);

      const savedInstance = createMockWorkflowInstance({
        initiated_by: mockUserId,
        current_status: WorkflowInstanceStatus.APPROVED,
      });
      workflowInstanceRepository.create.mockReturnValue(savedInstance);
      workflowInstanceRepository.save.mockResolvedValue(savedInstance);

      await service.submitForApproval(mockTenantId, mockUserId, submitDto as any);

      expect(workflowInstanceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ initiated_by: mockUserId }),
      );
    });

    it('should stamp initiated_at timestamp on the instance', async () => {
      workflowRepository.findOne.mockResolvedValue(null);
      workflowInstanceRepository.create.mockImplementation((data: any) => ({ ...data }));
      workflowInstanceRepository.save.mockImplementation((data: any) =>
        Promise.resolve({ ...data, id: 'inst-1111' }),
      );

      const result = await service.submitForApproval(mockTenantId, mockUserId, submitDto as any);

      expect(result.initiated_at).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // approveOrReject
  // =========================================================================

  describe('approveOrReject', () => {
    it('should advance to next level when first level is approved and more levels exist', async () => {
      const workflow = createMockWorkflow({
        approval_levels: [
          { level: 1, approverRoleId: 'role-mgr', name: 'Manager' },
          { level: 2, approverRoleId: 'role-dir', name: 'Director' },
        ],
      });
      const instance = createMockWorkflowInstance({
        current_status: WorkflowInstanceStatus.PENDING_APPROVAL,
        current_level: 1,
        workflow_id: workflow.id,
      });

      workflowInstanceRepository.findOne.mockResolvedValue(instance);
      workflowRepository.findOne.mockResolvedValue(workflow);

      const advanced = { ...instance, current_level: 2, current_status: WorkflowInstanceStatus.PENDING_APPROVAL };
      workflowInstanceRepository.save.mockResolvedValue(advanced);

      const result = await service.approveOrReject(
        mockTenantId,
        mockUserId,
        instance.id,
        { action: ApprovalAction.APPROVE } as any,
      );

      expect(result.current_level).toBe(2);
      expect(result.current_status).toBe(WorkflowInstanceStatus.PENDING_APPROVAL);
    });

    it('should mark instance as APPROVED when final level is approved', async () => {
      const workflow = createMockWorkflow({
        approval_levels: [
          { level: 1, approverRoleId: 'role-mgr', name: 'Manager' },
        ],
      });
      const instance = createMockWorkflowInstance({
        current_status: WorkflowInstanceStatus.PENDING_APPROVAL,
        current_level: 1,
        workflow_id: workflow.id,
      });

      workflowInstanceRepository.findOne.mockResolvedValue(instance);
      workflowRepository.findOne.mockResolvedValue(workflow);

      const approved = {
        ...instance,
        current_status: WorkflowInstanceStatus.APPROVED,
        completed_at: new Date(),
      };
      workflowInstanceRepository.save.mockResolvedValue(approved);

      const result = await service.approveOrReject(
        mockTenantId,
        mockUserId,
        instance.id,
        { action: ApprovalAction.APPROVE } as any,
      );

      expect(result.current_status).toBe(WorkflowInstanceStatus.APPROVED);
      expect(result.completed_at).toBeInstanceOf(Date);
    });

    it('should mark instance as REJECTED and complete it on rejection', async () => {
      const workflow = createMockWorkflow();
      const instance = createMockWorkflowInstance({
        current_status: WorkflowInstanceStatus.PENDING_APPROVAL,
        current_level: 1,
        workflow_id: workflow.id,
      });

      workflowInstanceRepository.findOne.mockResolvedValue(instance);
      workflowRepository.findOne.mockResolvedValue(workflow);

      const rejected = {
        ...instance,
        current_status: WorkflowInstanceStatus.REJECTED,
        completed_at: new Date(),
      };
      workflowInstanceRepository.save.mockResolvedValue(rejected);

      const result = await service.approveOrReject(
        mockTenantId,
        mockUserId,
        instance.id,
        { action: ApprovalAction.REJECT, comment: 'Amount too high' } as any,
      );

      expect(result.current_status).toBe(WorkflowInstanceStatus.REJECTED);
    });

    it('should throw BadRequestException when instance is not in PENDING_APPROVAL status', async () => {
      const instance = createMockWorkflowInstance({
        current_status: WorkflowInstanceStatus.APPROVED,
      });

      workflowInstanceRepository.findOne.mockResolvedValue(instance);

      await expect(
        service.approveOrReject(mockTenantId, mockUserId, instance.id, {
          action: ApprovalAction.APPROVE,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when workflow instance does not exist', async () => {
      workflowInstanceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.approveOrReject(mockTenantId, mockUserId, 'bad-id', {
          action: ApprovalAction.APPROVE,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no approval level configuration found', async () => {
      const workflow = createMockWorkflow({
        approval_levels: [], // no levels configured
      });
      const instance = createMockWorkflowInstance({
        current_status: WorkflowInstanceStatus.PENDING_APPROVAL,
        current_level: 1,
        workflow_id: workflow.id,
      });

      workflowInstanceRepository.findOne.mockResolvedValue(instance);
      workflowRepository.findOne.mockResolvedValue(workflow);

      await expect(
        service.approveOrReject(mockTenantId, mockUserId, instance.id, {
          action: ApprovalAction.APPROVE,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should append an approval comment to the instance comments array', async () => {
      const workflow = createMockWorkflow({
        approval_levels: [{ level: 1, approverRoleId: 'role-mgr', name: 'Manager' }],
      });
      const instance = createMockWorkflowInstance({
        current_status: WorkflowInstanceStatus.PENDING_APPROVAL,
        current_level: 1,
        workflow_id: workflow.id,
        comments: [],
      });

      workflowInstanceRepository.findOne.mockResolvedValue(instance);
      workflowRepository.findOne.mockResolvedValue(workflow);
      workflowInstanceRepository.save.mockImplementation((data: any) =>
        Promise.resolve({ ...data, current_status: WorkflowInstanceStatus.APPROVED }),
      );

      await service.approveOrReject(mockTenantId, mockUserId, instance.id, {
        action: ApprovalAction.APPROVE,
        comment: 'Looks good!',
      } as any);

      const savedArg = workflowInstanceRepository.save.mock.calls[0][0];
      expect(savedArg.comments).toHaveLength(1);
      expect(savedArg.comments[0].action).toBe('APPROVE');
      expect(savedArg.comments[0].comment).toBe('Looks good!');
      expect(savedArg.comments[0].userId).toBe(mockUserId);
    });
  });

  // =========================================================================
  // cancelWorkflow
  // =========================================================================

  describe('cancelWorkflow', () => {
    it('should cancel the workflow instance when requested by the initiator', async () => {
      const instance = createMockWorkflowInstance({
        initiated_by: mockUserId,
        current_status: WorkflowInstanceStatus.PENDING_APPROVAL,
      });

      workflowInstanceRepository.findOne.mockResolvedValue(instance);

      const cancelled = {
        ...instance,
        current_status: WorkflowInstanceStatus.CANCELLED,
        completed_at: new Date(),
      };
      workflowInstanceRepository.save.mockResolvedValue(cancelled);

      const result = await service.cancelWorkflow(mockTenantId, mockUserId, instance.id);

      expect(result.current_status).toBe(WorkflowInstanceStatus.CANCELLED);
      expect(result.completed_at).toBeDefined();
    });

    it('should throw ForbiddenException when a non-initiator tries to cancel', async () => {
      const instance = createMockWorkflowInstance({
        initiated_by: 'some-other-user-id',
        current_status: WorkflowInstanceStatus.PENDING_APPROVAL,
      });

      workflowInstanceRepository.findOne.mockResolvedValue(instance);

      await expect(
        service.cancelWorkflow(mockTenantId, mockUserId, instance.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when workflow instance does not exist', async () => {
      workflowInstanceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelWorkflow(mockTenantId, mockUserId, 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // Workflow CRUD
  // =========================================================================

  describe('createWorkflow', () => {
    it('should create and return a new workflow definition', async () => {
      const workflow = createMockWorkflow();
      workflowRepository.create.mockReturnValue(workflow);
      workflowRepository.save.mockResolvedValue(workflow);

      const result = await service.createWorkflow(mockTenantId, {
        name: 'Invoice Approval',
        triggerDocType: 'INVOICE',
        approvalLevels: [{ level: 1, approverRoleId: 'role-mgr', name: 'Manager' }],
      } as any);

      expect(result.name).toBe('Invoice Approval');
    });
  });

  describe('deleteWorkflow', () => {
    it('should soft-delete the workflow by setting is_active to false', async () => {
      const workflow = createMockWorkflow({ is_active: true });
      workflowRepository.findOne.mockResolvedValue(workflow);
      workflowRepository.save.mockResolvedValue({ ...workflow, is_active: false });

      await service.deleteWorkflow(mockTenantId, workflow.id);

      expect(workflowRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });

    it('should throw NotFoundException when workflow to delete does not exist', async () => {
      workflowRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteWorkflow(mockTenantId, 'bad-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInstanceHistory', () => {
    it('should return instance with its comments', async () => {
      const instance = createMockWorkflowInstance({
        workflow_id: null,
        comments: [
          { userId: mockUserId, level: 1, action: 'APPROVE', comment: 'OK', timestamp: new Date() },
        ],
      });

      workflowInstanceRepository.findOne.mockResolvedValue(instance);

      const result = await service.getInstanceHistory(mockTenantId, instance.id);

      expect(result.instance).toEqual(instance);
      expect(result.comments).toHaveLength(1);
      expect(result.workflow).toBeNull();
    });
  });
});
