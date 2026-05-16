import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, patch } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────���──
export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  subtype?: string;
  parentId?: string;
  currency: string;
  balance: number;
  isActive: boolean;
  level: number;
  children?: Account[];
}

export interface JournalLine {
  id?: string;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  description?: string;
  debit: number;
  credit: number;
  reference?: string;
}

export interface JournalEntry {
  id: string;
  reference: string;
  date: string;
  description: string;
  status: 'DRAFT' | 'PENDING' | 'POSTED' | 'CANCELLED';
  currency: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalLine[];
  periodId?: string;
  createdAt: string;
  postedAt?: string;
  postedBy?: string;
}

export interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED' | 'LOCKED';
  year: number;
  month: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ─── Query keys ─────────────────────────��─────────────────────────────────────
export const financeKeys = {
  all:           ['finance'] as const,
  accounts:      () => [...financeKeys.all, 'accounts'] as const,
  accountTree:   () => [...financeKeys.all, 'accounts', 'tree'] as const,
  entries:       (params?: object) => [...financeKeys.all, 'entries', params] as const,
  entry:         (id: string) => [...financeKeys.all, 'entries', id] as const,
  periods:       () => [...financeKeys.all, 'periods'] as const,
  dashboardKpis: () => [...financeKeys.all, 'dashboard', 'kpis'] as const,
  revenueChart:  () => [...financeKeys.all, 'dashboard', 'revenue-chart'] as const,
};

// ─── Accounts ─────────────────────────────────────────────────────��───────────
export function useAccounts() {
  return useQuery({
    queryKey: financeKeys.accounts(),
    queryFn: () => get<Account[]>('/finance/accounts'),
  });
}

export function useAccountTree() {
  return useQuery({
    queryKey: financeKeys.accountTree(),
    queryFn: () => get<Account[]>('/finance/accounts/tree'),
  });
}

export interface CreateAccountInput {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  description?: string;
  parentId?: string;
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAccountInput) =>
      post<Account>('/finance/chart-of-accounts', {
        account_code: data.code,
        account_name: data.name,
        account_type: data.type,
        description: data.description,
        parent_id: data.parentId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: financeKeys.accountTree() });
    },
  });
}

// ─── Journal Entries ──────────────────────────��───────────────────────────────
export interface JournalEntryFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  periodId?: string;
  startDate?: string;
  endDate?: string;
}

export function useJournalEntries(filters: JournalEntryFilters = {}) {
  return useQuery({
    queryKey: financeKeys.entries(filters),
    queryFn: () =>
      get<PaginatedResult<JournalEntry>>('/finance/journal-entries', filters as Record<string, unknown>),
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: financeKeys.entry(id),
    queryFn: () => get<JournalEntry>(`/finance/journal-entries/${id}`),
    enabled: !!id,
  });
}

interface CreateJournalEntryInput {
  date: string;
  description: string;
  currency?: string;
  periodId?: string;
  lines: { accountId: string; debit: number; credit: number; description?: string }[];
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJournalEntryInput) =>
      post<JournalEntry>('/finance/journal-entries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.entries() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboardKpis() });
    },
  });
}

export function usePostJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      patch<JournalEntry>(`/finance/journal-entries/${id}/post`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}

export function useVoidJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      patch<JournalEntry>(`/finance/journal-entries/${id}/void`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}

// ─── Periods ─────────────────────────────────────────────────────────��────────
export function usePeriods() {
  return useQuery({
    queryKey: financeKeys.periods(),
    queryFn: () => get<Period[]>('/finance/periods'),
  });
}

export function useClosePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patch<Period>(`/finance/periods/${id}/close`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.periods() }),
  });
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────
export interface DashboardKpis {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashBalance: number;
  revenueChange: number;
  expensesChange: number;
  netIncomeChange: number;
  cashChange: number;
}

export function useDashboardKpis() {
  return useQuery({
    queryKey: financeKeys.dashboardKpis(),
    queryFn: () => get<DashboardKpis>('/finance/dashboard/kpis'),
  });
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  expenses: number;
}

export function useRevenueChart() {
  return useQuery({
    queryKey: financeKeys.revenueChart(),
    queryFn: () => get<RevenueDataPoint[]>('/finance/dashboard/revenue-chart'),
  });
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export interface ReportParams {
  type: 'TRIAL_BALANCE' | 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'CASH_FLOW' | 'GL_DETAIL';
  startDate: string;
  endDate: string;
  currency?: string;
}

export function useGenerateReport() {
  return useMutation({
    mutationFn: (params: ReportParams) =>
      post<{ data: unknown[] }>('/finance/reports/generate', params),
  });
}
