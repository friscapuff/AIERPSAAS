'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowLeftIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { notify } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScreenLayout {
  columns: { fieldName: string; label: string; width?: number; sortable?: boolean; filterable?: boolean; visible?: boolean }[];
  formSections: { title: string; fields: { fieldName: string; label: string; inputType: string; span?: number; readOnly?: boolean; placeholder?: string }[] }[];
  actions: { label: string; action: string; icon?: string; variant?: string; showWhen?: string }[];
  headerFields: string[];
  defaultSort: { field: string; direction: 'ASC' | 'DESC' };
  pageSize: number;
}

interface ScreenDef {
  id: string;
  tableName: string;
  screenName: string;
  displayName: string;
  description?: string;
  screenType: 'FORM' | 'LIST' | 'FORM_LIST';
  layout: ScreenLayout;
  status: string;
}

interface DynamicRecord {
  id: string;
  data: Record<string, any>;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useScreenByName(name: string) {
  return useQuery<ScreenDef>({
    queryKey: ['screen', 'name', name],
    queryFn: () => get<ScreenDef>(`/dynamic-builder/screens/by-name/${name}`),
    enabled: !!name,
  });
}

function useDynamicRecords(tableName: string, page = 1, pageSize = 20) {
  return useQuery<{ data: DynamicRecord[]; total: number }>({
    queryKey: ['dynamic-records', tableName, page, pageSize],
    queryFn: () => get<{ data: DynamicRecord[]; total: number }>(`/dynamic-builder/tables/${tableName}/records?page=${page}&limit=${pageSize}`),
    enabled: !!tableName,
  });
}

function useCreateDynamicRecord(tableName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => post(`/dynamic-builder/tables/${tableName}/records`, { data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dynamic-records', tableName] }),
  });
}

function useUpdateDynamicRecord(tableName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) => put(`/dynamic-builder/tables/${tableName}/records/${id}`, { data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dynamic-records', tableName] }),
  });
}

function useDeleteDynamicRecord(tableName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/dynamic-builder/tables/${tableName}/records/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dynamic-records', tableName] }),
  });
}

function useUpdateRecordStatus(tableName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => put(`/dynamic-builder/tables/${tableName}/records/${id}`, { data: { _status: status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dynamic-records', tableName] }),
  });
}

// ─── Record Form (rendered from screen layout) ───────────────────────────────
function DynamicRecordForm({
  screen,
  record,
  open,
  onClose,
  onSave,
  loading,
}: {
  screen: ScreenDef;
  record: DynamicRecord | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  loading: boolean;
}) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (record) {
      setFormValues(record.data || {});
    } else {
      setFormValues({});
    }
  }, [record, open]);

  const updateValue = (fieldName: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const renderField = (field: { fieldName: string; label: string; inputType: string; span?: number; readOnly?: boolean; placeholder?: string }) => {
    const value = formValues[field.fieldName] ?? '';
    const colSpan = field.span === 2 ? 'col-span-2' : '';

    switch (field.inputType) {
      case 'textarea':
        return (
          <div key={field.fieldName} className={colSpan}>
            <Textarea
              label={field.label}
              value={value}
              onChange={(e) => updateValue(field.fieldName, e.target.value)}
              placeholder={field.placeholder}
              disabled={field.readOnly}
            />
          </div>
        );
      case 'number':
        return (
          <div key={field.fieldName} className={colSpan}>
            <Input
              label={field.label}
              type="number"
              value={value}
              onChange={(e) => updateValue(field.fieldName, parseFloat(e.target.value) || 0)}
              placeholder={field.placeholder}
              disabled={field.readOnly}
            />
          </div>
        );
      case 'date':
        return (
          <div key={field.fieldName} className={colSpan}>
            <Input
              label={field.label}
              type="date"
              value={value}
              onChange={(e) => updateValue(field.fieldName, e.target.value)}
              disabled={field.readOnly}
            />
          </div>
        );
      case 'checkbox':
        return (
          <div key={field.fieldName} className={`flex items-center gap-2 pt-6 ${colSpan}`}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => updateValue(field.fieldName, e.target.checked)}
              disabled={field.readOnly}
              className="rounded border-surface-300"
            />
            <span className="text-sm text-surface-700">{field.label}</span>
          </div>
        );
      case 'select':
        return (
          <div key={field.fieldName} className={colSpan}>
            <Input
              label={field.label}
              value={value}
              onChange={(e) => updateValue(field.fieldName, e.target.value)}
              placeholder={field.placeholder || `Enter ${field.label}`}
              disabled={field.readOnly}
            />
          </div>
        );
      default:
        return (
          <div key={field.fieldName} className={colSpan}>
            <Input
              label={field.label}
              value={value}
              onChange={(e) => updateValue(field.fieldName, e.target.value)}
              placeholder={field.placeholder || `Enter ${field.label}`}
              disabled={field.readOnly}
            />
          </div>
        );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? 'Edit Record' : 'New Record'}
      description={screen.displayName}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formValues)} loading={loading}>
            {record ? 'Save Changes' : 'Create Record'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {screen.layout.formSections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <h4 className="text-sm font-semibold text-surface-800 mb-3 pb-2 border-b border-surface-100">
                {section.title}
              </h4>
            )}
            <div className="grid grid-cols-2 gap-3">
              {section.fields.map(renderField)}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────────
export default function DynamicScreenRenderPage() {
  const params = useParams();
  const router = useRouter();
  const screenName = params.screenName as string;

  const { data: screen, isLoading: screenLoading, error: screenError } = useScreenByName(screenName);

  const [page, setPage] = useState(1);
  const { data: recordsResponse, isLoading: recordsLoading } = useDynamicRecords(
    screen?.tableName || '',
    page,
    screen?.layout?.pageSize || 20
  );

  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<DynamicRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<DynamicRecord | null>(null);

  const createRecord = useCreateDynamicRecord(screen?.tableName || '');
  const updateRecord = useUpdateDynamicRecord(screen?.tableName || '');
  const deleteRecordMut = useDeleteDynamicRecord(screen?.tableName || '');
  const updateStatus = useUpdateRecordStatus(screen?.tableName || '');

  // Build columns from screen layout
  const columns: ColumnDef<DynamicRecord, unknown>[] = useMemo(() => {
    if (!screen?.layout?.columns) return [];
    const visibleCols = screen.layout.columns.filter((c) => c.visible !== false);
    return [
      ...visibleCols.map((col) => ({
        accessorFn: (row: DynamicRecord) => row.data?.[col.fieldName] ?? '',
        id: col.fieldName,
        header: col.label,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const val = getValue();
          if (val === null || val === undefined || val === '') return <span className="text-surface-300">—</span>;
          if (typeof val === 'boolean') return <Badge size="sm" variant={val ? 'success' : 'default'}>{val ? 'Yes' : 'No'}</Badge>;
          return <span className="text-sm text-surface-700">{String(val)}</span>;
        },
        size: col.width,
      })),
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ getValue }: { getValue: () => unknown }) => (
          <span className="text-xs text-surface-400">{formatDate(String(getValue()))}</span>
        ),
        size: 120,
      },
    ];
  }, [screen]);

  const handleSave = async (data: Record<string, any>) => {
    try {
      if (editRecord) {
        await updateRecord.mutateAsync({ id: editRecord.id, data });
        notify.success('Record updated.');
      } else {
        await createRecord.mutateAsync(data);
        notify.success('Record created.');
      }
      setShowForm(false);
      setEditRecord(null);
    } catch (err: any) {
      notify.error(err?.message || 'Failed to save record.');
    }
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;
    try {
      await deleteRecordMut.mutateAsync(deleteRecord.id);
      notify.success('Record deleted.');
      setDeleteRecord(null);
    } catch {
      notify.error('Failed to delete record.');
    }
  };

  const handleAction = (action: string, record?: DynamicRecord) => {
    switch (action) {
      case 'create':
        setEditRecord(null);
        setShowForm(true);
        break;
      case 'edit':
        if (record) { setEditRecord(record); setShowForm(true); }
        break;
      case 'delete':
        if (record) setDeleteRecord(record);
        break;
      case 'submit':
        if (record) {
          updateStatus.mutate({ id: record.id, status: 'SUBMITTED' }, {
            onSuccess: () => notify.success('Record submitted.'),
            onError: () => notify.error('Failed to submit.'),
          });
        }
        break;
      case 'approve':
        if (record) {
          updateStatus.mutate({ id: record.id, status: 'APPROVED' }, {
            onSuccess: () => notify.success('Record approved.'),
            onError: () => notify.error('Failed to approve.'),
          });
        }
        break;
      default:
        notify.info(`Custom action: ${action}`);
    }
  };

  // Loading / Error states
  if (screenLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-surface-100 rounded animate-pulse" />
        <div className="h-64 bg-surface-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (screenError || !screen) {
    return (
      <Card padding="lg" className="text-center">
        <h3 className="text-sm font-semibold text-danger-600">Screen Not Found</h3>
        <p className="text-xs text-surface-500 mt-1">
          The screen "{screenName}" does not exist or has not been published yet.
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push('/dynamic-builder/screens')}>
          Back to Screen Builder
        </Button>
      </Card>
    );
  }

  const showList = screen.screenType === 'LIST' || screen.screenType === 'FORM_LIST';
  const showForm_ = screen.screenType === 'FORM' || screen.screenType === 'FORM_LIST';
  const records = recordsResponse?.data || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dynamic-builder/screens')}
            className="p-1.5 rounded hover:bg-surface-100 text-surface-400 hover:text-surface-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-surface-900">{screen.displayName}</h1>
            {screen.description && <p className="text-xs text-surface-500">{screen.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {screen.layout.actions?.filter((a) => !a.showWhen || a.showWhen === 'always').map((action, i) => {
            if (action.action === 'create' && showForm_) {
              return (
                <Button
                  key={i}
                  variant={action.variant as any || 'primary'}
                  leftIcon={<PlusIcon className="h-4 w-4" />}
                  onClick={() => handleAction('create')}
                >
                  {action.label}
                </Button>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Info strip */}
      <div className="flex items-center gap-4 text-xs text-surface-500">
        <span>Table: <span className="font-medium text-surface-700">{screen.tableName}</span></span>
        <span>Records: <span className="font-medium text-surface-700">{recordsResponse?.total ?? 0}</span></span>
        <Badge size="sm" variant={screen.status === 'PUBLISHED' ? 'success' : 'warning'}>{screen.status}</Badge>
      </div>

      {/* Data Table */}
      {showList && (
        <DataTable
          data={records}
          columns={columns}
          loading={recordsLoading}
          emptyMessage={`No records in "${screen.displayName}"`}
          emptyDescription="Click Create to add the first record."
          onRowClick={(row) => {
            if (showForm_) handleAction('edit', row);
          }}
          actions={(row) => (
            <div className="flex items-center gap-1">
              {showForm_ && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleAction('edit', row); }}
                  className="p-1 rounded text-surface-400 hover:text-primary-600 hover:bg-primary-50"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleAction('delete', row); }}
                className="p-1 rounded text-surface-400 hover:text-danger-600 hover:bg-danger-50"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        />
      )}

      {/* Form-only mode (no list) */}
      {screen.screenType === 'FORM' && !showForm && records.length === 0 && (
        <Card padding="lg" className="text-center">
          <p className="text-sm text-surface-500">No record exists yet.</p>
          <Button className="mt-3" onClick={() => handleAction('create')}>
            Create Record
          </Button>
        </Card>
      )}

      {/* Dynamic Form Modal */}
      {showForm_ && (
        <DynamicRecordForm
          screen={screen}
          record={editRecord}
          open={showForm}
          onClose={() => { setShowForm(false); setEditRecord(null); }}
          onSave={handleSave}
          loading={createRecord.isPending || updateRecord.isPending}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteRecord}
        onClose={() => setDeleteRecord(null)}
        onConfirm={handleDelete}
        title="Delete Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteRecordMut.isPending}
      />
    </div>
  );
}
