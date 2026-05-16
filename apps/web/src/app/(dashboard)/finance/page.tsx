'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  LockClosedIcon,
  LockOpenIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import {
  useAccountTree,
  useAccounts,
  useCreateAccount,
  useJournalEntries,
  usePeriods,
  useClosePeriod,
  type Account,
  type JournalEntry,
  type JournalEntryFilters,
  type CreateAccountInput,
} from '@/hooks/useFinance';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { notify } from '@/components/ui/Toast';

type Tab = 'coa' | 'journal' | 'periods';

// ─── Add Account Modal ─────────────────���──────────────────────────────────────
function AddAccountModal({
  open,
  onClose,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  accounts?: Account[];
}) {
  const createAccount = useCreateAccount();
  const [form, setForm] = useState<CreateAccountInput>({
    code: '',
    name: '',
    type: 'ASSET',
    description: '',
    parentId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) {
      notify.error('Code and Name are required.');
      return;
    }
    try {
      await createAccount.mutateAsync({
        ...form,
        parentId: form.parentId || undefined,
      });
      notify.success(`Account "${form.code} - ${form.name}" created successfully.`);
      setForm({ code: '', name: '', type: 'ASSET', description: '', parentId: '' });
      onClose();
    } catch (err: any) {
      notify.error(err?.message || 'Failed to create account.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-semibold text-surface-900">Add Account</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Account Code *</label>
              <input
                type="text"
                placeholder="e.g. 1100"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Account Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CreateAccountInput['type'] }))}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="ASSET">Asset</option>
                <option value="LIABILITY">Liability</option>
                <option value="EQUITY">Equity</option>
                <option value="REVENUE">Revenue</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Account Name *</label>
            <input
              type="text"
              placeholder="e.g. Cash in Bank"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Parent Account (optional)</label>
            <select
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">— None (Top-level) —</option>
              {accounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Optional description..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createAccount.isPending}>
              Create Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Account Tree Node ────────────���───────────────────────────���───────────────
function AccountNode({ account, depth = 0 }: { account: Account; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = (account.children?.length ?? 0) > 0;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 hover:bg-surface-50 transition-colors cursor-pointer',
          depth > 0 && 'border-l border-surface-100 ml-4',
        )}
        style={{ paddingLeft: `${16 + depth * 20}px` }}
        onClick={() => hasChildren && setOpen((v) => !v)}
      >
        {hasChildren ? (
          open ? (
            <ChevronDownIcon className="h-3.5 w-3.5 text-surface-400 shrink-0" />
          ) : (
            <ChevronRightIcon className="h-3.5 w-3.5 text-surface-400 shrink-0" />
          )
        ) : (
          <span className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="font-mono text-xs text-surface-500 w-20 shrink-0">{account.code}</span>
        <span className={cn('flex-1 text-sm', depth === 0 ? 'font-semibold text-surface-900' : 'text-surface-700')}>
          {account.name}
        </span>
        <span className="text-xs text-surface-500 capitalize">{account.type.toLowerCase()}</span>
        <span className="text-sm font-semibold text-surface-900 tabular w-32 text-right">
          {formatCurrency(account.balance)}
        </span>
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full ml-2 shrink-0',
            account.isActive ? 'bg-success-400' : 'bg-surface-300',
          )}
        />
      </div>
      {hasChildren && open && (
        <div>
          {account.children!.map((child) => (
            <AccountNode key={child.id} account={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Journal Columns ───────────────────���─────────────────────────��────────────
const journalColumns: ColumnDef<JournalEntry, unknown>[] = [
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-primary-600 font-medium">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ getValue }) => <span className="text-xs">{formatDate(String(getValue()))}</span>,
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ getValue }) => (
      <span className="text-xs text-surface-700 max-w-xs truncate block">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'totalDebit',
    header: 'Amount',
    cell: ({ getValue }) => (
      <span className="text-xs font-semibold tabular">{formatCurrency(Number(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={String(getValue())} dot />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ getValue }) => <span className="text-xs text-surface-400">{formatDate(String(getValue()))}</span>,
  },
];

// ─── Main Page ──────────────────���─────────────────────────────────────────────
export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('journal');
  const [entryFilters, setEntryFilters] = useState<JournalEntryFilters>({ page: 1, limit: 20 });
  const [showAddAccount, setShowAddAccount] = useState(false);

  const { data: coaTree, isLoading: coaLoading } = useAccountTree();
  const { data: flatAccounts } = useAccounts();
  const { data: entriesData, isLoading: entriesLoading } = useJournalEntries(entryFilters);
  const { data: periods, isLoading: periodsLoading } = usePeriods();
  const closePeriod = useClosePeriod();

  const handleClosePeriod = async (id: string, name: string) => {
    if (!confirm(`Close period "${name}"? This cannot be undone.`)) return;
    try {
      await closePeriod.mutateAsync(id);
      notify.success(`Period "${name}" closed successfully.`);
    } catch {
      notify.error('Failed to close period.');
    }
  };

  const tabs = [
    { id: 'coa' as Tab, label: 'Chart of Accounts' },
    { id: 'journal' as Tab, label: 'Journal Entries' },
    { id: 'periods' as Tab, label: 'Accounting Periods' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900">Finance</h1>
          <p className="text-sm text-surface-500 mt-0.5">General ledger, chart of accounts, and periods</p>
        </div>
        <Link href="/finance/journal/new">
          <Button leftIcon={<PlusIcon className="h-4 w-4" />}>New Journal Entry</Button>
        </Link>
      </div>

      <div className="flex gap-0 border-b border-surface-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'coa' && (
        <Card padding="none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <div>
              <h2 className="text-sm font-semibold text-surface-900">Chart of Accounts</h2>
              <p className="text-xs text-surface-500 mt-0.5">Hierarchical account structure</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<PlusIcon className="h-4 w-4" />}
              onClick={() => setShowAddAccount(true)}
            >
              Add Account
            </Button>
          </div>
          <div className="flex items-center px-4 py-2 bg-surface-50 border-b border-surface-100 text-xs font-semibold text-surface-500 uppercase tracking-wide">
            <span className="w-4 mr-2" />
            <span className="w-20 mr-2">Code</span>
            <span className="flex-1">Name</span>
            <span className="mr-8">Type</span>
            <span className="w-32 text-right">Balance</span>
            <span className="w-4 ml-2" />
          </div>
          {coaLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-surface-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {coaTree?.map((account) => (
                <AccountNode key={account.id} account={account} />
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'journal' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(['ALL', 'DRAFT', 'PENDING', 'POSTED', 'CANCELLED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setEntryFilters((f) => ({ ...f, status: s === 'ALL' ? undefined : s }))}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  (s === 'ALL' && !entryFilters.status) || entryFilters.status === s
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200',
                )}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <DataTable
            data={entriesData?.data ?? []}
            columns={journalColumns}
            loading={entriesLoading}
            emptyMessage="No journal entries found"
            emptyDescription="Create your first journal entry to get started."
            toolbar={
              <Link href="/finance/journal/new">
                <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}>New Entry</Button>
              </Link>
            }
          />
        </div>
      )}

      {activeTab === 'periods' && (
        <div>
          {periodsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 bg-surface-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {periods?.map((period) => (
                <Card key={period.id} padding="md" className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-surface-900">{period.name}</p>
                      <p className="text-xs text-surface-400 mt-0.5">
                        {formatDate(period.startDate)} - {formatDate(period.endDate)}
                      </p>
                    </div>
                    <StatusBadge status={period.status} dot />
                  </div>
                  {period.status === 'OPEN' && (
                    <Button
                      variant="secondary"
                      size="xs"
                      leftIcon={<LockClosedIcon className="h-3.5 w-3.5" />}
                      onClick={() => handleClosePeriod(period.id, period.name)}
                      loading={closePeriod.isPending}
                    >
                      Close Period
                    </Button>
                  )}
                  {period.status === 'CLOSED' && (
                    <div className="flex items-center gap-1.5 text-xs text-surface-400">
                      <LockOpenIcon className="h-3.5 w-3.5" />
                      <span>Closed - read only</span>
                    </div>
                  )}
                  {period.status === 'LOCKED' && (
                    <div className="flex items-center gap-1.5 text-xs text-surface-400">
                      <LockClosedIcon className="h-3.5 w-3.5" />
                      <span>Locked - archived</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Account Modal */}
      <AddAccountModal
        open={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        accounts={flatAccounts}
      />
    </div>
  );
}
