'use client';

import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { useDynamicTables } from '@/hooks/useDynamic';
import {
  useImpactRules,
  useCreateImpactRule,
  useUpdateImpactRule,
  useDeleteImpactRule,
  type ImpactRuleType,
} from '@/hooks/useDynamicPlatform';
import { notify } from '@/components/ui/Toast';

const IMPACT_TYPES = [
  { label: 'GL Posting (Accounting)', value: 'GL_POSTING' },
  { label: 'Inventory Movement', value: 'INVENTORY_MOVEMENT' },
  { label: 'CRM Activity Log', value: 'CRM_LOG' },
  { label: 'Create Record', value: 'RECORD_CREATE' },
  { label: 'Webhook', value: 'WEBHOOK' },
  { label: 'Field Update', value: 'FIELD_UPDATE' },
];

const IMPACT_COLORS: Record<string, string> = {
  GL_POSTING: 'bg-blue-50 text-blue-700',
  INVENTORY_MOVEMENT: 'bg-green-50 text-green-700',
  CRM_LOG: 'bg-purple-50 text-purple-700',
  RECORD_CREATE: 'bg-indigo-50 text-indigo-700',
  WEBHOOK: 'bg-orange-50 text-orange-700',
  FIELD_UPDATE: 'bg-teal-50 text-teal-700',
};

const IMPACT_BADGE: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  GL_POSTING: 'info',
  INVENTORY_MOVEMENT: 'success',
  CRM_LOG: 'default',
  RECORD_CREATE: 'info',
  WEBHOOK: 'warning',
  FIELD_UPDATE: 'default',
};

// ─── GL Posting Config Editor ────────────────────────────────────────────────
function GlPostingConfigEditor({ entries, onChange }: { entries: any[]; onChange: (e: any[]) => void }) {
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
            <Input
              label="Account Code (fixed)"
              value={entry.accountCodeFixed || ''}
              onChange={(e) => updateEntry(i, 'accountCodeFixed', e.target.value)}
              placeholder="4100"
              size="sm"
              hint="Or use field below"
            />
            <Input
              label="Account Code Field (dynamic)"
              value={entry.accountCodeField || ''}
              onChange={(e) => updateEntry(i, 'accountCodeField', e.target.value)}
              placeholder="expense_account"
              size="sm"
              hint="Field on record holding account code"
            />
            <Input
              label="Debit Field"
              value={entry.debitField || ''}
              onChange={(e) => updateEntry(i, 'debitField', e.target.value)}
              placeholder="total_amount"
              size="sm"
            />
            <Input
              label="Credit Field"
              value={entry.creditField || ''}
              onChange={(e) => updateEntry(i, 'creditField', e.target.value)}
              placeholder="total_amount"
              size="sm"
            />
          </div>
          <Input
            label="Description Template"
            value={entry.descriptionTemplate || ''}
            onChange={(e) => updateEntry(i, 'descriptionTemplate', e.target.value)}
            placeholder="Payment for {{vendor_name}} - Invoice {{invoice_number}}"
            size="sm"
            hint="Use {{fieldName}} for dynamic values"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Impact Rule Form ────────────────────────────────────────────────────────
function ImpactRuleFormModal({
  rule,
  open,
  onClose,
}: {
  rule: ImpactRuleType | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: tables } = useDynamicTables();
  const createRule = useCreateImpactRule();
  const updateRule = useUpdateImpactRule();

  const [formData, setFormData] = useState({
    tableName: '',
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

  useEffect(() => {
    if (rule) {
      setFormData({
        tableName: rule.tableName,
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
      }
    } else {
      setFormData({ tableName: '', ruleName: '', description: '', triggerStatus: '', impactType: 'GL_POSTING', isActive: true, priority: 0 });
      setGlEntries([{ accountCodeField: '', accountCodeFixed: '', debitField: '', creditField: '', descriptionTemplate: '' }]);
    }
  }, [rule, open]);

  const getConfig = () => {
    switch (formData.impactType) {
      case 'GL_POSTING': return { entries: glEntries };
      case 'INVENTORY_MOVEMENT': return inventoryConfig;
      case 'CRM_LOG': return crmConfig;
      case 'RECORD_CREATE': return { ...recordCreateConfig, fieldMapping: recordCreateConfig.fieldMapping.filter((m) => m.targetField) };
      case 'WEBHOOK': {
        let headers: any = {};
        try { if (webhookConfig.headers) headers = JSON.parse(webhookConfig.headers); } catch {}
        return { ...webhookConfig, headers };
      }
      case 'FIELD_UPDATE': return { ...fieldUpdateConfig, updates: fieldUpdateConfig.updates.filter((u) => u.field) };
      default: return {};
    }
  };

  const handleSubmit = async () => {
    if (!formData.tableName || !formData.ruleName || !formData.triggerStatus) {
      notify.error('Table, rule name, and trigger status are required.');
      return;
    }
    const payload = {
      table_name: formData.tableName,
      tableName: formData.tableName,
      rule_name: formData.ruleName,
      ruleName: formData.ruleName,
      description: formData.description || null,
      trigger_status: formData.triggerStatus,
      triggerStatus: formData.triggerStatus,
      impact_type: formData.impactType,
      impactType: formData.impactType,
      is_active: formData.isActive,
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
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Table"
            value={formData.tableName}
            onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
            options={[{ label: '— Select Table —', value: '' }, ...(tables?.map((t) => ({ label: t.label, value: t.name })) || [])]}
            required
          />
          <Input
            label="Rule Name"
            value={formData.ruleName}
            onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
            placeholder="Post Sales Invoice to GL"
            required
          />
          <Input
            label="Trigger Status"
            value={formData.triggerStatus}
            onChange={(e) => setFormData({ ...formData, triggerStatus: e.target.value })}
            placeholder="POSTED"
            hint="Fires when record moves to this status"
            required
          />
          <Select
            label="Impact Type"
            value={formData.impactType}
            onChange={(e) => setFormData({ ...formData, impactType: e.target.value })}
            options={IMPACT_TYPES}
          />
          <Input
            label="Priority"
            value={String(formData.priority)}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
            type="number"
            hint="Lower = runs first"
          />
        </div>
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What does this rule do?"
        />

        {/* GL Posting Config */}
        {formData.impactType === 'GL_POSTING' && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <GlPostingConfigEditor entries={glEntries} onChange={setGlEntries} />
          </div>
        )}

        {/* Inventory Movement Config */}
        {formData.impactType === 'INVENTORY_MOVEMENT' && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-3">
            <h4 className="text-xs font-semibold text-green-800">Inventory Movement Config</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Item Field" value={inventoryConfig.itemField} onChange={(e) => setInventoryConfig({ ...inventoryConfig, itemField: e.target.value })} placeholder="item_id" size="sm" />
              <Input label="Warehouse Field" value={inventoryConfig.warehouseField} onChange={(e) => setInventoryConfig({ ...inventoryConfig, warehouseField: e.target.value })} placeholder="warehouse_id" size="sm" />
              <Input label="Quantity Field" value={inventoryConfig.quantityField} onChange={(e) => setInventoryConfig({ ...inventoryConfig, quantityField: e.target.value })} placeholder="quantity" size="sm" />
              <Input label="Unit Cost Field" value={inventoryConfig.unitCostField} onChange={(e) => setInventoryConfig({ ...inventoryConfig, unitCostField: e.target.value })} placeholder="unit_cost" size="sm" />
              <Select label="Movement Type" value={inventoryConfig.movementType} onChange={(e) => setInventoryConfig({ ...inventoryConfig, movementType: e.target.value })} options={[{ label: 'Receipt (IN)', value: 'RECEIPT' }, { label: 'Issue (OUT)', value: 'ISSUE' }]} />
            </div>
          </div>
        )}

        {/* CRM Log Config */}
        {formData.impactType === 'CRM_LOG' && (
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
            <h4 className="text-xs font-semibold text-purple-800">CRM Activity Log Config</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Customer Field" value={crmConfig.customerField} onChange={(e) => setCrmConfig({ ...crmConfig, customerField: e.target.value })} placeholder="customer_id" size="sm" />
              <Input label="Activity Type" value={crmConfig.activityType} onChange={(e) => setCrmConfig({ ...crmConfig, activityType: e.target.value })} placeholder="SALE" size="sm" />
            </div>
            <Input label="Description Template" value={crmConfig.descriptionTemplate} onChange={(e) => setCrmConfig({ ...crmConfig, descriptionTemplate: e.target.value })} placeholder="Sale {{invoice_number}} for {{total_amount}}" size="sm" />
          </div>
        )}

        {/* Record Create Config */}
        {formData.impactType === 'RECORD_CREATE' && (
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 space-y-3">
            <h4 className="text-xs font-semibold text-indigo-800">Create Record Config</h4>
            <Input label="Target Table" value={recordCreateConfig.targetTable} onChange={(e) => setRecordCreateConfig({ ...recordCreateConfig, targetTable: e.target.value })} placeholder="delivery_notes" size="sm" />
            <div className="space-y-2">
              <p className="text-xs text-surface-600">Field Mapping:</p>
              {recordCreateConfig.fieldMapping.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <Input value={m.targetField} onChange={(e) => { const u = [...recordCreateConfig.fieldMapping]; u[i] = { ...u[i], targetField: e.target.value }; setRecordCreateConfig({ ...recordCreateConfig, fieldMapping: u }); }} placeholder="Target Field" size="sm" />
                  <Input value={m.sourceFieldOrValue} onChange={(e) => { const u = [...recordCreateConfig.fieldMapping]; u[i] = { ...u[i], sourceFieldOrValue: e.target.value }; setRecordCreateConfig({ ...recordCreateConfig, fieldMapping: u }); }} placeholder="Source Field or Value" size="sm" />
                  <button onClick={() => setRecordCreateConfig({ ...recordCreateConfig, fieldMapping: recordCreateConfig.fieldMapping.filter((_, idx) => idx !== i) })} className="p-1 text-surface-400 hover:text-danger-500"><TrashIcon className="h-4 w-4" /></button>
                </div>
              ))}
              <Button variant="secondary" size="xs" onClick={() => setRecordCreateConfig({ ...recordCreateConfig, fieldMapping: [...recordCreateConfig.fieldMapping, { targetField: '', sourceFieldOrValue: '' }] })} leftIcon={<PlusIcon className="h-3 w-3" />}>Add Mapping</Button>
            </div>
          </div>
        )}

        {/* Webhook Config */}
        {formData.impactType === 'WEBHOOK' && (
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 space-y-3">
            <h4 className="text-xs font-semibold text-orange-800">Webhook Config</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input label="URL" value={webhookConfig.url} onChange={(e) => setWebhookConfig({ ...webhookConfig, url: e.target.value })} placeholder="https://api.example.com/hooks/..." size="sm" />
              <Select label="Method" value={webhookConfig.method} onChange={(e) => setWebhookConfig({ ...webhookConfig, method: e.target.value })} options={[{ label: 'POST', value: 'POST' }, { label: 'PUT', value: 'PUT' }, { label: 'PATCH', value: 'PATCH' }]} />
            </div>
            <Input label="Headers (JSON)" value={webhookConfig.headers} onChange={(e) => setWebhookConfig({ ...webhookConfig, headers: e.target.value })} placeholder='{"Authorization": "Bearer ..."}' size="sm" />
            <Textarea label="Body Template" value={webhookConfig.bodyTemplate} onChange={(e) => setWebhookConfig({ ...webhookConfig, bodyTemplate: e.target.value })} placeholder='{"event": "invoice_posted", "data": {{record}}}' />
          </div>
        )}

        {/* Field Update Config */}
        {formData.impactType === 'FIELD_UPDATE' && (
          <div className="p-3 bg-teal-50 rounded-lg border border-teal-200 space-y-3">
            <h4 className="text-xs font-semibold text-teal-800">Field Update Config</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Target Table" value={fieldUpdateConfig.targetTable} onChange={(e) => setFieldUpdateConfig({ ...fieldUpdateConfig, targetTable: e.target.value })} placeholder="Same or another table" size="sm" />
              <Input label="Target Record Field" value={fieldUpdateConfig.targetRecordField} onChange={(e) => setFieldUpdateConfig({ ...fieldUpdateConfig, targetRecordField: e.target.value })} placeholder="parent_order_id" size="sm" hint="Field linking to target record" />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-surface-600">Updates:</p>
              {fieldUpdateConfig.updates.map((u, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <Input value={u.field} onChange={(e) => { const arr = [...fieldUpdateConfig.updates]; arr[i] = { ...arr[i], field: e.target.value }; setFieldUpdateConfig({ ...fieldUpdateConfig, updates: arr }); }} placeholder="Field to update" size="sm" />
                  <Input value={u.valueOrExpression} onChange={(e) => { const arr = [...fieldUpdateConfig.updates]; arr[i] = { ...arr[i], valueOrExpression: e.target.value }; setFieldUpdateConfig({ ...fieldUpdateConfig, updates: arr }); }} placeholder="Value or expression" size="sm" />
                  <button onClick={() => setFieldUpdateConfig({ ...fieldUpdateConfig, updates: fieldUpdateConfig.updates.filter((_, idx) => idx !== i) })} className="p-1 text-surface-400 hover:text-danger-500"><TrashIcon className="h-4 w-4" /></button>
                </div>
              ))}
              <Button variant="secondary" size="xs" onClick={() => setFieldUpdateConfig({ ...fieldUpdateConfig, updates: [...fieldUpdateConfig.updates, { field: '', valueOrExpression: '' }] })} leftIcon={<PlusIcon className="h-3 w-3" />}>Add Update</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ImpactRulesPage() {
  const [filterTable, setFilterTable] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<ImpactRuleType | null>(null);
  const [deleteRule, setDeleteRule] = useState<ImpactRuleType | null>(null);

  const { data: tables } = useDynamicTables();
  const { data: rules, isLoading } = useImpactRules(filterTable || undefined);
  const deleteRuleMut = useDeleteImpactRule();

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

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3">
        <Select
          value={filterTable}
          onChange={(e) => setFilterTable(e.target.value)}
          options={[
            { label: 'All Tables', value: '' },
            ...(tables?.map((t) => ({ label: t.label, value: t.name })) || []),
          ]}
        />
        <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => { setEditRule(null); setShowForm(true); }}>
          New Impact Rule
        </Button>
      </div>

      {/* Rules list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-surface-100 rounded-xl animate-pulse" />)}
        </div>
      ) : !rules?.length ? (
        <Card padding="lg" className="text-center">
          <BoltIcon className="h-12 w-12 text-surface-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-surface-700">No impact rules defined</h3>
          <p className="text-xs text-surface-400 mt-1 mb-4">
            Impact rules connect your custom screens to core engines — GL, Inventory, CRM, Webhooks, and more.
          </p>
          <Button onClick={() => { setEditRule(null); setShowForm(true); }} leftIcon={<PlusIcon className="h-4 w-4" />}>
            Create First Rule
          </Button>
        </Card>
      ) : (
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
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge size="sm" variant={rule.isActive ? 'success' : 'default'}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <button
                    onClick={() => { setEditRule(rule); setShowForm(true); }}
                    className="p-1 rounded text-surface-400 hover:text-primary-600 hover:bg-primary-50"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteRule(rule)}
                    className="p-1 rounded text-surface-400 hover:text-danger-600 hover:bg-danger-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {rule.description && (
                <p className="text-xs text-surface-400 mt-1 ml-12">{rule.description}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <ImpactRuleFormModal rule={editRule} open={showForm} onClose={() => { setShowForm(false); setEditRule(null); }} />
      <ConfirmModal
        open={!!deleteRule}
        onClose={() => setDeleteRule(null)}
        onConfirm={handleDelete}
        title="Delete Impact Rule"
        message={`Delete "${deleteRule?.ruleName}"? The connected automation will stop firing.`}
        confirmLabel="Delete"
        loading={deleteRuleMut.isPending}
      />
    </div>
  );
}
