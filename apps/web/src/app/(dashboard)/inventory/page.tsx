'use client';

import React, { useState } from 'react';
import {
  PlusIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { Card, KpiCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Select, Input, Textarea } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/Badge';
import {
  useItems,
  useWarehouses,
  useLowStockItems,
  useValuationSummary,
  useRecordMovement,
  useCreateItem,
  type Item,
  type StockMovement,
} from '@/hooks/useInventory';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { notify } from '@/components/ui/Toast';

// ─── Add Item modal ───────────────────────────────────────────────────────────
interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
}

function AddItemModal({ open, onClose }: AddItemModalProps) {
  const createItem = useCreateItem();
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    unit: '',
    costMethod: 'FIFO' as 'FIFO' | 'LIFO' | 'AVERAGE' | 'SPECIFIC',
    reorderPoint: '',
    reorderQty: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.unit) {
      notify.error('Code, Name, and Unit are required.');
      return;
    }
    try {
      await createItem.mutateAsync({
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        category: form.category || undefined,
        unit: form.unit,
        costMethod: form.costMethod,
        reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
        reorderQty: form.reorderQty ? Number(form.reorderQty) : undefined,
      });
      notify.success('Item created successfully.');
      onClose();
      setForm({ code: '', name: '', description: '', category: '', unit: '', costMethod: 'FIFO', reorderPoint: '', reorderQty: '' });
    } catch {
      notify.error('Failed to create item.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Inventory Item"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            form="add-item-form"
            type="submit"
            loading={createItem.isPending}
          >
            Create Item
          </Button>
        </>
      }
    >
      <form id="add-item-form" onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Item Code"
            required
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="e.g. SKU-001"
          />
          <Input
            label="Item Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Widget A"
          />
        </div>
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Optional description…"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="e.g. Raw Materials"
          />
          <Input
            label="Unit"
            required
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            placeholder="e.g. PCS, KG, L"
          />
        </div>
        <Select
          label="Cost Method"
          required
          value={form.costMethod}
          onChange={(e) => setForm((f) => ({ ...f, costMethod: e.target.value as typeof form.costMethod }))}
          options={[
            { label: 'FIFO (First In, First Out)', value: 'FIFO' },
            { label: 'LIFO (Last In, First Out)', value: 'LIFO' },
            { label: 'Weighted Average', value: 'AVERAGE' },
            { label: 'Specific Identification', value: 'SPECIFIC' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Reorder Point"
            type="number"
            min="0"
            value={form.reorderPoint}
            onChange={(e) => setForm((f) => ({ ...f, reorderPoint: e.target.value }))}
            placeholder="0"
          />
          <Input
            label="Reorder Quantity"
            type="number"
            min="0"
            value={form.reorderQty}
            onChange={(e) => setForm((f) => ({ ...f, reorderQty: e.target.value }))}
            placeholder="0"
          />
        </div>
      </form>
    </Modal>
  );
}

// ─── Movement modal ───────────────────────────────────────────────────────────
interface MovementModalProps {
  open: boolean;
  onClose: () => void;
  items: Item[];
  warehouseOptions: { label: string; value: string }[];
}

function MovementModal({ open, onClose, items, warehouseOptions }: MovementModalProps) {
  const recordMovement = useRecordMovement();
  const [form, setForm] = useState({
    itemId: '',
    warehouseId: '',
    type: 'RECEIPT' as StockMovement['type'],
    quantity: '',
    unitCost: '',
    reference: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemId || !form.warehouseId || !form.quantity) {
      notify.error('Please fill in all required fields.');
      return;
    }
    try {
      await recordMovement.mutateAsync({
        itemId:      form.itemId,
        warehouseId: form.warehouseId,
        type:        form.type,
        quantity:    Number(form.quantity),
        unitCost:    Number(form.unitCost) || 0,
        reference:   form.reference || undefined,
        notes:       form.notes || undefined,
      });
      notify.success('Stock movement recorded successfully.');
      onClose();
      setForm({ itemId: '', warehouseId: '', type: 'RECEIPT', quantity: '', unitCost: '', reference: '', notes: '' });
    } catch {
      notify.error('Failed to record movement.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Stock Movement"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            form="movement-form"
            type="submit"
            loading={recordMovement.isPending}
          >
            Record Movement
          </Button>
        </>
      }
    >
      <form id="movement-form" onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Item"
            required
            value={form.itemId}
            onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))}
            options={items.map((i) => ({ label: `${i.code} — ${i.name}`, value: i.id }))}
            placeholder="Select item…"
          />
          <Select
            label="Warehouse"
            required
            value={form.warehouseId}
            onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}
            options={warehouseOptions}
            placeholder="Select warehouse…"
          />
        </div>
        <Select
          label="Movement Type"
          required
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as StockMovement['type'] }))}
          options={[
            { label: 'Receipt (Stock In)', value: 'RECEIPT' },
            { label: 'Issue (Stock Out)', value: 'ISSUE' },
            { label: 'Transfer', value: 'TRANSFER' },
            { label: 'Adjustment', value: 'ADJUSTMENT' },
            { label: 'Return', value: 'RETURN' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Quantity"
            type="number"
            min="0"
            step="0.001"
            required
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            placeholder="0"
          />
          <Input
            label="Unit Cost"
            type="number"
            min="0"
            step="0.01"
            value={form.unitCost}
            onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
            placeholder="0.00"
          />
        </div>
        <Input
          label="Reference"
          value={form.reference}
          onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
          placeholder="PO-001, SO-123, etc."
        />
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Optional notes…"
        />
      </form>
    </Modal>
  );
}

// ─── Item columns ─────────────────────────────────────────────────────────────
const itemColumns: ColumnDef<Item, unknown>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-surface-600 font-medium">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Item Name',
    cell: ({ getValue }) => (
      <span className="text-sm font-medium text-surface-900">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ getValue }) => (
      <span className="text-xs text-surface-500">{String(getValue() ?? '—')}</span>
    ),
  },
  {
    accessorKey: 'unit',
    header: 'Unit',
    cell: ({ getValue }) => (
      <span className="text-xs text-surface-600">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'totalStock',
    header: 'Total Stock',
    cell: ({ row }) => {
      const item = row.original;
      const isLow = (item.reorderPoint ?? 0) > 0 && item.totalStock <= (item.reorderPoint ?? 0);
      return (
        <span className={cn('text-sm font-semibold tabular', isLow ? 'text-danger-600' : 'text-surface-900')}>
          {item.totalStock.toLocaleString()} {item.unit}
          {isLow && <ExclamationTriangleIcon className="inline h-3.5 w-3.5 ml-1 text-danger-500" />}
        </span>
      );
    },
  },
  {
    accessorKey: 'averageCost',
    header: 'Avg Cost',
    cell: ({ getValue }) => (
      <span className="text-xs tabular text-surface-600">{formatCurrency(Number(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'totalValue',
    header: 'Total Value',
    cell: ({ getValue }) => (
      <span className="text-sm font-semibold tabular text-surface-900">{formatCurrency(Number(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'costMethod',
    header: 'Valuation',
    cell: ({ getValue }) => (
      <span className="text-xs bg-surface-100 text-surface-600 px-2 py-0.5 rounded font-mono">{String(getValue())}</span>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [showMovement, setShowMovement] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  const { data: itemsData, isLoading: itemsLoading } = useItems({
    warehouseId: selectedWarehouse || undefined,
  });
  const { data: warehouses } = useWarehouses();
  const { data: lowStock } = useLowStockItems();
  const { data: valuation } = useValuationSummary();

  const items = itemsData?.data ?? [];
  const warehouseOptions = (warehouses ?? []).map((w) => ({ label: w.name, value: w.id }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900">Inventory</h1>
          <p className="text-sm text-surface-500 mt-0.5">Stock levels, movements, and valuation</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="h-9 px-3 rounded-lg border border-surface-300 text-sm text-surface-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-600"
          >
            <option value="">All Warehouses</option>
            {warehouseOptions.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowsRightLeftIcon className="h-4 w-4" />}
            onClick={() => setShowMovement(true)}
          >
            Record Movement
          </Button>
          <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setShowAddItem(true)}>
            Add Item
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Inventory Value"
          value={formatCurrency(valuation?.totalValue ?? 0)}
          icon={<ArrowUpIcon className="h-5 w-5 text-success-600" />}
          iconBg="bg-success-50"
        />
        <KpiCard
          title="Total Items"
          value={(valuation?.totalItems ?? 0).toLocaleString()}
          icon={<ArrowDownIcon className="h-5 w-5 text-info-600" />}
          iconBg="bg-info-50"
        />
        <KpiCard
          title="Low Stock Alerts"
          value={(lowStock?.length ?? 0).toString()}
          change={lowStock?.length ? 'Items need reordering' : 'All levels OK'}
          changeType={lowStock?.length ? 'negative' : 'positive'}
          icon={<ExclamationTriangleIcon className="h-5 w-5 text-warning-600" />}
          iconBg="bg-warning-50"
        />
      </div>

      {/* Low stock banner */}
      {(lowStock?.length ?? 0) > 0 && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-danger-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-danger-800">
              {lowStock!.length} item{lowStock!.length !== 1 ? 's' : ''} below reorder point
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {lowStock!.slice(0, 5).map((item) => (
                <span
                  key={`${item.itemId}-${item.warehouseId}`}
                  className="text-xs bg-danger-100 text-danger-700 px-2 py-0.5 rounded-full font-medium"
                >
                  {item.itemCode} — {item.currentStock}/{item.reorderPoint}
                </span>
              ))}
              {lowStock!.length > 5 && (
                <span className="text-xs text-danger-600">+{lowStock!.length - 5} more</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items table */}
      <DataTable
        data={items}
        columns={itemColumns}
        loading={itemsLoading}
        emptyMessage="No inventory items found"
        emptyDescription="Add your first item to get started."
        searchPlaceholder="Search items…"
        toolbar={
          <Button size="sm" variant="secondary" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setShowAddItem(true)}>
            Add Item
          </Button>
        }
      />

      {/* Add Item modal */}
      <AddItemModal
        open={showAddItem}
        onClose={() => setShowAddItem(false)}
      />

      {/* Movement modal */}
      <MovementModal
        open={showMovement}
        onClose={() => setShowMovement(false)}
        items={items}
        warehouseOptions={warehouseOptions}
      />
    </div>
  );
}
