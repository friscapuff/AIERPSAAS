'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckBadgeIcon,
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
  useValidationRules,
  useCreateValidationRule,
  useUpdateValidationRule,
  useDeleteValidationRule,
  type ValidationRuleType,
} from '@/hooks/useDynamicPlatform';
import { notify } from '@/components/ui/Toast';

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

const RULE_TYPES = [
  { label: 'Field Validation', value: 'FIELD' },
  { label: 'Cross-Field', value: 'CROSS_FIELD' },
  { label: 'Expression', value: 'EXPRESSION' },
  { label: 'Unique Combination', value: 'UNIQUE_COMBO' },
];

const APPLIES_ON = [
  { label: 'Both Create & Update', value: 'BOTH' },
  { label: 'Create Only', value: 'CREATE' },
  { label: 'Update Only', value: 'UPDATE' },
];

const FIELD_OPERATORS = [
  { label: 'Required', value: 'REQUIRED' },
  { label: 'Min Value', value: 'MIN' },
  { label: 'Max Value', value: 'MAX' },
  { label: 'Min Length', value: 'MIN_LENGTH' },
  { label: 'Max Length', value: 'MAX_LENGTH' },
  { label: 'Regex Pattern', value: 'REGEX' },
  { label: 'In List', value: 'IN' },
  { label: 'Not In List', value: 'NOT_IN' },
  { label: 'Between', value: 'BETWEEN' },
];

const CROSS_FIELD_OPERATORS = [
  { label: 'Equals', value: 'EQUALS' },
  { label: 'Not Equals', value: 'NOT_EQUALS' },
  { label: 'Greater Than', value: 'GREATER_THAN' },
  { label: 'Less Than', value: 'LESS_THAN' },
  { label: 'Before Date', value: 'BEFORE_DATE' },
  { label: 'After Date', value: 'AFTER_DATE' },
];

const RULE_TYPE_COLORS: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  FIELD: 'info',
  CROSS_FIELD: 'warning',
  EXPRESSION: 'success',
  UNIQUE_COMBO: 'default',
};

// ─── Validation Rule Form ────────────────────────────────────────────────────
function ValidationRuleFormModal({
  rule,
  open,
  onClose,
}: {
  rule: ValidationRuleType | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: tables } = useDynamicTables();
  const createRule = useCreateValidationRule();
  const updateRule = useUpdateValidationRule();

  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    ruleName: '',
    description: '',
    ruleType: 'FIELD' as string,
    appliesOn: 'BOTH',
    isActive: true,
    priority: 0,
  });

  // Config depending on rule type
  const [fieldConfig, setFieldConfig] = useState({ fieldName: '', operator: 'REQUIRED', value: '', errorMessage: '' });
  const [crossFieldConfig, setCrossFieldConfig] = useState({ fieldName: '', operator: 'EQUALS', compareField: '', errorMessage: '' });
  const [expressionConfig, setExpressionConfig] = useState({ expression: '', errorMessage: '' });
  const [uniqueComboConfig, setUniqueComboConfig] = useState({ fields: [''], errorMessage: '' });

  const allFields = useMemo(() => {
    if (!tables || selectedTables.length === 0) return [];
    return selectedTables.flatMap((tName) => {
      const tbl = tables.find((t) => t.name === tName);
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
        ruleType: rule.ruleType,
        appliesOn: rule.appliesOn,
        isActive: rule.isActive,
        priority: rule.priority,
      });
      // Set config based on type
      const cfg = rule.config || {};
      if (rule.ruleType === 'FIELD') {
        setFieldConfig({ fieldName: cfg.fieldName || '', operator: cfg.operator || 'REQUIRED', value: String(cfg.value ?? ''), errorMessage: cfg.errorMessage || '' });
      } else if (rule.ruleType === 'CROSS_FIELD') {
        setCrossFieldConfig({ fieldName: cfg.fieldName || '', operator: cfg.operator || 'EQUALS', compareField: cfg.compareField || '', errorMessage: cfg.errorMessage || '' });
      } else if (rule.ruleType === 'EXPRESSION') {
        setExpressionConfig({ expression: cfg.expression || '', errorMessage: cfg.errorMessage || '' });
      } else if (rule.ruleType === 'UNIQUE_COMBO') {
        setUniqueComboConfig({ fields: cfg.fields?.length ? cfg.fields : [''], errorMessage: cfg.errorMessage || '' });
      }
    } else {
      setSelectedTables([]);
      setFormData({ ruleName: '', description: '', ruleType: 'FIELD', appliesOn: 'BOTH', isActive: true, priority: 0 });
      setFieldConfig({ fieldName: '', operator: 'REQUIRED', value: '', errorMessage: '' });
      setCrossFieldConfig({ fieldName: '', operator: 'EQUALS', compareField: '', errorMessage: '' });
      setExpressionConfig({ expression: '', errorMessage: '' });
      setUniqueComboConfig({ fields: [''], errorMessage: '' });
    }
  }, [rule, open]);

  const getConfig = () => {
    switch (formData.ruleType) {
      case 'FIELD': return { ...fieldConfig, value: fieldConfig.value || undefined };
      case 'CROSS_FIELD': return crossFieldConfig;
      case 'EXPRESSION': return expressionConfig;
      case 'UNIQUE_COMBO': return { ...uniqueComboConfig, fields: uniqueComboConfig.fields.filter(Boolean) };
      default: return {};
    }
  };

  const handleSubmit = async () => {
    const tableName = selectedTables[0] || '';
    if (!tableName || !formData.ruleName) {
      notify.error('Table and rule name are required.');
      return;
    }
    const config = getConfig();
    if (!config.errorMessage) {
      notify.error('Error message is required.');
      return;
    }

    const payload = {
      table_name: tableName,
      tableName: tableName,
      rule_name: formData.ruleName,
      ruleName: formData.ruleName,
      description: formData.description || null,
      rule_type: formData.ruleType,
      ruleType: formData.ruleType,
      applies_on: formData.appliesOn,
      appliesOn: formData.appliesOn,
      is_active: formData.isActive,
      isActive: formData.isActive,
      priority: formData.priority,
      config,
    };

    try {
      if (rule) {
        await updateRule.mutateAsync({ id: rule.id, ...payload });
        notify.success('Validation rule updated.');
      } else {
        await createRule.mutateAsync(payload);
        notify.success('Validation rule created.');
      }
      onClose();
    } catch (err: any) {
      notify.error(err?.message || 'Failed to save validation rule.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rule ? 'Edit Validation Rule' : 'Create Validation Rule'}
      description="Define data quality rules for your table records"
      size="lg"
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
            allTables={tables?.map((t) => ({ name: t.name, label: t.label })) || []}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Rule Name"
              value={formData.ruleName}
              onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
              placeholder="Amount must be positive"
              required
            />
            <Select
              label="Rule Type"
              value={formData.ruleType}
              onChange={(e) => setFormData({ ...formData, ruleType: e.target.value })}
              options={RULE_TYPES}
            />
            <Select
              label="Applies On"
              value={formData.appliesOn}
              onChange={(e) => setFormData({ ...formData, appliesOn: e.target.value })}
              options={APPLIES_ON}
            />
          </div>
        </div>

        {/* Config — Field */}
        {formData.ruleType === 'FIELD' && (
          <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-xs font-semibold text-blue-800">Field Validation Config</h4>
            <div className="grid grid-cols-2 gap-3">
              <FieldSelect
                label="Field Name"
                value={fieldConfig.fieldName}
                onChange={(v) => setFieldConfig({ ...fieldConfig, fieldName: v })}
                allFields={allFields}
              />
              <Select
                label="Operator"
                value={fieldConfig.operator}
                onChange={(e) => setFieldConfig({ ...fieldConfig, operator: e.target.value })}
                options={FIELD_OPERATORS}
              />
              {fieldConfig.operator !== 'REQUIRED' && (
                <Input
                  label="Value"
                  value={fieldConfig.value}
                  onChange={(e) => setFieldConfig({ ...fieldConfig, value: e.target.value })}
                  placeholder="e.g., 0, 100, ^[A-Z]+"
                  hint={fieldConfig.operator === 'BETWEEN' ? 'Comma-separated: min,max' : undefined}
                />
              )}
              <Input
                label="Error Message"
                value={fieldConfig.errorMessage}
                onChange={(e) => setFieldConfig({ ...fieldConfig, errorMessage: e.target.value })}
                placeholder="Amount is required"
                required
              />
            </div>
          </div>
        )}

        {/* Config — Cross-Field */}
        {formData.ruleType === 'CROSS_FIELD' && (
          <div className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="text-xs font-semibold text-amber-800">Cross-Field Validation Config</h4>
            <div className="grid grid-cols-2 gap-3">
              <FieldSelect
                label="Field Name"
                value={crossFieldConfig.fieldName}
                onChange={(v) => setCrossFieldConfig({ ...crossFieldConfig, fieldName: v })}
                allFields={allFields}
              />
              <Select
                label="Operator"
                value={crossFieldConfig.operator}
                onChange={(e) => setCrossFieldConfig({ ...crossFieldConfig, operator: e.target.value })}
                options={CROSS_FIELD_OPERATORS}
              />
              <FieldSelect
                label="Compare Field"
                value={crossFieldConfig.compareField}
                onChange={(v) => setCrossFieldConfig({ ...crossFieldConfig, compareField: v })}
                allFields={allFields}
              />
              <Input
                label="Error Message"
                value={crossFieldConfig.errorMessage}
                onChange={(e) => setCrossFieldConfig({ ...crossFieldConfig, errorMessage: e.target.value })}
                placeholder="End date must be after start date"
                required
              />
            </div>
          </div>
        )}

        {/* Config — Expression */}
        {formData.ruleType === 'EXPRESSION' && (
          <div className="space-y-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-xs font-semibold text-green-800">Expression Validation Config</h4>
            <Textarea
              label="Expression"
              value={expressionConfig.expression}
              onChange={(e) => setExpressionConfig({ ...expressionConfig, expression: e.target.value })}
              placeholder="quantity * unit_price == total_amount"
              hint="Use field names as variables. Must evaluate to true for record to pass."
              required
            />
            <Input
              label="Error Message"
              value={expressionConfig.errorMessage}
              onChange={(e) => setExpressionConfig({ ...expressionConfig, errorMessage: e.target.value })}
              placeholder="Line total doesn't match (qty × price)"
              required
            />
          </div>
        )}

        {/* Config — Unique Combo */}
        {formData.ruleType === 'UNIQUE_COMBO' && (
          <div className="space-y-3 p-3 bg-surface-50 rounded-lg border border-surface-200">
            <h4 className="text-xs font-semibold text-surface-800">Unique Combination Config</h4>
            <div className="space-y-2">
              {uniqueComboConfig.fields.map((field, i) => (
                <div key={i} className="flex items-center gap-2">
                  <FieldSelect
                    value={field}
                    onChange={(v) => {
                      const updated = [...uniqueComboConfig.fields];
                      updated[i] = v;
                      setUniqueComboConfig({ ...uniqueComboConfig, fields: updated });
                    }}
                    allFields={allFields}
                  />
                  {uniqueComboConfig.fields.length > 1 && (
                    <button
                      onClick={() => setUniqueComboConfig({ ...uniqueComboConfig, fields: uniqueComboConfig.fields.filter((_, idx) => idx !== i) })}
                      className="text-surface-400 hover:text-danger-500"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setUniqueComboConfig({ ...uniqueComboConfig, fields: [...uniqueComboConfig.fields, ''] })}
                leftIcon={<PlusIcon className="h-3 w-3" />}
              >
                Add Field
              </Button>
            </div>
            <Input
              label="Error Message"
              value={uniqueComboConfig.errorMessage}
              onChange={(e) => setUniqueComboConfig({ ...uniqueComboConfig, errorMessage: e.target.value })}
              placeholder="This combination already exists"
              required
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ValidationsPage() {
  const [filterTable, setFilterTable] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<ValidationRuleType | null>(null);
  const [deleteRule, setDeleteRule] = useState<ValidationRuleType | null>(null);

  const { data: tables } = useDynamicTables();
  const { data: rules, isLoading } = useValidationRules(filterTable || undefined);
  const deleteRuleMut = useDeleteValidationRule();

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

  const getConfigSummary = (rule: ValidationRuleType) => {
    const cfg = rule.config || {};
    switch (rule.ruleType) {
      case 'FIELD': return `${cfg.fieldName} ${cfg.operator}${cfg.value ? ` ${cfg.value}` : ''}`;
      case 'CROSS_FIELD': return `${cfg.fieldName} ${cfg.operator} ${cfg.compareField}`;
      case 'EXPRESSION': return cfg.expression?.slice(0, 40) + (cfg.expression?.length > 40 ? '…' : '');
      case 'UNIQUE_COMBO': return `Unique: [${cfg.fields?.join(', ')}]`;
      default: return '';
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
          New Validation Rule
        </Button>
      </div>

      {/* Rules list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-100 rounded-xl animate-pulse" />)}
        </div>
      ) : !rules?.length ? (
        <Card padding="lg" className="text-center">
          <CheckBadgeIcon className="h-12 w-12 text-surface-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-surface-700">No validation rules defined</h3>
          <p className="text-xs text-surface-400 mt-1 mb-4">
            Add data quality rules to ensure records meet your business requirements.
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
                  <div className="h-9 w-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <CheckBadgeIcon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-surface-900">{rule.ruleName}</h3>
                    <p className="text-xs text-surface-500">
                      <span className="font-medium">{rule.tableName}</span>
                      {' · '}
                      <Badge size="sm" variant={RULE_TYPE_COLORS[rule.ruleType] || 'default'}>{rule.ruleType}</Badge>
                      {' · '}
                      <span className="text-surface-400">{getConfigSummary(rule)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge size="sm" variant={rule.isActive ? 'success' : 'default'}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge size="sm" variant="default">{rule.appliesOn}</Badge>
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
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <ValidationRuleFormModal rule={editRule} open={showForm} onClose={() => { setShowForm(false); setEditRule(null); }} />
      <ConfirmModal
        open={!!deleteRule}
        onClose={() => setDeleteRule(null)}
        onConfirm={handleDelete}
        title="Delete Validation Rule"
        message={`Delete "${deleteRule?.ruleName}"? Records will no longer be validated against this rule.`}
        confirmLabel="Delete"
        loading={deleteRuleMut.isPending}
      />
    </div>
  );
}
