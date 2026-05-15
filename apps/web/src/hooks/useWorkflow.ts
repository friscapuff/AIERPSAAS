import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  steps: WorkflowStep[];
  isActive: boolean;
  createdAt: string;
}

export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  approverRole?: string;
  approverUserId?: string;
  requiredApprovals: number;
  timeoutHours?: number;
  autoApprove: boolean;
}

export interface ApprovalTask {
  id: string;
  instanceId: string;
  stepId: string;
  stepName: string;
  workflowName: string;
  entityType: string;
  entityId: string;
  entityReference: string;
  entityDescription?: string;
  assignedUserId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED' | 'EXPIRED';
  comment?: string;
  dueAt?: string;
  createdAt: string;
  completedAt?: string;
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  templateName: string;
  entityType: string;
  entityId: string;
  entityReference: string;
  currentStep: number;
  status: 'ACTIVE' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  tasks: ApprovalTask[];
  startedAt: string;
  completedAt?: string;
  initiatedBy: string;
}

export interface ApprovalHistory {
  id: string;
  taskId: string;
  action: 'APPROVED' | 'REJECTED' | 'DELEGATED';
  comment?: string;
  performedBy: string;
  performedByName: string;
  performedAt: string;
}

// ─── Query keys ───────────────────────────────────────────────────────────────
export const workflowKeys = {
  all:            ['workflow'] as const,
  templates:      () => ['workflow', 'templates'] as const,
  myTasks:        () => ['workflow', 'my-tasks'] as const,
  instances:      (params?: object) => ['workflow', 'instances', params] as const,
  instance:       (id: string) => ['workflow', 'instances', id] as const,
  history:        (params?: object) => ['workflow', 'history', params] as const,
  pendingCount:   () => ['workflow', 'pending-count'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useWorkflowTemplates() {
  return useQuery({
    queryKey: workflowKeys.templates(),
    queryFn: () => get<WorkflowTemplate[]>('/workflow/templates'),
  });
}

export function useMyPendingTasks() {
  return useQuery({
    queryKey: workflowKeys.myTasks(),
    queryFn: () => get<ApprovalTask[]>('/workflow/my-tasks'),
    refetchInterval: 30_000, // poll every 30 sec for new tasks
  });
}

export function usePendingTaskCount() {
  return useQuery({
    queryKey: workflowKeys.pendingCount(),
    queryFn: () => get<{ count: number }>('/workflow/my-tasks/count'),
    refetchInterval: 30_000,
  });
}

export interface InstanceFilters {
  page?: number;
  limit?: number;
  status?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

export function useWorkflowInstances(filters: InstanceFilters = {}) {
  return useQuery({
    queryKey: workflowKeys.instances(filters),
    queryFn: () =>
      get<{ data: WorkflowInstance[]; meta: object }>('/workflow/instances', filters as Record<string, unknown>),
  });
}

export function useWorkflowInstance(id: string) {
  return useQuery({
    queryKey: workflowKeys.instance(id),
    queryFn: () => get<WorkflowInstance>(`/workflow/instances/${id}`),
    enabled: !!id,
  });
}

export function useApprovalHistory(filters: { instanceId?: string; entityId?: string } = {}) {
  return useQuery({
    queryKey: workflowKeys.history(filters),
    queryFn: () => get<ApprovalHistory[]>('/workflow/history', filters as Record<string, unknown>),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
interface ApproveTaskInput {
  taskId: string;
  comment?: string;
}

export function useApproveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, comment }: ApproveTaskInput) =>
      patch<ApprovalTask>(`/workflow/tasks/${taskId}/approve`, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.myTasks() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.pendingCount() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.instances() });
    },
  });
}

interface RejectTaskInput {
  taskId: string;
  comment: string; // required for rejection
}

export function useRejectTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, comment }: RejectTaskInput) =>
      patch<ApprovalTask>(`/workflow/tasks/${taskId}/reject`, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.myTasks() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.pendingCount() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.instances() });
    },
  });
}

interface StartWorkflowInput {
  templateId: string;
  entityType: string;
  entityId: string;
  entityReference: string;
}

export function useStartWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StartWorkflowInput) =>
      post<WorkflowInstance>('/workflow/instances', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.instances() });
    },
  });
}
