import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'RELATION'
  | 'LOOKUP'
  | 'FILE'
  | 'EMAIL'
  | 'URL'
  | 'PHONE';

// Backend stores some types differently (e.g. NUMBER→INTEGER, TEXT→STRING)
// This maps backend-stored types back to frontend-friendly types
const BACKEND_TO_FRONTEND_TYPE: Record<string, FieldType> = {
  INTEGER: 'NUMBER',
  STRING: 'TEXT',
  RELATION: 'LOOKUP',
};

// Frontend types that map to different backend types when saving
const FRONTEND_TO_BACKEND_TYPE: Record<string, string> = {
  NUMBER: 'NUMBER',  // Backend will normalize to INTEGER
  LOOKUP: 'LOOKUP',
};

function normalizeTypeForDisplay(backendType: string): FieldType {
  const upper = (backendType || 'TEXT').toUpperCase();
  return (BACKEND_TO_FRONTEND_TYPE[upper] || upper) as FieldType;
}

export interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  indexed: boolean;
  defaultValue?: unknown;
  options?: string[]; // for SELECT/MULTI_SELECT
  relationTableId?: string; // for RELATION/LOOKUP
  lookupTable?: string;
  lookupField?: string;
  order: number;
}

export interface DynamicTable {
  id: string;
  name: string;
  label: string;
  description?: string;
  icon?: string;
  fields: FieldDefinition[];
  recordCount: number;
  isSystem: boolean;
  createdAt: string;
}

export interface DynamicRecord {
  id: string;
  tableId: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─── API → Frontend mappers ──────────────────────────��────────────────────────
// The API returns snake_case entity shape; the frontend uses camelCase.
function mapField(raw: any, index: number): FieldDefinition {
  const rawType = raw.type || raw.data_type || 'TEXT';
  return {
    id: raw.id || raw.name || `field_${index}`,
    name: raw.name,
    label: raw.label || raw.display_name || raw.name,
    type: normalizeTypeForDisplay(rawType),
    required: raw.required ?? raw.is_required ?? false,
    unique: raw.unique ?? raw.is_unique ?? false,
    indexed: raw.indexed ?? false,
    defaultValue: raw.defaultValue ?? raw.default ?? raw.default_value,
    options: raw.options,
    relationTableId: raw.relationTableId ?? raw.lookup_table ?? raw.lookupTable,
    lookupTable: raw.lookup_table ?? raw.lookupTable,
    lookupField: raw.lookup_field ?? raw.lookupField,
    order: raw.order ?? index,
  };
}

function mapTable(raw: any): DynamicTable {
  const fields = Array.isArray(raw.fields)
    ? raw.fields.map((f: any, i: number) => mapField(f, i))
    : [];

  return {
    id: raw.id,
    name: raw.table_name || raw.name,
    label: raw.display_name || raw.label || raw.table_name || raw.name || '',
    description: raw.description,
    icon: raw.icon,
    fields,
    recordCount: raw.recordCount ?? raw.record_count ?? 0,
    isSystem: raw.isSystem ?? raw.is_system ?? false,
    createdAt: raw.createdAt || raw.created_at || '',
  };
}

// ─── Query keys ───────────────────────────────────────────────────────────────
export const dynamicKeys = {
  all:     ['dynamic'] as const,
  tables:  () => ['dynamic', 'tables'] as const,
  table:   (id: string) => ['dynamic', 'tables', id] as const,
  records: (tableId: string, params?: object) => ['dynamic', 'records', tableId, params] as const,
  record:  (tableId: string, recordId: string) => ['dynamic', 'records', tableId, recordId] as const,
};

// ─── Tables ───────────────────────────────────────────────────────────────────
export function useDynamicTables() {
  return useQuery({
    queryKey: dynamicKeys.tables(),
    queryFn: async () => {
      const raw = await get<any[]>('/dynamic-builder/tables');
      return (Array.isArray(raw) ? raw : []).map(mapTable);
    },
  });
}

export function useDynamicTable(id: string) {
  return useQuery({
    queryKey: dynamicKeys.table(id),
    queryFn: async () => {
      const raw = await get<any>(`/dynamic-builder/tables/${id}`);
      return mapTable(raw);
    },
    enabled: !!id,
  });
}

interface CreateTableInput {
  name: string;
  label: string;
  description?: string;
  icon?: string;
  fields: Omit<FieldDefinition, 'id'>[];
}

export function useCreateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTableInput) =>
      post<DynamicTable>('/dynamic-builder/tables', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dynamicKeys.tables() });
    },
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreateTableInput>) =>
      put<DynamicTable>(`/dynamic-builder/tables/${id}`, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: dynamicKeys.all });
      queryClient.invalidateQueries({ queryKey: dynamicKeys.tables() });
      queryClient.invalidateQueries({ queryKey: dynamicKeys.table(vars.id) });
    },
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(`/dynamic-builder/tables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dynamicKeys.all });
      queryClient.invalidateQueries({ queryKey: dynamicKeys.tables() });
    },
  });
}

// ─── Records ─────────────────────────────���───────────────────────────���───────
export interface RecordFilters {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: unknown;
}

export function useDynamicRecords(tableId: string, filters: RecordFilters = {}) {
  return useQuery({
    queryKey: dynamicKeys.records(tableId, filters),
    queryFn: () =>
      get<{ data: DynamicRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
        `/dynamic-builder/tables/${tableId}/records`,
        filters as Record<string, unknown>,
      ),
    enabled: !!tableId,
  });
}

export function useDynamicRecord(tableId: string, recordId: string) {
  return useQuery({
    queryKey: dynamicKeys.record(tableId, recordId),
    queryFn: () => get<DynamicRecord>(`/dynamic-builder/tables/${tableId}/records/${recordId}`),
    enabled: !!(tableId && recordId),
  });
}

export function useCreateRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, data }: { tableId: string; data: Record<string, unknown> }) =>
      post<DynamicRecord>(`/dynamic-builder/tables/${tableId}/records`, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: dynamicKeys.records(vars.tableId) });
      queryClient.invalidateQueries({ queryKey: dynamicKeys.table(vars.tableId) });
    },
  });
}

export function useUpdateRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tableId,
      recordId,
      data,
    }: {
      tableId: string;
      recordId: string;
      data: Record<string, unknown>;
    }) => put<DynamicRecord>(`/dynamic-builder/tables/${tableId}/records/${recordId}`, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: dynamicKeys.records(vars.tableId) });
      queryClient.invalidateQueries({ queryKey: dynamicKeys.record(vars.tableId, vars.recordId) });
    },
  });
}

export function useDeleteRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, recordId }: { tableId: string; recordId: string }) =>
      del<void>(`/dynamic-builder/tables/${tableId}/records/${recordId}`),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: dynamicKeys.records(vars.tableId) });
    },
  });
}
