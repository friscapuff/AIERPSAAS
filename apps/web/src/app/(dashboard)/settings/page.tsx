'use client';

import React, { useState, useEffect } from 'react';
import {
  BuildingOffice2Icon,
  UsersIcon,
  ShieldCheckIcon,
  LinkIcon,
  PlusIcon,
  PencilSquareIcon,
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/FormField';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/auth';
import { formatDate, cn } from '@/lib/utils';
import { notify } from '@/components/ui/Toast';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'company' | 'users' | 'roles' | 'webhooks' | 'audit';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'company',  label: 'Company',     icon: BuildingOffice2Icon },
  { id: 'users',    label: 'Users',        icon: UsersIcon },
  { id: 'roles',    label: 'Roles',        icon: ShieldCheckIcon },
  { id: 'webhooks', label: 'Webhooks',     icon: LinkIcon },
  { id: 'audit',    label: 'Audit Log',    icon: ClipboardDocumentListIcon },
];

// ─── Mock types (will come from API hooks in real integration) ───────────────
interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  lastDelivery?: string;
}

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string;
  old_values: string | null;
  new_values: string | null;
  timestamp: string;
  ip_address: string;
  status: string;
}

const MOCK_USERS: UserRecord[] = [
  { id: '1', name: 'Abe Al Masri', email: 'Abdalla.ALMasri@bstc.com.jo', role: 'SUPER_ADMIN', status: 'active', lastLogin: new Date().toISOString() },
  { id: '2', name: 'Sara Finance', email: 'sara.finance@bstc.com.jo', role: 'FINANCE_MANAGER', status: 'active', lastLogin: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', name: 'Omar Inventory', email: 'omar.inventory@bstc.com.jo', role: 'INVENTORY_MANAGER', status: 'active', lastLogin: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: '4', name: 'Lina Viewer', email: 'lina.viewer@bstc.com.jo', role: 'VIEWER', status: 'inactive' },
];

const MOCK_WEBHOOKS: WebhookConfig[] = [
  {
    id: '1',
    name: 'ERP Sync',
    url: 'https://erp.example.com/webhook',
    events: ['journal.posted', 'inventory.movement'],
    status: 'active',
    lastDelivery: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Slack Notifications',
    url: 'https://hooks.slack.com/services/xxx',
    events: ['approval.required', 'approval.completed'],
    status: 'active',
    lastDelivery: new Date(Date.now() - 3600000).toISOString(),
  },
];

// ─── PERMISSION MATRIX (Role × Permission) ────────────────────────────────────
const ROLES = ['SUPER_ADMIN', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'APPROVER', 'VIEWER'];
const PERMISSION_GROUPS = [
  {
    label: 'Finance',
    permissions: ['finance.read', 'finance.write', 'finance.post', 'finance.void'],
  },
  {
    label: 'Inventory',
    permissions: ['inventory.read', 'inventory.write', 'inventory.adjust'],
  },
  {
    label: 'Workflow',
    permissions: ['workflow.approve', 'workflow.manage'],
  },
  {
    label: 'Reports',
    permissions: ['reports.read', 'reports.export'],
  },
  {
    label: 'Admin',
    permissions: ['admin.users', 'admin.settings', 'admin.webhooks'],
  },
];

// Fake default permissions
const DEFAULT_GRANTS: Record<string, Record<string, boolean>> = {
  SUPER_ADMIN:       Object.fromEntries(PERMISSION_GROUPS.flatMap((g) => g.permissions).map((p) => [p, true])),
  FINANCE_MANAGER:   { 'finance.read': true, 'finance.write': true, 'finance.post': true, 'finance.void': false, 'inventory.read': true, 'inventory.write': false, 'inventory.adjust': false, 'workflow.approve': true, 'workflow.manage': false, 'reports.read': true, 'reports.export': true, 'admin.users': false, 'admin.settings': false, 'admin.webhooks': false },
  INVENTORY_MANAGER: { 'finance.read': true, 'finance.write': false, 'finance.post': false, 'finance.void': false, 'inventory.read': true, 'inventory.write': true, 'inventory.adjust': true, 'workflow.approve': true, 'workflow.manage': false, 'reports.read': true, 'reports.export': false, 'admin.users': false, 'admin.settings': false, 'admin.webhooks': false },
  APPROVER:          { 'finance.read': true, 'finance.write': false, 'finance.post': false, 'finance.void': false, 'inventory.read': true, 'inventory.write': false, 'inventory.adjust': false, 'workflow.approve': true, 'workflow.manage': false, 'reports.read': true, 'reports.export': false, 'admin.users': false, 'admin.settings': false, 'admin.webhooks': false },
  VIEWER:            Object.fromEntries(PERMISSION_GROUPS.flatMap((g) => g.permissions).map((p) => [p, p.endsWith('.read')])),
};

// ─── User columns ─────────────────────────────────────────────────────────────
const userColumns: ColumnDef<UserRecord, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row, getValue }) => (
      <div>
        <p className="text-sm font-medium text-surface-900">{String(getValue())}</p>
        <p className="text-xs text-surface-400">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ getValue }) => (
      <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded font-medium">
        {String(getValue()).replace(/_/g, ' ')}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={String(getValue())} dot />,
  },
  {
    accessorKey: 'lastLogin',
    header: 'Last Login',
    cell: ({ getValue }) => {
      const v = getValue();
      return <span className="text-xs text-surface-400">{v ? formatDate(String(v)) : 'Never'}</span>;
    },
  },
  {
    id: 'actions',
    header: '',
    cell: () => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="xs" leftIcon={<PencilSquareIcon className="h-3.5 w-3.5" />}>
          Edit
        </Button>
      </div>
    ),
  },
];

// ─── Webhook columns ──────────────────────────────────────────────────────────
const webhookColumns: ColumnDef<WebhookConfig, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ getValue }) => <span className="text-sm font-medium text-surface-900">{String(getValue())}</span>,
  },
  {
    accessorKey: 'url',
    header: 'Endpoint URL',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-surface-500 truncate max-w-xs block">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'events',
    header: 'Events',
    cell: ({ getValue }) => {
      const events = getValue() as string[];
      return (
        <div className="flex flex-wrap gap-1">
          {events.map((e) => (
            <span key={e} className="text-2xs bg-surface-100 text-surface-600 px-1.5 py-0.5 rounded">{e}</span>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={String(getValue())} dot />,
  },
  {
    accessorKey: 'lastDelivery',
    header: 'Last Delivery',
    cell: ({ getValue }) => {
      const v = getValue();
      return <span className="text-xs text-surface-400">{v ? formatDate(String(v)) : 'Never'}</span>;
    },
  },
];

// ─── Audit Log columns ────────────────────────────────────────────────────────
const auditColumns: ColumnDef<AuditEntry, unknown>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Time',
    cell: ({ getValue }) => (
      <span className="text-xs text-surface-500 whitespace-nowrap">{formatDate(String(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'action',
    header: 'Action',
    cell: ({ getValue }) => {
      const action = String(getValue());
      const color = action === 'CREATE' ? 'text-success-600' : action === 'DELETE' ? 'text-danger-600' : 'text-warning-600';
      return <span className={`text-xs font-semibold ${color}`}>{action}</span>;
    },
  },
  {
    accessorKey: 'module',
    header: 'Module',
    cell: ({ getValue }) => (
      <span className="text-xs bg-surface-100 text-surface-700 px-2 py-0.5 rounded">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'entity_type',
    header: 'Entity',
    cell: ({ row, getValue }) => (
      <div>
        <p className="text-xs font-medium text-surface-800">{String(getValue())}</p>
        <p className="text-2xs text-surface-400 font-mono">{row.original.entity_id?.slice(0, 8)}…</p>
      </div>
    ),
  },
  {
    accessorKey: 'user_id',
    header: 'User',
    cell: ({ getValue }) => (
      <span className="text-xs text-surface-500 font-mono">{String(getValue()).slice(0, 8)}…</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={String(getValue()) === 'success' ? 'active' : 'inactive'} dot />,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('company');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('VIEWER');
  const [grants, setGrants] = useState(DEFAULT_GRANTS);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // ─── Read URL hash on mount and on hash change ────────────────────────────
  useEffect(() => {
    const readHash = () => {
      const hash = window.location.hash.replace('#', '') as Tab;
      const validTabs: Tab[] = ['company', 'users', 'roles', 'webhooks', 'audit'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, []);

  // ─── Update URL hash when tab changes ─────────────────────────────────────
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/settings#${tab}`);
  };

  // ─── Fetch audit logs when audit tab is active ────────────────────────────
  useEffect(() => {
    if (activeTab !== 'audit') return;

    const fetchAuditLogs = async () => {
      setAuditLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const res = await fetch('/api/v1/audit-log', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const json = await res.json();
          // Handle wrapped response { data, meta } from TransformInterceptor
          const entries = json.data ?? json;
          setAuditLogs(Array.isArray(entries) ? entries : []);
        } else {
          // If the endpoint doesn't exist yet, show empty state
          setAuditLogs([]);
        }
      } catch {
        setAuditLogs([]);
      } finally {
        setAuditLoading(false);
      }
    };

    fetchAuditLogs();
  }, [activeTab]);

  const toggleGrant = (role: string, permission: string) => {
    setGrants((g) => ({
      ...g,
      [role]: { ...g[role], [permission]: !g[role][permission] },
    }));
  };

  const handleSaveCompany = () => {
    notify.success('Company settings saved.', 'Saved');
  };

  const handleInvite = () => {
    if (!inviteEmail) { notify.error('Email is required.'); return; }
    notify.success(`Invitation sent to ${inviteEmail}.`);
    setShowInviteModal(false);
    setInviteEmail('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-surface-900">Settings</h1>
        <p className="text-sm text-surface-500 mt-0.5">Manage your workspace, users, and integrations</p>
      </div>

      <div className="flex gap-5">
        {/* Tab sidebar */}
        <div className="w-44 shrink-0">
          <nav className="space-y-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-surface-600 hover:bg-surface-100 hover:text-surface-800',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* Company settings */}
          {activeTab === 'company' && (
            <Card padding="md">
              <Card.Header title="Company Information" subtitle="Your organisation's workspace settings" border />
              <div className="space-y-4 max-w-lg">
                <Input label="Company Name" defaultValue={tenant?.name ?? ''} />
                <Input label="Subdomain" defaultValue={tenant?.subdomain ?? ''} hint="This cannot be changed after account creation" disabled />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Default Currency"
                    defaultValue={tenant?.currency ?? 'USD'}
                    options={[
                      { label: 'USD — US Dollar', value: 'USD' },
                      { label: 'EUR — Euro', value: 'EUR' },
                      { label: 'GBP — British Pound', value: 'GBP' },
                      { label: 'JOD — Jordanian Dinar', value: 'JOD' },
                      { label: 'AED — UAE Dirham', value: 'AED' },
                    ]}
                  />
                  <Select
                    label="Timezone"
                    defaultValue={tenant?.timezone ?? 'UTC'}
                    options={[
                      { label: 'UTC', value: 'UTC' },
                      { label: 'Asia/Amman (Jordan)', value: 'Asia/Amman' },
                      { label: 'America/New_York', value: 'America/New_York' },
                      { label: 'Europe/London', value: 'Europe/London' },
                      { label: 'Asia/Dubai', value: 'Asia/Dubai' },
                    ]}
                  />
                </div>
                <Select
                  label="Fiscal Year Start"
                  defaultValue="01"
                  options={[
                    { label: 'January', value: '01' },
                    { label: 'April', value: '04' },
                    { label: 'July', value: '07' },
                    { label: 'October', value: '10' },
                  ]}
                />
                <Textarea
                  label="Company Address"
                  placeholder="Registered company address…"
                  rows={2}
                />
                <div className="flex justify-end pt-2">
                  <Button leftIcon={<CheckIcon className="h-4 w-4" />} onClick={handleSaveCompany}>
                    Save Settings
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <DataTable
                data={MOCK_USERS}
                columns={userColumns}
                searchPlaceholder="Search users…"
                toolbar={
                  <Button
                    size="sm"
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                    onClick={() => setShowInviteModal(true)}
                  >
                    Invite User
                  </Button>
                }
                emptyMessage="No users found"
              />
            </div>
          )}

          {/* Roles (permission matrix) */}
          {activeTab === 'roles' && (
            <Card padding="none">
              <div className="px-5 py-4 border-b border-surface-100">
                <h2 className="text-sm font-semibold text-surface-900">Permission Matrix</h2>
                <p className="text-xs text-surface-500 mt-0.5">Manage what each role can do across the platform</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-surface-100 bg-surface-50">
                      <th className="px-5 py-3 text-left font-semibold text-surface-500 uppercase tracking-wide w-44">
                        Permission
                      </th>
                      {ROLES.map((role) => (
                        <th key={role} className="px-3 py-3 text-center font-semibold text-surface-500 uppercase tracking-wide whitespace-nowrap">
                          {role.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {PERMISSION_GROUPS.map((group) => (
                      <React.Fragment key={group.label}>
                        <tr className="bg-surface-50">
                          <td colSpan={ROLES.length + 1} className="px-5 py-2 text-xs font-bold text-surface-700 uppercase tracking-widest">
                            {group.label}
                          </td>
                        </tr>
                        {group.permissions.map((perm) => (
                          <tr key={perm} className="hover:bg-surface-50 transition-colors">
                            <td className="px-5 py-2.5 text-surface-600 font-mono">{perm}</td>
                            {ROLES.map((role) => (
                              <td key={role} className="px-3 py-2.5 text-center">
                                <button
                                  onClick={() => role !== 'SUPER_ADMIN' && toggleGrant(role, perm)}
                                  disabled={role === 'SUPER_ADMIN'}
                                  className={cn(
                                    'h-5 w-5 rounded transition-colors mx-auto flex items-center justify-center',
                                    grants[role]?.[perm]
                                      ? 'bg-success-500 text-white'
                                      : 'bg-surface-200 text-surface-400',
                                    role !== 'SUPER_ADMIN' && 'hover:opacity-80 cursor-pointer',
                                  )}
                                  title={`${role}: ${perm}`}
                                >
                                  {grants[role]?.[perm] && <CheckIcon className="h-3 w-3" />}
                                </button>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-surface-100 flex justify-end">
                <Button size="sm" onClick={() => notify.success('Permission matrix saved.')}>
                  Save Permissions
                </Button>
              </div>
            </Card>
          )}

          {/* Webhooks */}
          {activeTab === 'webhooks' && (
            <div className="space-y-4">
              <DataTable
                data={MOCK_WEBHOOKS}
                columns={webhookColumns}
                searchPlaceholder="Search webhooks…"
                toolbar={
                  <Button
                    size="sm"
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                    onClick={() => setShowWebhookModal(true)}
                  >
                    Add Webhook
                  </Button>
                }
                emptyMessage="No webhooks configured"
                emptyDescription="Add a webhook to receive real-time event notifications."
              />
            </div>
          )}

          {/* Audit Log */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {auditLoading ? (
                <Card padding="md">
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full" />
                    <span className="ml-3 text-sm text-surface-500">Loading audit logs…</span>
                  </div>
                </Card>
              ) : auditLogs.length > 0 ? (
                <DataTable
                  data={auditLogs}
                  columns={auditColumns}
                  searchPlaceholder="Search audit logs…"
                  emptyMessage="No audit entries found"
                />
              ) : (
                <Card padding="md">
                  <div className="text-center py-12">
                    <ClipboardDocumentListIcon className="h-12 w-12 text-surface-300 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-surface-700">No Audit Entries Yet</h3>
                    <p className="text-xs text-surface-500 mt-1 max-w-sm mx-auto">
                      Audit logs will appear here as actions are performed across the platform.
                      Every create, update, and delete operation is automatically tracked.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite user modal */}
      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite User"
        description="Send an invitation email to a new team member"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button onClick={handleInvite}>Send Invitation</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            required
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={ROLES.filter((r) => r !== 'SUPER_ADMIN').map((r) => ({
              label: r.replace(/_/g, ' '),
              value: r,
            }))}
          />
        </div>
      </Modal>

      {/* Add webhook modal */}
      <Modal
        open={showWebhookModal}
        onClose={() => setShowWebhookModal(false)}
        title="Add Webhook"
        description="Configure a new endpoint to receive event notifications"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowWebhookModal(false)}>Cancel</Button>
            <Button onClick={() => { notify.success('Webhook added.'); setShowWebhookModal(false); }}>
              Add Webhook
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Name" placeholder="My Webhook" required />
          <Input label="Endpoint URL" type="url" placeholder="https://your-server.com/webhook" required />
          <div className="space-y-1">
            <label className="block text-xs font-medium text-surface-700">Events to Subscribe</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                'journal.posted', 'journal.voided',
                'approval.required', 'approval.completed',
                'inventory.movement', 'inventory.low_stock',
                'user.invited', 'period.closed',
              ].map((evt) => (
                <label key={evt} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded border-surface-300 text-primary-600" />
                  <span className="text-xs text-surface-600 font-mono">{evt}</span>
                </label>
              ))}
            </div>
          </div>
          <Input label="Secret (for HMAC verification)" type="password" placeholder="Optional signing secret" />
        </div>
      </Modal>
    </div>
  );
}
