import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';

// ─── Screen Builder ─────────────────────────────────────────────────────────
export interface ScreenDefinition {
  id: string;
  tenantId: string;
  tableName: string;
  screenName: string;
  displayName: string;
  description?: string;
  screenType: 'FORM' | 'LIST' | 'FORM_LIST';
  layout: any;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  icon?: string;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
}

const SCREEN_KEYS = {
  all: ['screens'] as const,
  list: (tableName?: string) => [...SCREEN_KEYS.all, 'list', tableName] as const,
  detail: (id: string) => [...SCREEN_KEYS.all, 'detail', id] as const,
};

export function useScreens(tableName?: string) {
  const params = tableName ? `?tableName=${tableName}` : '';
  return useQuery<ScreenDefinition[]>({
    queryKey: SCREEN_KEYS.list(tableName),
    queryFn: () => get<ScreenDefinition[]>(`/dynamic-builder/screens${params}`),
  });
}

export function useScreen(id: string | null) {
  return useQuery<ScreenDefinition>({
    queryKey: SCREEN_KEYS.detail(id!),
    queryFn: () => get<ScreenDefinition>(`/dynamic-builder/screens/${id}`),
    enabled: !!id,
  });
}

export function useCreateScreen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => post('/dynamic-builder/screens', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCREEN_KEYS.all }),
  });
}

export function useUpdateScreen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: any) => put(`/dynamic-builder/screens/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCREEN_KEYS.all }),
  });
}

export function usePublishScreen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post(`/dynamic-builder/screens/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCREEN_KEYS.all }),
  });
}

export function useAutoGenerateScreen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tableName: string) => post(`/dynamic-builder/screens/auto-generate/${tableName}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCREEN_KEYS.all }),
  });
}

export function useDeleteScreen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/dynamic-builder/screens/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCREEN_KEYS.all }),
  });
}

// ─── Approval Rules ─────────────────────────────────────────────────────────
export interface ApprovalRuleType {
  id: string;
  tableName: string;
  ruleName: string;
  description?: string;
  triggerStatus: string;
  conditions: any[];
  approvalLevels: any[];
  targetApprovedStatus: string;
  targetRejectedStatus: string;
  isActive: boolean;
  priority: number;
}

const APPROVAL_KEYS = {
  all: ['approval-rules'] as const,
  list: (tableName?: string) => [...APPROVAL_KEYS.all, 'list', tableName] as const,
};

export function useApprovalRules(tableName?: string) {
  const params = tableName ? `?tableName=${tableName}` : '';
  return useQuery<ApprovalRuleType[]>({
    queryKey: APPROVAL_KEYS.list(tableName),
    queryFn: () => get<ApprovalRuleType[]>(`/dynamic-builder/approval-rules${params}`),
  });
}

export function useCreateApprovalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => post('/dynamic-builder/approval-rules', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPROVAL_KEYS.all }),
  });
}

export function useUpdateApprovalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: any) => put(`/dynamic-builder/approval-rules/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPROVAL_KEYS.all }),
  });
}

export function useDeleteApprovalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/dynamic-builder/approval-rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPROVAL_KEYS.all }),
  });
}

// ─── Validation Rules ───────────────────────────────────────────────────────
export interface ValidationRuleType {
  id: string;
  tableName: string;
  ruleName: string;
  description?: string;
  ruleType: 'FIELD' | 'CROSS_FIELD' | 'EXPRESSION' | 'UNIQUE_COMBO';
  config: any;
  appliesOn: 'CREATE' | 'UPDATE' | 'BOTH';
  isActive: boolean;
  priority: number;
}

const VALIDATION_KEYS = {
  all: ['validation-rules'] as const,
  list: (tableName?: string) => [...VALIDATION_KEYS.all, 'list', tableName] as const,
};

export function useValidationRules(tableName?: string) {
  const params = tableName ? `?tableName=${tableName}` : '';
  return useQuery<ValidationRuleType[]>({
    queryKey: VALIDATION_KEYS.list(tableName),
    queryFn: () => get<ValidationRuleType[]>(`/dynamic-builder/validation-rules${params}`),
  });
}

export function useCreateValidationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => post('/dynamic-builder/validation-rules', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VALIDATION_KEYS.all }),
  });
}

export function useUpdateValidationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: any) => put(`/dynamic-builder/validation-rules/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VALIDATION_KEYS.all }),
  });
}

export function useDeleteValidationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/dynamic-builder/validation-rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: VALIDATION_KEYS.all }),
  });
}

// ─── Impact Rules (Multi-Impact Engine) ─────────────────────────────────────
export type ImpactTypeValue =
  | 'GL_POSTING'
  | 'BUDGET_IMPACT'
  | 'COST_UPDATE'
  | 'COMMISSION_CALC'
  | 'INTERCOMPANY'
  | 'INVENTORY_MOVEMENT'
  | 'STOCK_PLANNING'
  | 'CRM_LOG'
  | 'RECORD_CREATE'
  | 'FIELD_UPDATE'
  | 'NOTIFICATION'
  | 'WEBHOOK'
  | 'APPROVAL_TRIGGER'
  | 'ANALYTICS_EVENT';

export type ExecutionMode = 'SEQUENTIAL' | 'PARALLEL' | 'TRANSACTIONAL';

export interface ImpactRuleType {
  id: string;
  tableName: string;
  ruleName: string;
  description?: string;
  triggerStatus: string;
  impactType: ImpactTypeValue;
  config: any;
  isActive: boolean;
  priority: number;
  // Multi-impact group fields
  groupId?: string;
  groupName?: string;
  executionMode?: ExecutionMode;
  conditionExpression?: any;
  rollbackOnFailure?: boolean;
}

export interface ImpactGroup {
  groupId: string;
  groupName: string;
  triggerStatus: string;
  tableName: string;
  executionMode: ExecutionMode;
  rollbackOnFailure: boolean;
  rules: ImpactRuleType[];
}

const IMPACT_KEYS = {
  all: ['impact-rules'] as const,
  list: (tableName?: string) => [...IMPACT_KEYS.all, 'list', tableName] as const,
  grouped: () => [...IMPACT_KEYS.all, 'grouped'] as const,
  types: () => [...IMPACT_KEYS.all, 'types'] as const,
};

export function useImpactRules(tableName?: string) {
  const params = tableName ? `?tableName=${tableName}` : '';
  return useQuery<ImpactRuleType[]>({
    queryKey: IMPACT_KEYS.list(tableName),
    queryFn: () => get<ImpactRuleType[]>(`/dynamic-builder/impact-rules${params}`),
  });
}

export function useImpactRulesGrouped() {
  return useQuery<ImpactGroup[]>({
    queryKey: IMPACT_KEYS.grouped(),
    queryFn: () => get<ImpactGroup[]>('/dynamic-builder/impact-rules/groups'),
  });
}

export function useImpactTypes() {
  return useQuery<any[]>({
    queryKey: IMPACT_KEYS.types(),
    queryFn: () => get<any[]>('/dynamic-builder/impact-rules/types'),
  });
}

export function useCreateImpactRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => post('/dynamic-builder/impact-rules', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: IMPACT_KEYS.all }),
  });
}

export function useCreateImpactRuleBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      tableName: string;
      triggerStatus: string;
      groupName: string;
      executionMode: ExecutionMode;
      rollbackOnFailure: boolean;
      rules: Array<{
        ruleName: string;
        description?: string;
        impactType: ImpactTypeValue;
        config: any;
        priority?: number;
        conditionExpression?: any;
      }>;
    }) => post('/dynamic-builder/impact-rules/batch', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: IMPACT_KEYS.all }),
  });
}

export function useUpdateImpactRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: any) => put(`/dynamic-builder/impact-rules/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: IMPACT_KEYS.all }),
  });
}

export function useDeleteImpactRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/dynamic-builder/impact-rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: IMPACT_KEYS.all }),
  });
}

export function useDeleteImpactRuleGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => del(`/dynamic-builder/impact-rules/group/${groupId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: IMPACT_KEYS.all }),
  });
}
