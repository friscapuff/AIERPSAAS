'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  ComputerDesktopIcon,
  SparklesIcon,
  EyeIcon,
  ArrowUpOnSquareIcon,
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
  useScreens,
  useCreateScreen,
  useUpdateScreen,
  usePublishScreen,
  useAutoGenerateScreen,
  useDeleteScreen,
  type ScreenDefinition,
} from '@/hooks/useDynamicPlatform';
import { notify } from '@/components/ui/Toast';
import Link from 'next/link';

const SCREEN_TYPES = [
  { label: 'Form & List', value: 'FORM_LIST' },
  { label: 'Form Only', value: 'FORM' },
  { label: 'List Only', value: 'LIST' },
];

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'default'> = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'default',
};

/* ─── FieldSelect: dropdown populated from selected tables' fields + "Add New" ─── */
function FieldSelect({
  value,
  onChange,
  allFields,
  label,
  size = 'sm',
}: {
  value: string;
  onChange: (val: string) => void;
  allFields: { value: string; label: string; table: string }[];
  label?: string;
  size?: 'sm' | 'md';
}) {
  const [showNew, setShowNew] = useState(false);
  const [newVal, setNewVal] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__ADD_NEW__') {
      setShowNew(true);
    } else {
      onChange(e.target.value);
    }
  };

  const handleAddNew = () => {
    if (newVal.trim()) {
      onChange(newVal.trim());
      setShowNew(false);
      setNewVal('');
    }
  };

  if (showNew) {
    return (
      <div className="space-y-1">
        {label && <label className="block text-xs font-medium text-surface-700">{label}</label>}
        <div className="flex gap-1 items-center">
          <input
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            placeholder="new_field_name"
            className="flex-1 rounded-md border border-surface-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
          />
          <button onClick={handleAddNew} className="px-2 py-1.5 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700">OK</button>
          <button onClick={() => { setShowNew(false); setNewVal(''); }} className="px-2 py-1.5 bg-surface-200 text-surface-600 rounded text-xs hover:bg-surface-300">X</button>
        </div>
      </div>
    );
  }

  /* Group fields by table for nicer display */
  const grouped = allFields.reduce<Record<string, typeof allFields>>((acc, f) => {
    (acc[f.table] = acc[f.table] || []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-medium text-surface-700">{label}</label>}
      <select
        value={value}
        onChange={handleChange}
        className="w-full rounded-md border border-surface-300 px-2 py-1.5 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      >
        <option value="">— Select Field —</option>
        {Object.entries(grouped).map(([tableName, fields]) => (
          <optgroup key={tableName} label={tableName}>
            {fields.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </optgroup>
        ))}
        <option value="__ADD_NEW__">+ Add New Field</option>
      </select>
    </div>
  );
}

/* ─── MultiTableSelector: pick multiple tables with chips ─── */
function MultiTableSelector({
  selectedTables,
  onAdd,
  onRemove,
  allTables,
}: {
  selectedTables: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  allTables: { name: string; label: string }[];
}) {
  const [addValue, setAddValue] = useState('');
  const available = allTables.filter((t) => !selectedTables.includes(t.name));

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-surface-700">Selected Tables *</label>
      <div className="flex flex-wrap gap-2 min-h-[36px] p-2 border border-surface-200 rounded-lg bg-surface-50">
        {selectedTables.length === 0 && (
          <span className="text-xs text-surface-400 italic">No tables selected — add at least one below</span>
        )}
        {selectedTables.map((name) => {
          const tbl = allTables.find((t) => t.name === name);
          return (
            <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
              <TableCellsIcon className="h-3.5 w-3.5" />
              {tbl?.label || name}
              <button onClick={() => onRemove(name)} className="hover:text-danger-600">
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          );
        })}
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <select
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            className="w-full rounded-md border border-surface-300 px-2 py-1.5 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">— Add a Table —</option>
            {available.map((t) => (
              <option key={t.name} value={t.name}>{t.label}</option>
            ))}
          </select>
        </div>
        <Button
          variant="secondary"
          size="xs"
          leftIcon={<PlusIcon className="h-3.5 w-3.5" />}
          onClick={() => { if (addValue) { onAdd(addValue); setAddValue(''); } }}
          disabled={!addValue}
        >
          Add Table
        </Button>
      </div>
    </div>
  );
}

/* ─── Screen Form Modal ─── */
function ScreenFormModal({
  screen,
  open,
  onClose,
}: {
  screen: ScreenDefinition | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: tables } = useDynamicTables();
  const createScreen = useCreateScreen();
  const updateScreen = useUpdateScreen();

  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    screenName: '',
    displayName: '',
    description: '',
    screenType: 'FORM_LIST',
    icon: '',
  });

  const [columns, setColumns] = useState<any[]>([]);
  const [formSections, setFormSections] = useState<any[]>([{ title: 'General', fields: [] }]);
  const [actions, setActions] = useState<any[]>([
    { label: 'Create', action: 'create', variant: 'primary' },
    { label: 'Edit', action: 'edit', variant: 'secondary' },
    { label: 'Delete', action: 'delete', variant: 'danger' },
  ]);

  /* Aggregate fields from all selected tables */
  const allFields = useMemo(() => {
    if (!tables) return [];
    return selectedTables.flatMap((tName) => {
      const tbl = tables.find((t) => t.name === tName);
      if (!tbl) return [];
      return tbl.fields.map((f) => ({
        value: `${tName}.${f.name}`,
        label: f.label || f.name,
        table: tbl.label || tName,
      }));
    });
  }, [tables, selectedTables]);

  useEffect(() => {
    if (screen) {
      const tNames = screen.layout?.tableNames || [screen.tableName];
      setSelectedTables(tNames);
      setFormData({
        screenName: screen.screenName,
        displayName: screen.displayName,
        description: screen.description || '',
        screenType: screen.screenType,
        icon: screen.icon || '',
      });
      setColumns(screen.layout?.columns || []);
      setFormSections(screen.layout?.formSections || [{ title: 'General', fields: [] }]);
      setActions(screen.layout?.actions || []);
    } else {
      setSelectedTables([]);
      setFormData({ screenName: '', displayName: '', description: '', screenType: 'FORM_LIST', icon: '' });
      setColumns([]);
      setFormSections([{ title: 'General', fields: [] }]);
      setActions([
        { label: 'Create', action: 'create', variant: 'primary' },
        { label: 'Edit', action: 'edit', variant: 'secondary' },
        { label: 'Delete', action: 'delete', variant: 'danger' },
      ]);
    }
  }, [screen, open]);

  const handleAutoPopulate = () => {
    if (selectedTables.length === 0 || !tables) return;
    const cols: any[] = [];
    const flds: any[] = [];
    selectedTables.forEach((tName) => {
      const tbl = tables.find((t) => t.name === tName);
      if (!tbl) return;
      tbl.fields.forEach((f) => {
        const fieldKey = `${tName}.${f.name}`;
        const fieldLabel = `${f.label || f.name} (${tbl.label})`;
        cols.push({ fieldName: fieldKey, label: fieldLabel, sortable: true, filterable: true, visible: true });
        flds.push({
          fieldName: fieldKey,
          label: fieldLabel,
          inputType: f.type === 'BOOLEAN' ? 'checkbox' : f.type === 'TEXTAREA' ? 'textarea' : f.type === 'SELECT' ? 'select' : f.type === 'DATE' || f.type === 'DATETIME' ? 'date' : f.type === 'NUMBER' || f.type === 'DECIMAL' ? 'number' : 'text',
          span: f.type === 'TEXTAREA' ? 2 : 1,
          readOnly: false,
        });
      });
    });
    setColumns(cols);
    setFormSections([{ title: 'General', fields: flds }]);
    notify.success('Auto-populated fields from all selected tables.');
  };

  const handleSubmit = async () => {
    if (selectedTables.length === 0 || !formData.screenName || !formData.displayName) {
      notify.error('At least one table, screen name, and display name are required.');
      return;
    }
    const payload = {
      ...formData,
      screen_name: formData.screenName,
      table_name: selectedTables[0],
      tableName: selectedTables[0],
      display_name: formData.displayName,
      screen_type: formData.screenType,
      layout: {
        tableNames: selectedTables,
        columns,
        formSections,
        actions,
        headerFields: columns.slice(0, 3).map((c: any) => c.fieldName),
        defaultSort: { field: columns[0]?.fieldName || 'created_at', direction: 'DESC' },
        pageSize: 20,
      },
    };
    try {
      if (screen) {
        await updateScreen.mutateAsync({ id: screen.id, ...payload });
        notify.success('Screen updated.');
      } else {
        await createScreen.mutateAsync(payload);
        notify.success('Screen created.');
      }
      onClose();
    } catch (err: any) {
      notify.error(err?.message || 'Failed to save screen.');
    }
  };

  const addTable = (name: string) => setSelectedTables((prev) => [...prev, name]);
  const removeTable = (name: string) => setSelectedTables((prev) => prev.filter((t) => t !== name));

  const addColumn = () => setColumns([...columns, { fieldName: '', label: '', sortable: true, filterable: true, visible: true }]);
  const removeColumn = (i: number) => setColumns(columns.filter((_, idx) => idx !== i));
  const updateColumn = (i: number, key: string, val: any) => setColumns(columns.map((c, idx) => (idx === i ? { ...c, [key]: val } : c)));

  const addFormField = (sectionIdx: number) => { const updated = [...formSections]; updated[sectionIdx].fields.push({ fieldName: '', label: '', inputType: 'text', span: 1, readOnly: false }); setFormSections(updated); };
  const removeFormField = (sectionIdx: number, fieldIdx: number) => { const updated = [...formSections]; updated[sectionIdx].fields = updated[sectionIdx].fields.filter((_: any, i: number) => i !== fieldIdx); setFormSections(updated); };
  const updateFormField = (sectionIdx: number, fieldIdx: number, key: string, val: any) => { const updated = [...formSections]; updated[sectionIdx].fields[fieldIdx] = { ...updated[sectionIdx].fields[fieldIdx], [key]: val }; setFormSections(updated); };
  const addSection = () => setFormSections([...formSections, { title: '', fields: [] }]);

  return (
    <Modal open={open} onClose={onClose} title={screen ? 'Edit Screen' : 'Create Screen'} description="Define how users will interact with these tables" size="xl" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit} loading={createScreen.isPending || updateScreen.isPending}>{screen ? 'Save Changes' : 'Create Screen'}</Button></>}>
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* Tables Selection (Multi) */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-surface-800">Tables & Basic Info</h4>
          <MultiTableSelector
            selectedTables={selectedTables}
            onAdd={addTable}
            onRemove={removeTable}
            allTables={tables?.map((t) => ({ name: t.name, label: t.label })) || []}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Screen Type" value={formData.screenType} onChange={(e) => setFormData({ ...formData, screenType: e.target.value })} options={SCREEN_TYPES} />
            <Input label="Screen Name (internal)" value={formData.screenName} onChange={(e) => setFormData({ ...formData, screenName: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="sales_invoices_screen" required disabled={!!screen} />
            <Input label="Display Name" value={formData.displayName} onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} placeholder="Sales Invoices" required />
            <Input label="Icon (optional)" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="receipt" />
          </div>
          <Textarea label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What is this screen for?" />
          {selectedTables.length > 0 && !screen && (
            <Button variant="secondary" size="sm" leftIcon={<SparklesIcon className="h-4 w-4" />} onClick={handleAutoPopulate}>
              Auto-populate from Selected Tables
            </Button>
          )}
        </div>

        {/* List Columns */}
        {(formData.screenType === 'LIST' || formData.screenType === 'FORM_LIST') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-surface-800">List Columns</h4>
              <Button variant="secondary" size="xs" leftIcon={<PlusIcon className="h-3.5 w-3.5" />} onClick={addColumn}>Add Column</Button>
            </div>
            {columns.map((col, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-end p-2 bg-surface-50 rounded-lg border border-surface-200">
                <FieldSelect
                  label="Field"
                  value={col.fieldName}
                  onChange={(val) => {
                    updateColumn(i, 'fieldName', val);
                    if (!col.label) {
                      const f = allFields.find((af) => af.value === val);
                      if (f) updateColumn(i, 'label', f.label);
                    }
                  }}
                  allFields={allFields}
                />
                <Input label="Label" value={col.label} onChange={(e) => updateColumn(i, 'label', e.target.value)} placeholder="Column Label" size="sm" />
                <label className="flex items-center gap-1 text-xs text-surface-600 mb-1"><input type="checkbox" checked={col.sortable} onChange={(e) => updateColumn(i, 'sortable', e.target.checked)} className="rounded" />Sort</label>
                <label className="flex items-center gap-1 text-xs text-surface-600 mb-1"><input type="checkbox" checked={col.filterable} onChange={(e) => updateColumn(i, 'filterable', e.target.checked)} className="rounded" />Filter</label>
                <button onClick={() => removeColumn(i)} className="p-1 text-surface-400 hover:text-danger-500"><TrashIcon className="h-4 w-4" /></button>
              </div>
            ))}
            {columns.length === 0 && <p className="text-xs text-surface-400 italic">No columns defined. Click &quot;Auto-populate&quot; or add manually.</p>}
          </div>
        )}

        {/* Form Sections */}
        {(formData.screenType === 'FORM' || formData.screenType === 'FORM_LIST') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-surface-800">Form Sections</h4>
              <Button variant="secondary" size="xs" leftIcon={<PlusIcon className="h-3.5 w-3.5" />} onClick={addSection}>Add Section</Button>
            </div>
            {formSections.map((section, si) => (
              <div key={si} className="border border-surface-200 rounded-lg p-3 space-y-2">
                <Input label="Section Title" value={section.title} onChange={(e) => { const updated = [...formSections]; updated[si].title = e.target.value; setFormSections(updated); }} placeholder="Section Name" size="sm" />
                {section.fields.map((field: any, fi: number) => (
                  <div key={fi} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-2 bg-surface-50 rounded">
                    <FieldSelect
                      label="Field"
                      value={field.fieldName}
                      onChange={(val) => {
                        updateFormField(si, fi, 'fieldName', val);
                        if (!field.label) {
                          const f = allFields.find((af) => af.value === val);
                          if (f) updateFormField(si, fi, 'label', f.label);
                        }
                      }}
                      allFields={allFields}
                    />
                    <Input label="Label" value={field.label} onChange={(e) => updateFormField(si, fi, 'label', e.target.value)} size="sm" />
                    <Select label="Input Type" value={field.inputType} onChange={(e) => updateFormField(si, fi, 'inputType', e.target.value)} options={[{ label: 'Text', value: 'text' }, { label: 'Number', value: 'number' }, { label: 'Textarea', value: 'textarea' }, { label: 'Date', value: 'date' }, { label: 'Select', value: 'select' }, { label: 'Checkbox', value: 'checkbox' }, { label: 'Email', value: 'email' }]} size="sm" />
                    <button onClick={() => removeFormField(si, fi)} className="p-1 text-surface-400 hover:text-danger-500"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                ))}
                <Button variant="secondary" size="xs" onClick={() => addFormField(si)} leftIcon={<PlusIcon className="h-3 w-3" />}>Add Field</Button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-surface-800">Actions</h4>
          <div className="flex flex-wrap gap-2">
            {actions.map((action, i) => (
              <div key={i} className="flex items-center gap-1 px-2 py-1 bg-surface-50 border border-surface-200 rounded text-xs">
                <span className="font-medium">{action.label}</span>
                <span className="text-surface-400">({action.action})</span>
                <button onClick={() => setActions(actions.filter((_, idx) => idx !== i))} className="ml-1 text-surface-400 hover:text-danger-500">&times;</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Main Page ─── */
export default function ScreensPage() {
  const [filterTable, setFilterTable] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editScreen, setEditScreen] = useState<ScreenDefinition | null>(null);
  const [deleteScreen, setDeleteScreen] = useState<ScreenDefinition | null>(null);

  const { data: tables } = useDynamicTables();
  const { data: screens, isLoading } = useScreens(filterTable || undefined);
  const publishScreen = usePublishScreen();
  const autoGenerate = useAutoGenerateScreen();
  const deleteScreenMut = useDeleteScreen();

  const handlePublish = async (id: string) => { try { await publishScreen.mutateAsync(id); notify.success('Screen published.'); } catch { notify.error('Failed to publish screen.'); } };
  const handleAutoGenerate = async (tableName: string) => { try { await autoGenerate.mutateAsync(tableName); notify.success(`Screen auto-generated for "${tableName}".`); } catch { notify.error('Failed to auto-generate screen.'); } };
  const handleDelete = async () => { if (!deleteScreen) return; try { await deleteScreenMut.mutateAsync(deleteScreen.id); notify.success('Screen deleted.'); setDeleteScreen(null); } catch { notify.error('Failed to delete screen.'); } };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={filterTable} onChange={(e) => setFilterTable(e.target.value)} options={[{ label: 'All Tables', value: '' }, ...(tables?.map((t) => ({ label: t.label, value: t.name })) || [])]} />
        <div className="flex gap-2">
          {filterTable && (<Button variant="secondary" leftIcon={<SparklesIcon className="h-4 w-4" />} onClick={() => handleAutoGenerate(filterTable)}>Auto-Generate</Button>)}
          <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => { setEditScreen(null); setShowForm(true); }}>New Screen</Button>
        </div>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="h-36 bg-surface-100 rounded-xl animate-pulse" />)}</div>
      ) : !screens?.length ? (
        <Card padding="lg" className="text-center"><ComputerDesktopIcon className="h-12 w-12 text-surface-300 mx-auto mb-3" /><h3 className="text-sm font-semibold text-surface-700">No screens defined</h3><p className="text-xs text-surface-400 mt-1 mb-4">Create a screen to give end users a UI for interacting with your custom tables.</p><Button onClick={() => { setEditScreen(null); setShowForm(true); }} leftIcon={<PlusIcon className="h-4 w-4" />}>Create First Screen</Button></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {screens.map((s) => (
            <Card key={s.id} padding="md" className="group">
              <div className="flex items-start justify-between mb-3"><div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center"><ComputerDesktopIcon className="h-5 w-5 text-indigo-600" /></div><Badge variant={STATUS_COLORS[s.status] || 'default'} size="sm">{s.status}</Badge></div>
              <h3 className="text-sm font-semibold text-surface-900 mb-0.5">{s.displayName}</h3>
              <p className="text-xs text-surface-500 mb-1">Tables: <span className="font-medium">{s.layout?.tableNames?.join(', ') || s.tableName}</span></p>
              <p className="text-xs text-surface-500 mb-2">Type: {s.screenType}</p>
              {s.description && <p className="text-xs text-surface-400 mb-3 line-clamp-2">{s.description}</p>}
              <div className="flex items-center gap-2 pt-2 border-t border-surface-100">
                <Link href={`/dynamic-builder/render/${s.screenName}`}><Button variant="secondary" size="xs" leftIcon={<EyeIcon className="h-3.5 w-3.5" />}>Preview</Button></Link>
                {s.status === 'DRAFT' && <Button variant="secondary" size="xs" leftIcon={<ArrowUpOnSquareIcon className="h-3.5 w-3.5" />} onClick={() => handlePublish(s.id)}>Publish</Button>}
                <button onClick={() => { setEditScreen(s); setShowForm(true); }} className="p-1 rounded text-surface-400 hover:text-primary-600 hover:bg-primary-50"><PencilSquareIcon className="h-4 w-4" /></button>
                <button onClick={() => setDeleteScreen(s)} className="p-1 rounded text-surface-400 hover:text-danger-600 hover:bg-danger-50"><TrashIcon className="h-4 w-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ScreenFormModal screen={editScreen} open={showForm} onClose={() => { setShowForm(false); setEditScreen(null); }} />
      <ConfirmModal open={!!deleteScreen} onClose={() => setDeleteScreen(null)} onConfirm={handleDelete} title="Delete Screen" message={`Delete "${deleteScreen?.displayName}"? This cannot be undone.`} confirmLabel="Delete" loading={deleteScreenMut.isPending} />
    </div>
  );
}
