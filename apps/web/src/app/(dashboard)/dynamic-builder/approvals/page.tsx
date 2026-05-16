'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  XMarkIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { useDynamicTables } from '@/hooks/useDynamic';
import {
  useApprovalRules,
  useCreateApprovalRule,
  useUpdateApprovalRule,
  useDeleteApprovalRule,
  type ApprovalRuleType,
} from '@/hooks/useDynamicPlatform';
import { notify } from '@/components/ui/Toast';

const CONDITION_OPERATORS = [
  { label: 'Equals (=)', value: 'EQ' },
  { label: 'Not Equals (!=)', value: 'NE' },
  { label: 'Greater Than (>)', value: 'GT' },
  { label: 'Less Than (<)', value: 'LT' },
  { label: 'Greater or Equal (>=)', value: 'GTE' },
  { label: 'Less or Equal (<=)', value: 'LTE' },
  { label: 'In List', value: 'IN' },
  { label: 'Not In List', value: 'NOT_IN' },
  { label: 'Is Null', value: 'IS_NULL' },
  { label: 'Is Not Null', value: 'IS_NOT_NULL' },
];

/* ─── FieldSelect: dropdown from selected tables + Add New ─── */
function FieldSelect({ value, onChange, allFields, label }: { value: string; onChange: (v: string) => void; allFields: { value: string; label: string; table: string }[]; label?: string }) {
  const [showNew, setShowNew] = useState(false);
  const [newVal, setNewVal] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => { if (e.target.value === '__ADD_NEW__') setShowNew(true); else onChange(e.target.value); };
  const handleAdd = () => { if (newVal.trim()) { onChange(newVal.trim()); setShowNew(false); setNewVal(''); } };
  if (showNew) return (<div className="space-y-1">{label && <label className="block text-xs font-medium text-surface-700">{label}</label>}<div className="flex gap-1 items-center"><input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="field_name" className="flex-1 rounded-md border border-surface-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAdd()} /><button onClick={handleAdd} className="px-2 py-1.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700">OK</button><button onClick={() => { setShowNew(false); setNewVal(''); }} className="px-2 py-1.5 bg-surface-200 text-surface-600 rounded text-xs hover:bg-surface-300">X</button></div></div>);
  const grouped = allFields.reduce<Record<string, typeof allFields>>((acc, f) => { (acc[f.table] = acc[f.table] || []).push(f); return acc; }, {});
  return (<div className="space-y-1">{label && <label className="block text-xs font-medium text-surface-700">{label}</label>}<select value={value} onChange={handleChange} className="w-full rounded-md border border-surface-300 px-2 py-1.5 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"><option value="">— Select Field —</option>{Object.entries(grouped).map(([t, fields]) => (<optgroup key={t} label={t}>{fields.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</optgroup>))}<option value="__ADD_NEW__">+ Add New Field</option></select></div>);
}

/* ─── MultiTableSelector ─── */
function MultiTableSelector({ selectedTables, onAdd, onRemove, allTables }: { selectedTables: string[]; onAdd: (n: string) => void; onRemove: (n: string) => void; allTables: { name: string; label: string }[] }) {
  const [addValue, setAddValue] = useState('');
  const available = allTables.filter((t) => !selectedTables.includes(t.name));
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-surface-700">Selected Tables *</label>
      <div className="flex flex-wrap gap-2 min-h-[36px] p-2 border border-surface-200 rounded-lg bg-surface-50">
        {selectedTables.length === 0 && <span className="text-xs text-surface-400 italic">No tables selected</span>}
        {selectedTables.map((name) => { const tbl = allTables.find((t) => t.name === name); return (<span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium"><TableCellsIcon className="h-3.5 w-3.5" />{tbl?.label || name}<button onClick={() => onRemove(name)} className="hover:text-danger-600"><XMarkIcon className="h-3.5 w-3.5" /></button></span>); })}
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1"><select value={addValue} onChange={(e) => setAddValue(e.target.value)} className="w-full rounded-md border border-surface-300 px-2 py-1.5 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"><option value="">— Add a Table —</option>{available.map((t) => <option key={t.name} value={t.name}>{t.label}</option>)}</select></div>
        <Button variant="secondary" size="xs" leftIcon={<PlusIcon className="h-3.5 w-3.5" />} onClick={() => { if (addValue) { onAdd(addValue); setAddValue(''); } }} disabled={!addValue}>Add Table</Button>
      </div>
    </div>
  );
}

/* ─── StatusSelect with Add New ─── */
function StatusSelect({ value, onChange, label, placeholder, required, hint }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string; required?: boolean; hint?: string }) {
  const [showNew, setShowNew] = useState(false);
  const [newVal, setNewVal] = useState('');
  const statuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'POSTED', 'CANCELLED', 'ACTIVE', 'INACTIVE'];
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => { if (e.target.value === '__ADD_NEW__') setShowNew(true); else onChange(e.target.value); };
  const handleAdd = () => { if (newVal.trim()) { onChange(newVal.trim().toUpperCase()); setShowNew(false); setNewVal(''); } };
  if (showNew) return (<div className="space-y-1"><label className="block text-xs font-medium text-surface-700">{label}</label><div className="flex gap-1 items-center"><input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder={placeholder} className="flex-1 rounded-md border border-surface-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAdd()} /><button onClick={handleAdd} className="px-2 py-1.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700">OK</button><button onClick={() => { setShowNew(false); setNewVal(''); }} className="px-2 py-1.5 bg-surface-200 text-surface-600 rounded text-xs hover:bg-surface-300">X</button></div>{hint && <p className="text-2xs text-surface-400">{hint}</p>}</div>);
  return (<div className="space-y-1"><label className="block text-xs font-medium text-surface-700">{label} {required && <span className="text-danger-500">*</span>}</label><select value={value} onChange={handleChange} className="w-full rounded-md border border-surface-300 px-2 py-1.5 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"><option value="">— Select Status —</option>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}{value && !statuses.includes(value) && <option value={value}>{value}</option>}<option value="__ADD_NEW__">+ Add New Status</option></select>{hint && <p className="text-2xs text-surface-400">{hint}</p>}</div>);
}

/* ─── RoleSelect with Add New ─── */
function RoleSelect({ value, onChange, label, hint }: { value: string; onChange: (v: string) => void; label: string; hint?: string }) {
  const [showNew, setShowNew] = useState(false);
  const [newVal, setNewVal] = useState('');
  const roles = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'ACCOUNTANT', 'AUDITOR', 'CLERK', 'VIEWER'];
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => { if (e.target.value === '__ADD_NEW__') setShowNew(true); else onChange(e.target.value); };
  const handleAdd = () => { if (newVal.trim()) { onChange(newVal.trim().toUpperCase()); setShowNew(false); setNewVal(''); } };
  if (showNew) return (<div className="space-y-1"><label className="block text-xs font-medium text-surface-700">{label}</label><div className="flex gap-1 items-center"><input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="ROLE_NAME" className="flex-1 rounded-md border border-surface-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAdd()} /><button onClick={handleAdd} className="px-2 py-1.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700">OK</button><button onClick={() => { setShowNew(false); setNewVal(''); }} className="px-2 py-1.5 bg-surface-200 text-surface-600 rounded text-xs hover:bg-surface-300">X</button></div>{hint && <p className="text-2xs text-surface-400">{hint}</p>}</div>);
  return (<div className="space-y-1"><label className="block text-xs font-medium text-surface-700">{label}</label><select value={value} onChange={handleChange} className="w-full rounded-md border border-surface-300 px-2 py-1.5 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"><option value="">— Select Role —</option>{roles.map((r) => <option key={r} value={r}>{r}</option>)}{value && !roles.includes(value) && <option value={value}>{value}</option>}<option value="__ADD_NEW__">+ Add New Role</option></select>{hint && <p className="text-2xs text-surface-400">{hint}</p>}</div>);
}

// ─── Approval Rule Form ──────────────────────────────────────────────────────
function ApprovalRuleFormModal({ rule, open, onClose }: { rule: ApprovalRuleType | null; open: boolean; onClose: () => void }) {
  const { data: tables } = useDynamicTables();
  const createRule = useCreateApprovalRule();
  const updateRule = useUpdateApprovalRule();

  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [formData, setFormData] = useState({ ruleName: '', description: '', triggerStatus: '', targetApprovedStatus: '', targetRejectedStatus: '', isActive: true, priority: 0 });
  const [conditions, setConditions] = useState<{ field: string; operator: string; value: string }[]>([]);
  const [levels, setLevels] = useState<{ level: number; approver_role: string; approver_user_id: string; auto_approve_if: string }[]>([]);

  const allFields = useMemo(() => {
    if (!tables) return [];
    return selectedTables.flatMap((tName) => {
      const tbl = tables.find((t) => t.name === tName);
      if (!tbl) return [];
      return tbl.fields.map((f) => ({ value: `${tName}.${f.name}`, label: f.label || f.name, table: tbl.label || tName }));
    });
  }, [tables, selectedTables]);

  useEffect(() => {
    if (rule) {
      setSelectedTables(rule.conditions?.[0]?.tableNames || [rule.tableName]);
      setFormData({ ruleName: rule.ruleName, description: rule.description || '', triggerStatus: rule.triggerStatus, targetApprovedStatus: rule.targetApprovedStatus, targetRejectedStatus: rule.targetRejectedStatus, isActive: rule.isActive, priority: rule.priority });
      setConditions(rule.conditions?.map((c: any) => ({ field: c.field || '', operator: c.operator || 'EQ', value: String(c.value ?? '') })) || []);
      setLevels(rule.approvalLevels?.map((l: any) => ({ level: l.level || 1, approver_role: l.approver_role || '', approver_user_id: l.approver_user_id || '', auto_approve_if: l.auto_approve_if || '' })) || []);
    } else {
      setSelectedTables([]);
      setFormData({ ruleName: '', description: '', triggerStatus: '', targetApprovedStatus: '', targetRejectedStatus: '', isActive: true, priority: 0 });
      setConditions([]);
      setLevels([{ level: 1, approver_role: '', approver_user_id: '', auto_approve_if: '' }]);
    }
  }, [rule, open]);

  const addCondition = () => setConditions([...conditions, { field: '', operator: 'EQ', value: '' }]);
  const removeCondition = (i: number) => setConditions(conditions.filter((_, idx) => idx !== i));
  const updateCondition = (i: number, key: string, val: string) => setConditions(conditions.map((c, idx) => (idx === i ? { ...c, [key]: val } : c)));
  const addLevel = () => setLevels([...levels, { level: levels.length + 1, approver_role: '', approver_user_id: '', auto_approve_if: '' }]);
  const removeLevel = (i: number) => setLevels(levels.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, level: idx + 1 })));
  const updateLevel = (i: number, key: string, val: string) => setLevels(levels.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)));

  const handleSubmit = async () => {
    if (selectedTables.length === 0 || !formData.ruleName || !formData.triggerStatus) { notify.error('Tables, rule name, and trigger status are required.'); return; }
    if (!formData.targetApprovedStatus || !formData.targetRejectedStatus) { notify.error('Target approved and rejected statuses are required.'); return; }
    if (levels.length === 0) { notify.error('At least one approval level is required.'); return; }
    const payload = {
      table_name: selectedTables[0], tableName: selectedTables[0],
      rule_name: formData.ruleName, ruleName: formData.ruleName,
      description: formData.description || null,
      trigger_status: formData.triggerStatus, triggerStatus: formData.triggerStatus,
      target_approved_status: formData.targetApprovedStatus, targetApprovedStatus: formData.targetApprovedStatus,
      target_rejected_status: formData.targetRejectedStatus, targetRejectedStatus: formData.targetRejectedStatus,
      is_active: formData.isActive, isActive: formData.isActive, priority: formData.priority,
      conditions: conditions.filter((c) => c.field).map((c) => ({ field: c.field, operator: c.operator, value: c.value || null, tableNames: selectedTables })),
      approval_levels: levels.filter((l) => l.approver_role || l.approver_user_id).map((l) => ({ level: l.level, approver_role: l.approver_role || undefined, approver_user_id: l.approver_user_id || undefined, auto_approve_if: l.auto_approve_if || undefined })),
      approvalLevels: levels.filter((l) => l.approver_role || l.approver_user_id).map((l) => ({ level: l.level, approver_role: l.approver_role || undefined, approver_user_id: l.approver_user_id || undefined, auto_approve_if: l.auto_approve_if || undefined })),
    };
    try {
      if (rule) { await updateRule.mutateAsync({ id: rule.id, ...payload }); notify.success('Approval rule updated.'); }
      else { await createRule.mutateAsync(payload); notify.success('Approval rule created.'); }
      onClose();
    } catch (err: any) { notify.error(err?.message || 'Failed to save approval rule.'); }
  };

  return (
    <Modal open={open} onClose={onClose} title={rule ? 'Edit Approval Rule' : 'Create Approval Rule'} description="Define when a document requires approval and who approves it" size="xl" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit} loading={createRule.isPending || updateRule.isPending}>{rule ? 'Save Changes' : 'Create Rule'}</Button></>}>
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-surface-800">Rule Configuration</h4>
          <MultiTableSelector selectedTables={selectedTables} onAdd={(n) => setSelectedTables((p) => [...p, n])} onRemove={(n) => setSelectedTables((p) => p.filter((t) => t !== n))} allTables={tables?.map((t) => ({ name: t.name, label: t.label })) || []} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Rule Name" value={formData.ruleName} onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })} placeholder="PO over 1000 JOD approval" required />
            <Input label="Priority" value={String(formData.priority)} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })} type="number" />
            <StatusSelect label="Trigger Status" value={formData.triggerStatus} onChange={(v) => setFormData({ ...formData, triggerStatus: v })} placeholder="PENDING_APPROVAL" required hint="When record moves to this status, approval starts" />
            <StatusSelect label="Target Approved Status" value={formData.targetApprovedStatus} onChange={(v) => setFormData({ ...formData, targetApprovedStatus: v })} placeholder="APPROVED" required />
            <StatusSelect label="Target Rejected Status" value={formData.targetRejectedStatus} onChange={(v) => setFormData({ ...formData, targetRejectedStatus: v })} placeholder="REJECTED" required />
          </div>
          <Textarea label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="When does this rule apply?" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between"><h4 className="text-sm font-semibold text-surface-800">Conditions (optional)</h4><Button variant="secondary" size="xs" leftIcon={<PlusIcon className="h-3.5 w-3.5" />} onClick={addCondition}>Add Condition</Button></div>
          <p className="text-xs text-surface-400">If no conditions, the rule applies to ALL records reaching the trigger status.</p>
          {conditions.map((cond, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-2 bg-surface-50 rounded-lg border border-surface-200">
              <FieldSelect label="Field" value={cond.field} onChange={(v) => updateCondition(i, 'field', v)} allFields={allFields} />
              <Select label="Operator" value={cond.operator} onChange={(e) => updateCondition(i, 'operator', e.target.value)} options={CONDITION_OPERATORS} size="sm" />
              <Input label="Value" value={cond.value} onChange={(e) => updateCondition(i, 'value', e.target.value)} placeholder="1000" size="sm" />
              <button onClick={() => removeCondition(i)} className="p-1 text-surface-400 hover:text-danger-500 mb-0.5"><TrashIcon className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between"><h4 className="text-sm font-semibold text-surface-800">Approval Levels</h4><Button variant="secondary" size="xs" leftIcon={<PlusIcon className="h-3.5 w-3.5" />} onClick={addLevel}>Add Level</Button></div>
          {levels.map((level, i) => (
            <div key={i} className="p-3 bg-surface-50 rounded-lg border border-surface-200 space-y-2">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold text-surface-600">Level {level.level}</span>{levels.length > 1 && <button onClick={() => removeLevel(i)} className="text-xs text-danger-500 hover:text-danger-700">Remove</button>}</div>
              <div className="grid grid-cols-3 gap-2">
                <RoleSelect label="Approver Role" value={level.approver_role} onChange={(v) => updateLevel(i, 'approver_role', v)} hint="Role required to approve" />
                <Input label="Specific User ID (optional)" value={level.approver_user_id} onChange={(e) => updateLevel(i, 'approver_user_id', e.target.value)} placeholder="user-uuid" size="sm" />
                <Input label="Auto-Approve If (optional)" value={level.auto_approve_if} onChange={(e) => updateLevel(i, 'auto_approve_if', e.target.value)} placeholder="amount < 500" size="sm" hint="Expression to skip this level" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ApprovalsPage() {
  const [filterTable, setFilterTable] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<ApprovalRuleType | null>(null);
  const [deleteRule, setDeleteRule] = useState<ApprovalRuleType | null>(null);

  const { data: tables } = useDynamicTables();
  const { data: rules, isLoading } = useApprovalRules(filterTable || undefined);
  const deleteRuleMut = useDeleteApprovalRule();

  const handleDelete = async () => { if (!deleteRule) return; try { await deleteRuleMut.mutateAsync(deleteRule.id); notify.success('Rule deleted.'); setDeleteRule(null); } catch { notify.error('Failed to delete rule.'); } };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={filterTable} onChange={(e) => setFilterTable(e.target.value)} options={[{ label: 'All Tables', value: '' }, ...(tables?.map((t) => ({ label: t.label, value: t.name })) || [])]} />
        <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => { setEditRule(null); setShowForm(true); }}>New Approval Rule</Button>
      </div>
      {isLoading ? (<div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-surface-100 rounded-xl animate-pulse" />)}</div>
      ) : !rules?.length ? (
        <Card padding="lg" className="text-center"><ShieldCheckIcon className="h-12 w-12 text-surface-300 mx-auto mb-3" /><h3 className="text-sm font-semibold text-surface-700">No approval rules defined</h3><p className="text-xs text-surface-400 mt-1 mb-4">Define approval workflows so documents require sign-off before processing.</p><Button onClick={() => { setEditRule(null); setShowForm(true); }} leftIcon={<PlusIcon className="h-4 w-4" />}>Create First Rule</Button></Card>
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <Card key={r.id} padding="md" className="group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-amber-50 rounded-lg flex items-center justify-center"><ShieldCheckIcon className="h-5 w-5 text-amber-600" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-surface-900">{r.ruleName}</h3>
                    <p className="text-xs text-surface-500">Table: <span className="font-medium">{r.tableName}</span>{' · '}Trigger: <Badge size="sm" variant="warning">{r.triggerStatus}</Badge>{' → '}<Badge size="sm" variant="success">{r.targetApprovedStatus}</Badge>{' / '}<Badge size="sm" variant="default">{r.targetRejectedStatus}</Badge></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge size="sm" variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
                  <span className="text-xs text-surface-400">{r.approvalLevels?.length || 0} level(s)</span>
                  <button onClick={() => { setEditRule(r); setShowForm(true); }} className="p-1 rounded text-surface-400 hover:text-primary-600 hover:bg-primary-50"><PencilSquareIcon className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteRule(r)} className="p-1 rounded text-surface-400 hover:text-danger-600 hover:bg-danger-50"><TrashIcon className="h-4 w-4" /></button>
                </div>
              </div>
              {r.description && <p className="text-xs text-surface-400 mt-1 ml-12">{r.description}</p>}
            </Card>
          ))}
        </div>
      )}
      <ApprovalRuleFormModal rule={editRule} open={showForm} onClose={() => { setShowForm(false); setEditRule(null); }} />
      <ConfirmModal open={!!deleteRule} onClose={() => setDeleteRule(null)} onConfirm={handleDelete} title="Delete Approval Rule" message={`Delete "${deleteRule?.ruleName}"? Active approvals may be affected.`} confirmLabel="Delete" loading={deleteRuleMut.isPending} />
    </div>
  );
}
