'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  BoltIcon,
  XMarkIcon,
  TableCellsIcon,
  Square3Stack3DIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { useAllTablesGrouped, TableDefinition } from '@/hooks/useAllTables';
import {
  useImpactRules,
  useImpactRulesGrouped,
  useCreateImpactRule,
  useCreateImpactRuleBatch,
  useUpdateImpactRule,
  useDeleteImpactRule,
  useDeleteImpactRuleGroup,
  type ImpactRuleType,
  type ImpactTypeValue,
  type ExecutionMode,
} from '@/hooks/useDynamicPlatform';
import { notify } from '@/components/ui/Toast';

/* ─── Impact Type Definitions (all 14) ─── */
const IMPACT_TYPES: { value: ImpactTypeValue; label: string; category: string; description: string }[] = [
  // Financial
  { value: 'GL_POSTING', label: 'GL Posting (Accounting)', category: 'Financial', description: 'Create double-entry GL journal entries' },
  { value: 'BUDGET_IMPACT', label: 'Budget Impact', category: 'Financial', description: 'Record budget consumption or allocation' },
  { value: 'COST_UPDATE', label: 'Cost Update', category: 'Financial', description: 'Update cost layers (FIFO/Weighted Average)' },
  { value: 'COMMISSION_CALC', label: 'Commission Calculation', category: 'Financial', description: 'Calculate and record sales commissions' },
  { value: 'INTERCOMPANY', label: 'Intercompany', category: 'Financial', description: 'Create due-to/due-from entries across entities' },
  // Supply Chain
  { value: 'INVENTORY_MOVEMENT', label: 'Inventory Movement', category: 'Supply Chain', description: 'Record stock in/out movements' },
  { value: 'STOCK_PLANNING', label: 'Stock Planning', category: 'Supply Chain', description: 'Check reorder points, auto-create purchase requisitions' },
  // CRM
  { value: 'CRM_LOG', label: 'CRM Activity Log', category: 'CRM', description: 'Log customer interaction or activity' },
  // Data
  { value: 'RECORD_CREATE', label: 'Create Record', category: 'Data', description: 'Create a new record in another table' },
  { value: 'FIELD_UPDATE', label: 'Field Update', category: 'Data', description: 'Update fields on this or another record' },
  // Workflow
  { value: 'NOTIFICATION', label: 'Notification', category: 'Workflow', description: 'Queue a notification (email/push/in-app)' },
  { value: 'WEBHOOK', label: 'Webhook', category: 'Workflow', description: 'Call an external HTTP endpoint' },
  { value: 'APPROVAL_TRIGGER', label: 'Approval Trigger', category: 'Workflow', description: 'Trigger an approval workflow' },
  // Analytics
  { value: 'ANALYTICS_EVENT', label: 'Analytics Event', category: 'Analytics', description: 'Record a business analytics event' },
];

const IMPACT_CATEGORIES = ['Financial', 'Supply Chain', 'CRM', 'Data', 'Workflow', 'Analytics'];

const IMPACT_COLORS: Record<string, string> = {
  GL_POSTING: 'bg-blue-50 text-blue-700',
  BUDGET_IMPACT: 'bg-blue-50 text-blue-700',
  COST_UPDATE: 'bg-blue-50 text-blue-700',
  COMMISSION_CALC: 'bg-blue-50 text-blue-700',
  INTERCOMPANY: 'bg-blue-50 text-blue-700',
  INVENTORY_MOVEMENT: 'bg-green-50 text-green-700',
  STOCK_PLANNING: 'bg-green-50 text-green-700',
  CRM_LOG: 'bg-purple-50 text-purple-700',
  RECORD_CREATE: 'bg-indigo-50 text-indigo-700',
  FIELD_UPDATE: 'bg-teal-50 text-teal-700',
  NOTIFICATION: 'bg-yellow-50 text-yellow-700',
  WEBHOOK: 'bg-orange-50 text-orange-700',
  APPROVAL_TRIGGER: 'bg-pink-50 text-pink-700',
  ANALYTICS_EVENT: 'bg-cyan-50 text-cyan-700',
};

const IMPACT_BADGE: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  GL_POSTING: 'info',
  BUDGET_IMPACT: 'info',
  COST_UPDATE: 'info',
  COMMISSION_CALC: 'info',
  INTERCOMPANY: 'info',
  INVENTORY_MOVEMENT: 'success',
  STOCK_PLANNING: 'success',
  CRM_LOG: 'default',
  RECORD_CREATE: 'info',
  FIELD_UPDATE: 'default',
  NOTIFICATION: 'warning',
  WEBHOOK: 'warning',
  APPROVAL_TRIGGER: 'warning',
  ANALYTICS_EVENT: 'default',
};

const EXECUTION_MODES: { value: ExecutionMode; label: string; description: string }[] = [
  { value: 'SEQUENTIAL', label: 'Sequential', description: 'Run impacts one after another in priority order' },
  { value: 'PARALLEL', label: 'Parallel', description: 'Run all impacts simultaneously for speed' },
  { value: 'TRANSACTIONAL', label: 'Transactional', description: 'All-or-nothing: if one fails, all roll back' },
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

// ─── GL Posting Config Editor ──────────────────────────────────────────────────────
function GlPostingConfigEditor({ entries, onChange, allFields }: { entries: any[]; onChange: (e: any[]) => void; allFields: { value: string; label: string; table: string }[] }) {
  const addEntry = () => onChange([...entries, { accountCodeField: '', accountCodeFixed: '', debitField: '', creditField: '', descriptionTemplate: '' }]);
  const removeEntry = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const updateEntry = (i: number, key: string, val: string) =>
    onChange(entries.map((e, idx) => (idx === i ? { ...e, [key]: val } : e)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-blue-800">GL Posting Entries (Double-Entry)</h4>
        <Button variant="secondary" size="xs" onClick={addEntry} leftIcon={<PlusIcon className="h-3 w-3" />}>Add Entry</Button>
      </div>
      <p className="text-xs text-blue-600">Each entry generates a GL line. Sum of Debits must equal Sum of Credits.</p>
      {entries.map((entry, i) => (
        <div key={i} className="p-2 bg-white rounded border border-blue-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-600">Entry {i + 1}</span>
            {entries.length > 1 && (
              <button onClick={() => removeEntry(i)} className="text-xs text-danger-500">Remove</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Account Code (fixed)" value={entry.accountCodeFixed || ''} onChange={(e) => updateEntry(i, 'accountCodeFixed', e.target.value)} placeholder="4100" size="sm" hint="Or use field below" />
            <FieldSelect label="Account Code Field (dynamic)" value={entry.accountCodeField || ''} onChange={(v) => updateEntry(i, 'accountCodeField', v)} allFields={allFields} />
            <FieldSelect label="Debit Field" value={entry.debitField || ''} onChange={(v) => updateEntry(i, 'debitField', v)} allFields={allFields} />
            <FieldSelect label="Credit Field" value={entry.creditField || ''} onChange={(v) => updateEntry(i, 'creditField', v)} allFields={allFields} />
          </div>
          <Input label="Description Template" value={entry.descriptionTemplate || ''} onChange={(e) => updateEntry(i, 'descriptionTemplate', e.target.value)} placeholder="Payment for {{vendor_name}} - Invoice {{invoice_number}}" size="sm" hint="Use {{fieldName}} for dynamic values" />
        </div>
      ))}
    </div>
  );
}

// ─── Impact Rule Form (Single) ─────────────────────────────────────────────────────
function ImpactRuleFormModal({
  rule,
  open,
  onClose,
}: {
  rule: ImpactRuleType | null;
  open: boolean;
  onClose: () => void;
}) {
  const { allTables: tables } = useAllTablesGrouped();
  const createRule = useCreateImpactRule();
  const updateRule = useUpdateImpactRule();

  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    ruleName: '',
    description: '',
    triggerStatus: '',
    impactType: 'GL_POSTING' as string,
    isActive: true,
    priority: 0,
  });

  // Config state for each impact type
  const [glEntries, setGlEntries] = useState<any[]>([{ accountCodeField: '', accountCodeFixed: '', debitField: '', creditField: '', descriptionTemplate: '' }]);
  const [inventoryConfig, setInventoryConfig] = useState({ itemField: '', warehouseField: '', quantityField: '', unitCostField: '', movementType: 'RECEIPT' });
  const [crmConfig, setCrmConfig] = useState({ customerField: '', descriptionTemplate: '', activityType: '' });
  const [recordCreateConfig, setRecordCreateConfig] = useState({ targetTable: '', fieldMapping: [{ targetField: '', sourceFieldOrValue: '' }] });
  const [webhookConfig, setWebhookConfig] = useState({ url: '', method: 'POST', headers: '', bodyTemplate: '' });
  const [fieldUpdateConfig, setFieldUpdateConfig] = useState({ targetTable: '', targetRecordField: '', updates: [{ field: '', valueOrExpression: '' }] });
  const [budgetConfig, setBudgetConfig] = useState({ budgetCode: '', amountField: '', periodField: '', direction: 'CONSUME' });
  const [stockPlanningConfig, setStockPlanningConfig] = useState({ itemField: '', warehouseField: '', reorderPoint: '', reorderQty: '' });
  const [commissionConfig, setCommissionConfig] = useState({ salespersonField: '', amountField: '', rate: '' });
  const [intercompanyConfig, setIntercompanyConfig] = useState({ sourceEntityField: '', targetEntityField: '', amountField: '' });
  const [costUpdateConfig, setCostUpdateConfig] = useState({ itemField: '', costField: '', method: 'WEIGHTED_AVG' });
  const [notificationConfig, setNotificationConfig] = useState({ channel: 'IN_APP', recipientField: '', templateId: '', subject: '' });
  const [approvalTriggerConfig, setApprovalTriggerConfig] = useState({ workflowId: '', approverField: '' });
  const [analyticsConfig, setAnalyticsConfig] = useState({ eventName: '', properties: '' });

  const allFields = useMemo(() => {
    if (!tables || selectedTables.length === 0) return [];
    return selectedTables.flatMap((tName) => {
      const tbl = tables.find((t: TableDefinition) => t.name === tName);
      if (!tbl || !tbl.fields) return [];
      return tbl.fields.map((f: any) => ({ value: f.name, label: f.label || f.name, table: tbl.label || tbl.name }));
    });
  }, [tables, selectedTables]);

  useEffect(() => {
    if (rule) {
      setSelectedTables(rule.tableName ? [rule.tableName] : []);
      setFormData({
        ruleName: rule.ruleName,
        description: rule.description || '',
        triggerStatus: rule.triggerStatus,
        impactType: rule.impactType,
        isActive: rule.isActive,
        priority: rule.priority,
      });
      const cfg = rule.config || {};
      switch (rule.impactType) {
        case 'GL_POSTING': setGlEntries(cfg.entries?.length ? cfg.entries : [{ accountCodeField: '', accountCodeFixed: '', debitField: '', creditField: '', descriptionTemplate: '' }]); break;
        case 'INVENTORY_MOVEMENT': setInventoryConfig({ itemField: cfg.itemField || '', warehouseField: cfg.warehouseField || '', quantityField: cfg.quantityField || '', unitCostField: cfg.unitCostField || '', movementType: cfg.movementType || 'RECEIPT' }); break;
        case 'CRM_LOG': setCrmConfig({ customerField: cfg.customerField || '', descriptionTemplate: cfg.descriptionTemplate || '', activityType: cfg.activityType || '' }); break;
        case 'RECORD_CREATE': setRecordCreateConfig({ targetTable: cfg.targetTable || '', fieldMapping: cfg.fieldMapping?.length ? cfg.fieldMapping : [{ targetField: '', sourceFieldOrValue: '' }] }); break;
        case 'WEBHOOK': setWebhookConfig({ url: cfg.url || '', method: cfg.method || 'POST', headers: cfg.headers ? JSON.stringify(cfg.headers) : '', bodyTemplate: cfg.bodyTemplate || '' }); break;
        case 'FIELD_UPDATE': setFieldUpdateConfig({ targetTable: cfg.targetTable || '', targetRecordField: cfg.targetRecordField || '', updates: cfg.updates?.length ? cfg.updates : [{ field: '', valueOrExpression: '' }] }); break;
        case 'BUDGET_IMPACT': setBudgetConfig({ budgetCode: cfg.budgetCode || '', amountField: cfg.amountField || '', periodField: cfg.periodField || '', direction: cfg.direction || 'CONSUME' }); break;
        case 'STOCK_PLANNING': setStockPlanningConfig({ itemField: cfg.itemField || '', warehouseField: cfg.warehouseField || '', reorderPoint: cfg.reorderPoint || '', reorderQty: cfg.reorderQty || '' }); break;
        case 'COMMISSION_CALC': setCommissionConfig({ salespersonField: cfg.salespersonField || '', amountField: cfg.amountField || '', rate: cfg.rate || '' }); break;
        case 'INTERCOMPANY': setIntercompanyConfig({ sourceEntityField: cfg.sourceEntityField || '', targetEntityField: cfg.targetEntityField || '', amountField: cfg.amountField || '' }); break;
        case 'COST_UPDATE': setCostUpdateConfig({ itemField: cfg.itemField || '', costField: cfg.costField || '', method: cfg.method || 'WEIGHTED_AVG' }); break;
        case 'NOTIFICATION': setNotificationConfig({ channel: cfg.channel || 'IN_APP', recipientField: cfg.recipientField || '', templateId: cfg.templateId || '', subject: cfg.subject || '' }); break;
        case 'APPROVAL_TRIGGER': setApprovalTriggerConfig({ workflowId: cfg.workflowId || '', approverField: cfg.approverField || '' }); break;
        case 'ANALYTICS_EVENT': setAnalyticsConfig({ eventName: cfg.eventName || '', properties: cfg.properties ? JSON.stringify(cfg.properties) : '' }); break;
      }
    } else {
      setSelectedTables([]);
      setFormData({ ruleName: '', description: '', triggerStatus: '', impactType: 'GL_POSTING', isActive: true, priority: 0 });
      setGlEntries([{ accountCodeField: '', accountCodeFixed: '', debitField: '', creditField: '', descriptionTemplate: '' }]);
    }
  }, [rule, open]);

  const getConfig = () => {
    switch (formData.impactType) {
      case 'GL_POSTING': return { entries: glEntries };
      case 'INVENTORY_MOVEMENT': return inventoryConfig;
      case 'CRM_LOG': return crmConfig;
      case 'RECORD_CREATE': return { ...recordCreateConfig, fieldMapping: recordCreateConfig.fieldMapping.filter((m) => m.targetField) };
      case 'WEBHOOK': { let headers: any = {}; try { if (webhookConfig.headers) headers = JSON.parse(webhookConfig.headers); } catch {} return { ...webhookConfig, headers }; }
      case 'FIELD_UPDATE': return { ...fieldUpdateConfig, updates: fieldUpdateConfig.updates.filter((u) => u.field) };
      case 'BUDGET_IMPACT': return budgetConfig;
      case 'STOCK_PLANNING': return stockPlanningConfig;
      case 'COMMISSION_CALC': return commissionConfig;
      case 'INTERCOMPANY': return intercompanyConfig;
      case 'COST_UPDATE': return costUpdateConfig;
      case 'NOTIFICATION': return notificationConfig;
      case 'APPROVAL_TRIGGER': return approvalTriggerConfig;
      case 'ANALYTICS_EVENT': { let props: any = {}; try { if (analyticsConfig.properties) props = JSON.parse(analyticsConfig.properties); } catch {} return { eventName: analyticsConfig.eventName, properties: props }; }
      default: return {};
    }
  };

  const handleSubmit = async () => {
    const tableName = selectedTables[0] || '';
    if (!tableName || !formData.ruleName || !formData.triggerStatus) {
      notify.error('Table, rule name, and trigger status are required.');
      return;
    }
    const payload = {
      tableName,
      ruleName: formData.ruleName,
      description: formData.description || null,
      triggerStatus: formData.triggerStatus,
      impactType: formData.impactType,
      isActive: formData.isActive,
      priority: formData.priority,
      config: getConfig(),
    };

    try {
      if (rule) {
        await updateRule.mutateAsync({ id: rule.id, ...payload });
        notify.success('Impact rule updated.');
      } else {
        await createRule.mutateAsync(payload);
        notify.success('Impact rule created.');
      }
      onClose();
    } catch (err: any) {
      notify.error(err?.message || 'Failed to save impact rule.');
    }
  };

  const renderConfigEditor = () => {
    switch (formData.impactType) {
      case 'GL_POSTING':
        return (<div className="p-3 bg-blue-50 rounded-lg border border-blue-200"><GlPostingConfigEditor entries={glEntries} onChange={setGlEntries} allFields={allFields} /></div>);
      case 'INVENTORY_MOVEMENT':
        return (<div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-3"><h4 className="text-xs font-semibold text-green-800">Inventory Movement Config</h4><div className="grid grid-cols-2 gap-3"><FieldSelect label="Item Field" value={inventoryConfig.itemField} onChange={(v) => setInventoryConfig({ ...inventoryConfig, itemField: v })} allFields={allFields} /><FieldSelect label="Warehouse Field" value={inventoryConfig.warehouseField} onChange={(v) => setInventoryConfig({ ...inventoryConfig, warehouseField: v })} allFields={allFields} /><FieldSelect label="Quantity Field" value={inventoryConfig.quantityField} onChange={(v) => setInventoryConfig({ ...inventoryConfig, quantityField: v })} allFields={allFields} /><FieldSelect label="Unit Cost Field" value={inventoryConfig.unitCostField} onChange={(v) => setInventoryConfig({ ...inventoryConfig, unitCostField: v })} allFields={allFields} /><Select label="Movement Type" value={inventoryConfig.movementType} onChange={(e) => setInventoryConfig({ ...inventoryConfig, movementType: e.target.value })} options={[{ label: 'Receipt (IN)', value: 'RECEIPT' }, { label: 'Issue (OUT)', value: 'ISSUE' }]} /></div></div>);
      case 'CRM_LOG':
        return (<div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-3"><h4 className="text-xs font-semibold text-purple-800">CRM Activity Log Config</h4><div className="grid grid-cols-2 gap-3"><FieldSelect label="Customer Field" value={crmConfig.customerField} onChange={(v) => setCrmConfig({ ...crmConfig, customerField: v })} allFields={allFields} /><Input label="Activity Type" value={crmConfig.activityType} onChange={(e) => setCrmConfig({ ...crmConfig, activityType: e.target.value })} placeholder="SALE" size="sm" /></div><Input label="Description Template" value={crmConfig.descriptionTemplate} onChange={(e) => setCrmConfig({ ...crmConfig, descriptionTemplate: e.target.value })} placeholder="Sale {{invoice_number}} for {{total_amount}}" size="sm" /></div>);
      case 'RECORD_CREATE':
        return (<div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 space-y-3"><h4 className="text-xs font-semibold text-indigo-800">Create Record Config</h4><Input label="Target Table" value={recordCreateConfig.targetTable} onChange={(e) => setRecordCreateConfig({ ...recordCreateConfig, targetTable: e.target.value })} placeholder="delivery_notes" size="sm" /><div className="space-y-2"><p className="text-xs text-surface-600">Field Mapping:</p>{recordCreateConfig.fieldMapping.map((m, i) => (<div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"><FieldSelect value={m.targetField} onChange={(v) => { const u = [...recordCreateConfig.fieldMapping]; u[i] = { ...u[i], targetField: v }; setRecordCreateConfig({ ...recordCreateConfig, fieldMapping: u }); }} allFields={allFields} label="Target Field" /><Input value={m.sourceFieldOrValue} onChange={(e) => { const u = [...recordCreateConfig.fieldMapping]; u[i] = { ...u[i], sourceFieldOrValue: e.target.value }; setRecordCreateConfig({ ...recordCreateConfig, fieldMapping: u }); }} placeholder="Source Field or Value" size="sm" /><button onClick={() => setRecordCreateConfig({ ...recordCreateConfig, fieldMapping: recordCreateConfig.fieldMapping.filter((_, idx) => idx !== i) })} className="p-1 text-surface-400 hover:text-danger-500"><TrashIcon className="h-4 w-4" /></button></div>))}<Button variant="secondary" size="xs" onClick={() => setRecordCreateConfig({ ...recordCreateConfig, fieldMapping: [...recordCreateConfig.fieldMapping, { targetField: '', sourceFieldOrValue: '' }] })} leftIcon={<PlusIcon className="h-3 w-3" />}>Add Mapping</Button></div></div>);
      case 'WEBHOOK':
        return (<div className="p-3 bg-orange-50 rounded-lg border border-orange-200 space-y-3"><h4 className="text-xs font-semibold text-orange-800">Webhook Config</h4><div className="grid grid-cols-2 gap-3"><Input label="URL" value={webhookConfig.url} onChange={(e) => setWebhookConfig({ ...webhookConfig, url: e.target.value })} placeholder="https://api.example.com/hooks/..." size="sm" /><Select label="Method" value={webhookConfig.method} onChange={(e) => setWebhookConfig({ ...webhookConfig, method: e.target.value })} options={[{ label: 'POST', value: 'POST' }, { label: 'PUT', value: 'PUT' }, { label: 'PATCH', value: 'PATCH' }]} /></div><Input label="Headers (JSON)" value={webhookConfig.headers} onChange={(e) => setWebhookConfig({ ...webhookConfig, headers: e.target.value })} placeholder='{"Authorization": "Bearer ..."}' size="sm" /><Textarea label="Body Template" value={webhookConfig.bodyTemplate} onChange={(e) => setWebhookConfig({ ...webhookConfig, bodyTemplate: e.target.value })} placeholder='{"event": "invoice_posted", "data": {{record}}}' /></div>);
      case 'FIELD_UPDATE':
        return (<div className="p-3 bg-teal-50 rounded-lg border border-teal-200 space-y-3"><h4 className="text-xs font-semibold text-teal-800">Field Update Config</h4><div className="grid grid-cols-2 gap-3"><Input label="Target Table" value={fieldUpdateConfig.targetTable} onChange={(e) => setFieldUpdateConfig({ ...fieldUpdateConfig, targetTable: e.target.value })} placeholder="Same or another table" size="sm" /><FieldSelect label="Target Record Field" value={fieldUpdateConfig.targetRecordField} onChange={(v) => setFieldUpdateConfig({ ...fieldUpdateConfig, targetRecordField: v })} allFields={allFields} /></div><div className="space-y-2"><p className="text-xs text-surface-600">Updates:</p>{fieldUpdateConfig.updates.map((u, i) => (<div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"><FieldSelect value={u.field} onChange={(v) => { const arr = [...fieldUpdateConfig.updates]; arr[i] = { ...arr[i], field: v }; setFieldUpdateConfig({ ...fieldUpdateConfig, updates: arr }); }} allFields={allFields} label="Field to update" /><Input value={u.valueOrExpression} onChange={(e) => { const arr = [...fieldUpdateConfig.updates]; arr[i] = { ...arr[i], valueOrExpression: e.target.value }; setFieldUpdateConfig({ ...fieldUpdateConfig, updates: arr }); }} placeholder="Value or expression" size="sm" /><button onClick={() => setFieldUpdateConfig({ ...fieldUpdateConfig, updates: fieldUpdateConfig.updates.filter((_, idx) => idx !== i) })} className="p-1 text-surface-400 hover:text-danger-500"><TrashIcon className="h-4 w-4" /></button></div>))}<Button variant="secondary" size="xs" onClick={() => setFieldUpdateConfig({ ...fieldUpdateConfig, updates: [...fieldUpdateConfig.updates, { field: '', valueOrExpression: '' }] })} leftIcon={<PlusIcon className="h-3 w-3" />}>Add Update</Button></div></div>);
      case 'BUDGET_IMPACT':
        return (<div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-3"><h4 className="text-xs font-semibold text-blue-800">Budget Impact Config</h4><div className="grid grid-cols-2 gap-3"><Input label="Budget Code" value={budgetConfig.budgetCode} onChange={(e) => setBudgetConfig({ ...budgetConfig, budgetCode: e.target.value })} placeholder="OPEX-2026" size="sm" /><FieldSelect label="Amount Field" value={budgetConfig.amountField} onChange={(v) => setBudgetConfig({ ...budgetConfig, amountField: v })} allFields={allFields} /><FieldSelect label="Period Field" value={budgetConfig.periodField} onChange={(v) => setBudgetConfig({ ...budgetConfig, periodField: v })} allFields={allFields} /><Select label="Direction" value={budgetConfig.direction} onChange={(e) => setBudgetConfig({ ...budgetConfig, direction: e.target.value })} options={[{ label: 'Consume Budget', value: 'CONSUME' }, { label: 'Allocate Budget', value: 'ALLOCATE' }]} /></div></div>);
      case 'STOCK_PLANNING':
        return (<div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-3"><h4 className="text-xs font-semibold text-green-800">Stock Planning Config</h4><div className="grid grid-cols-2 gap-3"><FieldSelect label="Item Field" value={stockPlanningConfig.itemField} onChange={(v) => setStockPlanningConfig({ ...stockPlanningConfig, itemField: v })} allFields={allFields} /><FieldSelect label="Warehouse Field" value={stockPlanningConfig.warehouseField} onChange={(v) => setStockPlanningConfig({ ...stockPlanningConfig, warehouseField: v })} allFields={allFields} /><Input label="Reorder Point" value={stockPlanningConfig.reorderPoint} onChange={(e) => setStockPlanningConfig({ ...stockPlanningConfig, reorderPoint: e.target.value })} placeholder="10" size="sm" /><Input label="Reorder Qty" value={stockPlanningConfig.reorderQty} onChange={(e) => setStockPlanningConfig({ ...stockPlanningConfig, reorderQty: e.target.value })} placeholder="100" size="sm" /></div></div>);
      case 'COMMISSION_CALC':
        return (<div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-3"><h4 className="text-xs font-semibold text-blue-800">Commission Calculation Config</h4><div className="grid grid-cols-2 gap-3"><FieldSelect label="Salesperson Field" value={commissionConfig.salespersonField} onChange={(v) => setCommissionConfig({ ...commissionConfig, salespersonField: v })} allFields={allFields} /><FieldSelect label="Amount Field" value={commissionConfig.amountField} onChange={(v) => setCommissionConfig({ ...commissionConfig, amountField: v })} allFields={allFields} /><Input label="Commission Rate (%)" value={commissionConfig.rate} onChange={(e) => setCommissionConfig({ ...commissionConfig, rate: e.target.value })} placeholder="5" size="sm" type="number" /></div></div>);
      case 'INTERCOMPANY':
        return (<div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-3"><h4 className="text-xs font-semibold text-blue-800">Intercompany Config</h4><div className="grid grid-cols-2 gap-3"><FieldSelect label="Source Entity Field" value={intercompanyConfig.sourceEntityField} onChange={(v) => setIntercompanyConfig({ ...intercompanyConfig, sourceEntityField: v })} allFields={allFields} /><FieldSelect label="Target Entity Field" value={intercompanyConfig.targetEntityField} onChange={(v) => setIntercompanyConfig({ ...intercompanyConfig, targetEntityField: v })} allFields={allFields} /><FieldSelect label="Amount Field" value={intercompanyConfig.amountField} onChange={(v) => setIntercompanyConfig({ ...intercompanyConfig, amountField: v })} allFields={allFields} /></div></div>);
      case 'COST_UPDATE':
        return (<div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-3"><h4 className="text-xs font-semibold text-blue-800">Cost Update Config</h4><div className="grid grid-cols-2 gap-3"><FieldSelect label="Item Field" value={costUpdateConfig.itemField} onChange={(v) => setCostUpdateConfig({ ...costUpdateConfig, itemField: v })} allFields={allFields} /><FieldSelect label="Cost Field" value={costUpdateConfig.costField} onChange={(v) => setCostUpdateConfig({ ...costUpdateConfig, costField: v })} allFields={allFields} /><Select label="Costing Method" value={costUpdateConfig.method} onChange={(e) => setCostUpdateConfig({ ...costUpdateConfig, method: e.target.value })} options={[{ label: 'Weighted Average', value: 'WEIGHTED_AVG' }, { label: 'FIFO', value: 'FIFO' }, { label: 'Standard Cost', value: 'STANDARD' }]} /></div></div>);
      case 'NOTIFICATION':
        return (<div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 space-y-3"><h4 className="text-xs font-semibold text-yellow-800">Notification Config</h4><div className="grid grid-cols-2 gap-3"><Select label="Channel" value={notificationConfig.channel} onChange={(e) => setNotificationConfig({ ...notificationConfig, channel: e.target.value })} options={[{ label: 'In-App', value: 'IN_APP' }, { label: 'Email', value: 'EMAIL' }, { label: 'Push', value: 'PUSH' }, { label: 'SMS', value: 'SMS' }]} /><FieldSelect label="Recipient Field" value={notificationConfig.recipientField} onChange={(v) => setNotificationConfig({ ...notificationConfig, recipientField: v })} allFields={allFields} /><Input label="Subject" value={notificationConfig.subject} onChange={(e) => setNotificationConfig({ ...notificationConfig, subject: e.target.value })} placeholder="Invoice {{number}} approved" size="sm" /><Input label="Template ID" value={notificationConfig.templateId} onChange={(e) => setNotificationConfig({ ...notificationConfig, templateId: e.target.value })} placeholder="tpl_invoice_approved" size="sm" /></div></div>);
      case 'APPROVAL_TRIGGER':
        return (<div className="p-3 bg-pink-50 rounded-lg border border-pink-200 space-y-3"><h4 className="text-xs font-semibold text-pink-800">Approval Trigger Config</h4><div className="grid grid-cols-2 gap-3"><Input label="Workflow ID" value={approvalTriggerConfig.workflowId} onChange={(e) => setApprovalTriggerConfig({ ...approvalTriggerConfig, workflowId: e.target.value })} placeholder="wf_purchase_approval" size="sm" /><FieldSelect label="Approver Field" value={approvalTriggerConfig.approverField} onChange={(v) => setApprovalTriggerConfig({ ...approvalTriggerConfig, approverField: v })} allFields={allFields} /></div></div>);
      case 'ANALYTICS_EVENT':
        return (<div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200 space-y-3"><h4 className="text-xs font-semibold text-cyan-800">Analytics Event Config</h4><Input label="Event Name" value={analyticsConfig.eventName} onChange={(e) => setAnalyticsConfig({ ...analyticsConfig, eventName: e.target.value })} placeholder="order_completed" size="sm" /><Textarea label="Properties (JSON)" value={analyticsConfig.properties} onChange={(e) => setAnalyticsConfig({ ...analyticsConfig, properties: e.target.value })} placeholder='{"order_value": "{{total}}", "customer_tier": "{{tier}}"}' /></div>);
      default:
        return null;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rule ? 'Edit Impact Rule' : 'Create Impact Rule'}
      description="Define what happens when a record reaches a specific status"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={createRule.isPending || updateRule.isPending}>
            {rule ? 'Save Changes' : 'Create Rule'}
          </Button>
        </>
      }
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
        {/* Basic info */}
        <div className="space-y-3">
          <MultiTableSelector
            selectedTables={selectedTables}
            onAdd={(n) => setSelectedTables([...selectedTables, n])}
            onRemove={(n) => setSelectedTables(selectedTables.filter((t) => t !== n))}
            allTables={tables?.map((t: TableDefinition) => ({ name: t.name, label: t.label || t.name })) || []}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Rule Name"
              value={formData.ruleName}
              onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
              placeholder="Post Sales Invoice to GL"
              required
            />
            <StatusSelect
              label="Trigger Status"
              value={formData.triggerStatus}
              onChange={(v) => setFormData({ ...formData, triggerStatus: v })}
              placeholder="POSTED"
              hint="Fires when record moves to this status"
              required
            />
            <div className="space-y-1">
              <label className="block text-xs font-medium text-surface-700">Impact Type</label>
              <select
                value={formData.impactType}
                onChange={(e) => setFormData({ ...formData, impactType: e.target.value })}
                className="w-full rounded-md border border-surface-300 px-2 py-1.5 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {IMPACT_CATEGORIES.map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {IMPACT_TYPES.filter((t) => t.category === cat).map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <Input
              label="Priority"
              value={String(formData.priority)}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              type="number"
              hint="Lower = runs first"
            />
          </div>
        </div>
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What does this rule do?"
        />

        {/* Dynamic config editor based on impact type */}
        {renderConfigEditor()}
      </div>
    </Modal>
  );
}

// ─── Batch Create Modal (Multi-Impact) ───────────────────────────────────────
function BatchCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { allTables: tables } = useAllTablesGrouped();
  const batchCreate = useCreateImpactRuleBatch();

  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [triggerStatus, setTriggerStatus] = useState('POSTED');
  const [groupName, setGroupName] = useState('');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('TRANSACTIONAL');
  const [rollbackOnFailure, setRollbackOnFailure] = useState(true);
  const [rules, setRules] = useState<Array<{ impactType: ImpactTypeValue; ruleName: string; description: string; priority: number }>>([{ impactType: 'GL_POSTING', ruleName: '', description: '', priority: 0 }]);

  const addRule = () => {
    setRules([...rules, { impactType: 'GL_POSTING', ruleName: '', description: '', priority: rules.length }]);
  };

  const removeRule = (idx: number) => {
    if (rules.length <= 1) return;
    setRules(rules.filter((_, i) => i !== idx));
  };

  const updateRule = (idx: number, field: string, value: any) => {
    setRules(rules.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async () => {
    const tableName = selectedTables[0] || '';
    if (!tableName || !triggerStatus || !groupName) {
      notify.error('Table, trigger status, and group name are required.');
      return;
    }
    if (rules.some((r) => !r.ruleName)) {
      notify.error('All rules must have a name.');
      return;
    }

    try {
      await batchCreate.mutateAsync({
        tableName,
        triggerStatus,
        groupName,
        executionMode,
        rollbackOnFailure,
        rules: rules.map((r) => ({
          ruleName: r.ruleName,
          description: r.description,
          impactType: r.impactType,
          config: {},
          priority: r.priority,
        })),
      });
      notify.success(`Created ${rules.length} impact rules as a group.`);
      onClose();
      setRules([{ impactType: 'GL_POSTING', ruleName: '', description: '', priority: 0 }]);
      setGroupName('');
    } catch (err: any) {
      notify.error(err?.message || 'Failed to create batch.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Multi-Impact Group"
      description="Define multiple impacts that fire together on a single status transition"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={batchCreate.isPending}>
            Create {rules.length} Impact{rules.length > 1 ? 's' : ''} as Group
          </Button>
        </>
      }
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
        {/* Group settings */}
        <div className="space-y-3">
          <MultiTableSelector
            selectedTables={selectedTables}
            onAdd={(n) => setSelectedTables([...selectedTables, n])}
            onRemove={(n) => setSelectedTables(selectedTables.filter((t) => t !== n))}
            allTables={tables?.map((t: TableDefinition) => ({ name: t.name, label: t.label || t.name })) || []}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Sales Invoice Posting" required />
            <StatusSelect label="Trigger Status" value={triggerStatus} onChange={(v) => setTriggerStatus(v)} placeholder="POSTED" hint="All impacts fire on this status" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-surface-700">Execution Mode</label>
              <select value={executionMode} onChange={(e) => setExecutionMode(e.target.value as ExecutionMode)} className="w-full rounded-md border border-surface-300 px-2 py-1.5 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                {EXECUTION_MODES.map((m) => (<option key={m.value} value={m.value}>{m.label} — {m.description}</option>))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rollbackOnFailure} onChange={(e) => setRollbackOnFailure(e.target.checked)} className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-xs font-medium text-surface-700">Rollback all on failure</span>
              </label>
            </div>
          </div>
        </div>

        {/* Impact rules in group */}
        <div className="border-t border-surface-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-800">Impacts in this Group ({rules.length})</h3>
            <Button variant="secondary" size="xs" onClick={addRule} leftIcon={<PlusIcon className="h-3.5 w-3.5" />}>Add Impact</Button>
          </div>

          {rules.map((rule, idx) => (
            <div key={idx} className="p-3 bg-surface-50 rounded-lg border border-surface-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-600">Impact #{idx + 1}</span>
                {rules.length > 1 && (<button onClick={() => removeRule(idx)} className="text-xs text-danger-500 hover:text-danger-700">Remove</button>)}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input label="Rule Name" value={rule.ruleName} onChange={(e) => updateRule(idx, 'ruleName', e.target.value)} placeholder="Post to GL" size="sm" required />
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-surface-700">Impact Type</label>
                  <select value={rule.impactType} onChange={(e) => updateRule(idx, 'impactType', e.target.value)} className="w-full rounded-md border border-surface-300 px-2 py-1.5 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                    {IMPACT_CATEGORIES.map((cat) => (<optgroup key={cat} label={cat}>{IMPACT_TYPES.filter((t) => t.category === cat).map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}</optgroup>))}
                  </select>
                </div>
                <Input label="Priority" value={String(rule.priority)} onChange={(e) => updateRule(idx, 'priority', parseInt(e.target.value) || 0)} type="number" size="sm" />
              </div>
              <Input label="Description" value={rule.description} onChange={(e) => updateRule(idx, 'description', e.target.value)} placeholder="What does this impact do?" size="sm" />
            </div>
          ))}
        </div>

        <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
          <p className="text-xs text-primary-700">
            <strong>Multi-Impact:</strong> All impacts in this group fire atomically on the same status transition.
            After creation, you can edit each rule individually to configure field mappings, GL entries, etc.
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function ImpactRulesPage() {
  const [filterTable, setFilterTable] = useState('');
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [showForm, setShowForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [editRule, setEditRule] = useState<ImpactRuleType | null>(null);
  const [deleteRule, setDeleteRule] = useState<ImpactRuleType | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const { allTables: tables } = useAllTablesGrouped();
  const { data: rules, isLoading } = useImpactRules(filterTable || undefined);
  const { data: groups } = useImpactRulesGrouped();
  const deleteRuleMut = useDeleteImpactRule();
  const deleteGroupMut = useDeleteImpactRuleGroup();

  const handleDelete = async () => {
    if (!deleteRule) return;
    try {
      await deleteRuleMut.mutateAsync(deleteRule.id);
      notify.success('Rule deleted.');
      setDeleteRule(null);
    } catch {
      notify.error('Failed to delete rule.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;
    try {
      await deleteGroupMut.mutateAsync(deleteGroupId);
      notify.success('Impact group deleted.');
      setDeleteGroupId(null);
    } catch {
      notify.error('Failed to delete group.');
    }
  };

  const renderFlatView = () => {
    if (!rules?.length) return (
      <Card padding="lg" className="text-center">
        <BoltIcon className="h-12 w-12 text-surface-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-surface-700">No impact rules defined</h3>
        <p className="text-xs text-surface-400 mt-1 mb-4">
          Impact rules connect your screens to core engines — GL, Inventory, CRM, Budgets, and more.
          Create a single rule or a multi-impact group.
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => { setEditRule(null); setShowForm(true); }} leftIcon={<PlusIcon className="h-4 w-4" />}>
            Single Rule
          </Button>
          <Button variant="secondary" onClick={() => setShowBatchForm(true)} leftIcon={<Square3Stack3DIcon className="h-4 w-4" />}>
            Multi-Impact Group
          </Button>
        </div>
      </Card>
    );

    return (
      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id} padding="md" className="group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${IMPACT_COLORS[rule.impactType]?.split(' ')[0] || 'bg-surface-50'}`}>
                  <BoltIcon className={`h-5 w-5 ${IMPACT_COLORS[rule.impactType]?.split(' ')[1] || 'text-surface-600'}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900">{rule.ruleName}</h3>
                  <p className="text-xs text-surface-500">
                    <span className="font-medium">{rule.tableName}</span>
                    {' · Status: '}<Badge size="sm" variant="warning">{rule.triggerStatus}</Badge>
                    {' → '}<Badge size="sm" variant={IMPACT_BADGE[rule.impactType] || 'default'}>{rule.impactType.replace(/_/g, ' ')}</Badge>
                    {rule.groupName && <> · <Badge size="sm" variant="info">{rule.groupName}</Badge></>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge size="sm" variant={rule.isActive ? 'success' : 'default'}>
                  {rule.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <button onClick={() => { setEditRule(rule); setShowForm(true); }} className="p-1 rounded text-surface-400 hover:text-primary-600 hover:bg-primary-50"><PencilSquareIcon className="h-4 w-4" /></button>
                <button onClick={() => setDeleteRule(rule)} className="p-1 rounded text-surface-400 hover:text-danger-600 hover:bg-danger-50"><TrashIcon className="h-4 w-4" /></button>
              </div>
            </div>
            {rule.description && (<p className="text-xs text-surface-400 mt-1 ml-12">{rule.description}</p>)}
          </Card>
        ))}
      </div>
    );
  };

  const renderGroupedView = () => {
    if (!groups?.length) return (
      <Card padding="lg" className="text-center">
        <Square3Stack3DIcon className="h-12 w-12 text-surface-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-surface-700">No impact groups found</h3>
        <p className="text-xs text-surface-400 mt-1 mb-4">
          Groups bundle multiple impacts that fire together on one status change.
        </p>
        <Button onClick={() => setShowBatchForm(true)} leftIcon={<Square3Stack3DIcon className="h-4 w-4" />}>
          Create Multi-Impact Group
        </Button>
      </Card>
    );

    return (
      <div className="space-y-4">
        {groups.map((group) => (
          <Card key={group.groupId} padding="md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-surface-900 flex items-center gap-2">
                  <Square3Stack3DIcon className="h-4 w-4 text-primary-500" />
                  {group.groupName}
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  <span className="font-medium">{group.tableName}</span>
                  {' · On: '}<Badge size="sm" variant="warning">{group.triggerStatus}</Badge>
                  {' · '}<Badge size="sm" variant="info">{group.executionMode}</Badge>
                  {group.rollbackOnFailure && <Badge size="sm" variant="default" className="ml-1">Rollback</Badge>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge size="sm" variant="default">{group.rules?.length || 0} impacts</Badge>
                <button onClick={() => setDeleteGroupId(group.groupId)} className="p-1 rounded text-surface-400 hover:text-danger-600 hover:bg-danger-50"><TrashIcon className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="space-y-1 ml-6">
              {group.rules?.map((rule, i) => (
                <div key={rule.id || i} className="flex items-center gap-2 text-xs py-1">
                  <span className="w-5 text-surface-400 font-mono">{i + 1}.</span>
                  <Badge size="sm" variant={IMPACT_BADGE[rule.impactType] || 'default'}>{rule.impactType.replace(/_/g, ' ')}</Badge>
                  <span className="text-surface-700">{rule.ruleName}</span>
                  <button onClick={() => { setEditRule(rule); setShowForm(true); }} className="ml-auto p-0.5 rounded text-surface-400 hover:text-primary-600"><PencilSquareIcon className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={filterTable} onChange={(e) => setFilterTable(e.target.value)} options={[{ label: 'All Tables', value: '' }, ...(tables?.map((t: TableDefinition) => ({ label: t.label || t.name, value: t.name })) || [])]} />
          <div className="flex rounded-lg border border-surface-200 overflow-hidden">
            <button onClick={() => setViewMode('flat')} className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'flat' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:bg-surface-50'}`}>Flat</button>
            <button onClick={() => setViewMode('grouped')} className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'grouped' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:bg-surface-50'}`}>Grouped</button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<Square3Stack3DIcon className="h-4 w-4" />} onClick={() => setShowBatchForm(true)}>Multi-Impact</Button>
          <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => { setEditRule(null); setShowForm(true); }}>New Rule</Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-surface-100 rounded-xl animate-pulse" />)}</div>
      ) : viewMode === 'flat' ? renderFlatView() : renderGroupedView()}

      {/* Modals */}
      <ImpactRuleFormModal rule={editRule} open={showForm} onClose={() => { setShowForm(false); setEditRule(null); }} />
      <BatchCreateModal open={showBatchForm} onClose={() => setShowBatchForm(false)} />
      <ConfirmModal open={!!deleteRule} onClose={() => setDeleteRule(null)} onConfirm={handleDelete} title="Delete Impact Rule" message={`Delete "${deleteRule?.ruleName}"? The connected automation will stop firing.`} confirmLabel="Delete" loading={deleteRuleMut.isPending} />
      <ConfirmModal open={!!deleteGroupId} onClose={() => setDeleteGroupId(null)} onConfirm={handleDeleteGroup} title="Delete Impact Group" message="Delete this entire impact group? All rules in the group will be removed." confirmLabel="Delete Group" loading={deleteGroupMut.isPending} />
    </div>
  );
}
