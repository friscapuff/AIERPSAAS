'use client';

import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  TableCellsIcon,
  TrashIcon,
  PencilSquareIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/FormField';
import {
  useDynamicTables,
  useDynamicRecords,
  useCreateTable,
  useDeleteTable,
  useUpdateTable,
  useCreateRecord,
  useDeleteRecord,
  useUpdateRecord,
  type DynamicTable,
  type FieldDefinition,
  type FieldType,
  type DynamicRecord,
} from '@/hooks/useDynamic';
import { notify } from '@/components/ui/Toast';
import { formatDate, cn } from '@/lib/utils';

// ─── Field type options ───────────────────────────────────────────────────────
const FIELD_TYPES: { label: string; value: FieldType }[] = [
  { label: 'Text', value: 'TEXT' },
  { label: 'Textarea', value: 'TEXTAREA' },
  { label: 'Number', value: 'NUMBER' },
  { label: 'Decimal', value: 'DECIMAL' },
  { label: 'Boolean', value: 'BOOLEAN' },
  { label: 'Date', value: 'DATE' },
  { label: 'Date & Time', value: 'DATETIME' },
  { label: 'Select', value: 'SELECT' },
  { label: 'Multi-Select', value: 'MULTI_SELECT' },
  { label: 'Lookup', value: 'LOOKUP' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'URL', value: 'URL' },
  { label: 'Phone', value: 'PHONE' },
  { label: 'File', value: 'FILE' },
];

// Ensure any backend-returned type can be found in the dropdown
function ensureValidFieldType(type: string): FieldType {
  const found = FIELD_TYPES.find((ft) => ft.value === type);
  if (found) return found.value;
  // Fallback mappings for backend-stored types
  const fallbackMap: Record<string, FieldType> = {
    INTEGER: 'NUMBER',
    STRING: 'TEXT',
    RELATION: 'LOOKUP',
  };
  return fallbackMap[type] || 'TEXT';
}

const TYPE_ICONS: Partial<Record<FieldType, string>> = {
  TEXT: 'Aa',
  NUMBER: '123',
  DECIMAL: '1.5',
  BOOLEAN: '✓',
  DATE: '📅',
  SELECT: '▾',
  LOOKUP: '🔗',
  FILE: '📎',
};

// ─── Create Table Wizard ─────────────────────────────────────────────────────
interface NewField {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
}

function CreateTableModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createTable = useCreateTable();
  const [step, setStep] = useState<1 | 2>(1);
  const [tableName, setTableName] = useState('');
  const [tableLabel, setTableLabel] = useState('');
  const [tableDesc, setTableDesc] = useState('');
  const [fields, setFields] = useState<NewField[]>([
    { name: 'name', label: 'Name', type: 'TEXT', required: true },
  ]);

  const addField = () =>
    setFields((f) => [...f, { name: '', label: '', type: 'TEXT', required: false }]);

  const removeField = (i: number) => setFields((f) => f.filter((_, idx) => idx !== i));

  const updateField = (i: number, key: keyof NewField, val: string | boolean) =>
    setFields((f) => f.map((field, idx) => (idx === i ? { ...field, [key]: val } : field)));

  const handleCreate = async () => {
    if (!tableName || !tableLabel) {
      notify.error('Table name and label are required.');
      return;
    }
    if (fields.some((f) => !f.name || !f.label)) {
      notify.error('All fields must have a name and label.');
      return;
    }
    try {
      await createTable.mutateAsync({
        name: tableName,
        label: tableLabel,
        description: tableDesc,
        fields: fields.map((f, i) => ({
          name: f.name,
          label: f.label,
          type: f.type,
          required: f.required,
          unique: false,
          indexed: false,
          order: i,
        })),
      });
      notify.success(`Table "${tableLabel}" created successfully.`);
      onClose();
      setStep(1);
      setTableName('');
      setTableLabel('');
      setTableDesc('');
      setFields([{ name: 'name', label: 'Name', type: 'TEXT', required: true }]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create table.';
      notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 1 ? 'Create Custom Table — Step 1' : 'Add Fields — Step 2'}
      description={step === 1 ? 'Define the table metadata' : 'Add fields to your table'}
      size="lg"
      footer={
        step === 1 ? (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => setStep(2)} disabled={!tableName || !tableLabel}>
              Next: Add Fields
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handleCreate} loading={createTable.isPending}>
              Create Table
            </Button>
          </>
        )
      }
    >
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Table Name (internal)"
              value={tableName}
              onChange={(e) => setTableName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              placeholder="customer_contacts"
              hint="Lowercase, underscores only"
              required
            />
            <Input
              label="Display Label"
              value={tableLabel}
              onChange={(e) => setTableLabel(e.target.value)}
              placeholder="Customer Contacts"
              required
            />
          </div>
          <Textarea
            label="Description"
            value={tableDesc}
            onChange={(e) => setTableDesc(e.target.value)}
            placeholder="What is this table for?"
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-surface-500">{fields.length} field(s)</p>
            <Button variant="secondary" size="xs" leftIcon={<PlusIcon className="h-3.5 w-3.5" />} onClick={addField}>
              Add Field
            </Button>
          </div>
          {fields.map((field, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end p-3 bg-surface-50 rounded-lg border border-surface-200">
              <Input
                label="Field Name"
                value={field.name}
                onChange={(e) => updateField(i, 'name', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="field_name"
                size="sm"
              />
              <Input
                label="Label"
                value={field.label}
                onChange={(e) => updateField(i, 'label', e.target.value)}
                placeholder="Field Label"
                size="sm"
              />
              <Select
                label="Type"
                value={field.type}
                onChange={(e) => updateField(i, 'type', e.target.value)}
                options={FIELD_TYPES}
                size="sm"
              />
              <label className="flex items-center gap-1 text-xs text-surface-500 mb-0.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(i, 'required', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-surface-300"
                />
                Req
              </label>
              <button
                type="button"
                onClick={() => removeField(i)}
                disabled={fields.length <= 1}
                className="p-1.5 rounded text-surface-400 hover:text-danger-500 hover:bg-danger-50 disabled:opacity-30 mb-0.5"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Edit Table Modal ────────────────────────────────────────────────────────
function EditTableModal({
  table,
  onClose,
}: {
  table: DynamicTable | null;
  onClose: () => void;
}) {
  const updateTable = useUpdateTable();
  const [tableLabel, setTableLabel] = useState('');
  const [tableDesc, setTableDesc] = useState('');
  const [fields, setFields] = useState<NewField[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (table) {
      setTableLabel(table.label);
      setTableDesc(table.description ?? '');
      setFields(
        table.fields.map((f) => ({
          name: f.name,
          label: f.label,
          type: ensureValidFieldType(f.type),
          required: f.required ?? false,
        }))
      );
      setHasChanges(false);
    }
  }, [table]);

  const markChanged = () => setHasChanges(true);

  const addField = () => {
    setFields((f) => [...f, { name: '', label: '', type: 'TEXT', required: false }]);
    markChanged();
  };

  const removeField = (i: number) => {
    setFields((f) => f.filter((_, idx) => idx !== i));
    markChanged();
  };

  const updateField = (i: number, key: keyof NewField, val: string | boolean) => {
    setFields((f) => f.map((field, idx) => (idx === i ? { ...field, [key]: val } : field)));
    markChanged();
  };

  const handleSave = async () => {
    if (!table) return;
    if (!tableLabel) {
      notify.error('Table label is required.');
      return;
    }
    if (fields.length === 0) {
      notify.error('Table must have at least one field.');
      return;
    }
    if (fields.some((f) => !f.name || !f.label)) {
      notify.error('All fields must have a name and label.');
      return;
    }
    // Check for duplicate field names
    const fieldNames = new Set<string>();
    for (const f of fields) {
      if (fieldNames.has(f.name)) {
        notify.error(`Duplicate field name: "${f.name}". Each field must have a unique name.`);
        return;
      }
      fieldNames.add(f.name);
    }

    try {
      await updateTable.mutateAsync({
        id: table.name,
        label: tableLabel,
        description: tableDesc,
        fields: fields.map((f, i) => ({
          name: f.name,
          label: f.label,
          type: f.type,
          required: f.required,
          unique: false,
          indexed: false,
          order: i,
        })),
      });
      notify.success(`Table "${tableLabel}" updated successfully.`);
      setHasChanges(false);
      onClose();
    } catch (err: any) {
      // Show detailed error from backend validation
      const errorData = err?.response?.data;
      let msg = 'Failed to update table.';
      if (errorData) {
        if (Array.isArray(errorData.message)) {
          msg = errorData.message.join(', ');
        } else if (typeof errorData.message === 'string') {
          msg = errorData.message;
        } else if (errorData.errors) {
          msg = errorData.errors.map((e: any) => `${e.field}: ${e.message}`).join('; ');
        }
      } else if (err?.message) {
        msg = err.message;
      }
      notify.error(msg);
    }
  };

  return (
    <Modal
      open={!!table}
      onClose={onClose}
      title="Edit Table"
      description={`Update "${table?.label || ''}" — metadata and fields`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={updateTable.isPending} disabled={!hasChanges}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Display Label"
            value={tableLabel}
            onChange={(e) => { setTableLabel(e.target.value); markChanged(); }}
            placeholder="Customer Contacts"
            required
          />
          <Input
            label="Table Name (internal)"
            value={table?.name ?? ''}
            disabled
            hint="Cannot be changed after creation"
          />
        </div>
        <Textarea
          label="Description"
          value={tableDesc}
          onChange={(e) => { setTableDesc(e.target.value); markChanged(); }}
          placeholder="What is this table for?"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-surface-500 font-medium">Fields ({fields.length})</p>
            <Button variant="secondary" size="xs" leftIcon={<PlusIcon className="h-3.5 w-3.5" />} onClick={addField}>
              Add Field
            </Button>
          </div>
          {fields.map((field, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end p-3 bg-surface-50 rounded-lg border border-surface-200">
              <Input
                label="Field Name"
                value={field.name}
                onChange={(e) => updateField(i, 'name', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="field_name"
                size="sm"
              />
              <Input
                label="Label"
                value={field.label}
                onChange={(e) => updateField(i, 'label', e.target.value)}
                placeholder="Field Label"
                size="sm"
              />
              <Select
                label="Type"
                value={field.type}
                onChange={(e) => updateField(i, 'type', e.target.value)}
                options={FIELD_TYPES}
                size="sm"
              />
              <label className="flex items-center gap-1 text-xs text-surface-500 mb-0.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(i, 'required', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-surface-300"
                />
                Req
              </label>
              <button
                type="button"
                onClick={() => removeField(i)}
                disabled={fields.length <= 1}
                className="p-1.5 rounded text-surface-400 hover:text-danger-500 hover:bg-danger-50 disabled:opacity-30 mb-0.5"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─── Table data view ─────────────────────────────────────────────────────────
function TableDataView({ table }: { table: DynamicTable }) {
  const { data: recordsData, isLoading } = useDynamicRecords(table.name);
  const deleteRecord = useDeleteRecord();
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  const handleDeleteRecord = async () => {
    if (!deleteRecordId) return;
    try {
      await deleteRecord.mutateAsync({ tableId: table.name, recordId: deleteRecordId });
      notify.success('Record deleted.');
      setDeleteRecordId(null);
    } catch (err: any) {
      notify.error(err?.message || 'Failed to delete record.');
    }
  };

  const columns: ColumnDef<DynamicRecord, unknown>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-surface-400">{String(getValue()).slice(0, 8)}…</span>
      ),
      size: 80,
    },
    ...table.fields.slice(0, 6).map((f) => ({
      accessorKey: `data.${f.name}`,
      header: f.label,
      cell: ({ getValue }: { getValue: () => unknown }) => (
        <span className="text-sm text-surface-700">{String(getValue() ?? '—')}</span>
      ),
    })),
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => (
        <span className="text-xs text-surface-400">{formatDate(String(getValue()))}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteRecordId(row.original.id); }}
          className="p-1 rounded text-surface-400 hover:text-danger-500 hover:bg-danger-50"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      ),
      size: 50,
    },
  ];

  return (
    <>
      <DataTable
        data={recordsData?.data ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage={`No records in "${table.label}"`}
        emptyDescription="Create your first record using the form above."
      />
      <ConfirmModal
        open={!!deleteRecordId}
        onClose={() => setDeleteRecordId(null)}
        onConfirm={handleDeleteRecord}
        title="Delete Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmLabel="Delete Record"
        loading={deleteRecord.isPending}
      />
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function DynamicBuilderTablesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTable, setSelectedTable] = useState<DynamicTable | null>(null);
  const [deleteTable, setDeleteTable] = useState<DynamicTable | null>(null);
  const [editTable, setEditTable] = useState<DynamicTable | null>(null);

  const { data: tables, isLoading, refetch } = useDynamicTables();
  const deleteTableMutation = useDeleteTable();

  const handleDelete = async () => {
    if (!deleteTable) return;
    try {
      await deleteTableMutation.mutateAsync(deleteTable.name);
      notify.success(`Table "${deleteTable.label}" deleted.`);
      if (selectedTable?.id === deleteTable.id) setSelectedTable(null);
      setDeleteTable(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete table.';
      notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-600">{tables?.length ?? 0} table(s) defined</p>
        <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
          New Table
        </Button>
      </div>

      {selectedTable ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTable(null)}
              className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 transition-colors"
            >
              Tables
            </button>
            <ChevronRightIcon className="h-3.5 w-3.5 text-surface-400" />
            <span className="text-sm font-medium text-surface-900">{selectedTable.label}</span>
            <button
              onClick={() => setEditTable(selectedTable)}
              className="ml-2 p-1 rounded text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              title="Edit table"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          </div>

          <Card padding="md">
            <Card.Header
              title={`${selectedTable.label} — Field Definitions`}
              subtitle={`${selectedTable.fields.length} fields · ${selectedTable.recordCount ?? 0} records`}
              border
            />
            <div className="flex flex-wrap gap-2">
              {selectedTable.fields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-50 rounded-lg border border-surface-200"
                >
                  <span className="font-mono text-xs text-surface-400">
                    {TYPE_ICONS[field.type] ?? (field.type || '').slice(0, 3)}
                  </span>
                  <span className="text-xs font-medium text-surface-700">{field.label}</span>
                  <span className="text-[10px] text-surface-400 ml-0.5">({field.type})</span>
                  {field.required && <span className="text-danger-400 text-xs">*</span>}
                </div>
              ))}
            </div>
          </Card>

          <TableDataView table={selectedTable} />
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !tables?.length ? (
        <Card padding="lg" className="text-center">
          <TableCellsIcon className="h-12 w-12 text-surface-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-surface-700">No custom tables yet</h3>
          <p className="text-xs text-surface-400 mt-1 mb-4">
            Create your first custom data table to store business-specific data.
          </p>
          <Button onClick={() => setShowCreate(true)} leftIcon={<PlusIcon className="h-4 w-4" />}>
            Create First Table
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tables.map((table) => (
            <Card
              key={table.id}
              hover
              padding="md"
              className="cursor-pointer group"
              onClick={() => setSelectedTable(table)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 bg-primary-50 rounded-lg flex items-center justify-center">
                  <TableCellsIcon className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditTable(table); }}
                    className="p-1 rounded text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Edit table"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  {!table.isSystem && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTable(table); }}
                      className="p-1 rounded text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                      title="Delete table"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-surface-900 mb-0.5">{table.label}</h3>
              {table.description && (
                <p className="text-xs text-surface-500 mb-2 line-clamp-2">{table.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-surface-400">
                <span>{table.fields.length} fields</span>
                <span>·</span>
                <span>{(table.recordCount ?? 0).toLocaleString()} records</span>
                {table.isSystem && (
                  <>
                    <span>·</span>
                    <span className="text-info-500 font-medium">System</span>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateTableModal open={showCreate} onClose={() => setShowCreate(false)} />
      <EditTableModal table={editTable} onClose={() => { setEditTable(null); refetch(); }} />
      <ConfirmModal
        open={!!deleteTable}
        onClose={() => setDeleteTable(null)}
        onConfirm={handleDelete}
        title="Delete Table"
        message={`Are you sure you want to delete "${deleteTable?.label}"? All records in this table will be permanently deleted.`}
        confirmLabel="Delete Table"
        loading={deleteTableMutation.isPending}
      />
    </div>
  );
}
