'use client';

import React, { useState } from 'react';
import {
  PlusIcon,
  CheckCircleIcon,
  TruckIcon,
  DocumentTextIcon,
  XMarkIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Select, Input, Textarea } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/Badge';
import {
  useSalesOrders,
  useSalesOrder,
  useCreateSalesOrder,
  useUpdateSalesOrder,
  useConfirmSalesOrder,
  useDeliverSalesOrder,
  useInvoiceSalesOrder,
  useCloseSalesOrder,
  useCancelSalesOrder,
  type SalesOrder,
  type SalesOrderLine,
  type CreateSalesOrderPayload,
} from '@/hooks/useSalesOrders';
import { useItems } from '@/hooks/useInventory';
import { formatCurrency, formatDate } from '@/lib/utils';
import { notify } from '@/components/ui/Toast';

// ─── Status colors ──────────────��─────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  DRAFT: { label: 'Draft', variant: 'neutral' },
  CONFIRMED: { label: 'Confirmed', variant: 'info' },
  DELIVERING: { label: 'Delivering', variant: 'warning' },
  INVOICED: { label: 'Invoiced', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'neutral' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
};

// ─── Create/Edit Modal ────────────────────────────────────────────────────────
interface SOModalProps {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
}

function SOModal({ open, onClose, editId }: SOModalProps) {
  const createSO = useCreateSalesOrder();
  const updateSO = useUpdateSalesOrder();
  const { data: editOrder } = useSalesOrder(editId ?? null);
  const { data: itemsData } = useItems({});
  const items = itemsData?.data ?? [];

  const [form, setForm] = useState({
    customerName: '',
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: '',
    currency: 'JOD',
    notes: '',
  });
  const [lines, setLines] = useState<SalesOrderLine[]>([]);

  // Populate form when editing
  React.useEffect(() => {
    if (editOrder && editId) {
      setForm({
        customerName: editOrder.customerName || '',
        orderDate: editOrder.orderDate?.slice(0, 10) || '',
        expectedDeliveryDate: editOrder.expectedDeliveryDate?.slice(0, 10) || '',
        currency: editOrder.currency || 'JOD',
        notes: editOrder.notes || '',
      });
      setLines(editOrder.lines || []);
    } else if (!editId) {
      setForm({ customerName: '', orderDate: new Date().toISOString().slice(0, 10), expectedDeliveryDate: '', currency: 'JOD', notes: '' });
      setLines([]);
    }
  }, [editOrder, editId]);

  const addLine = () => {
    setLines((prev) => [...prev, { itemId: '', itemCode: '', itemName: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxPercent: 16, unitOfMeasure: 'PCS' }]);
  };

  const updateLine = (idx: number, field: string, value: any) => {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      // Auto-fill item details from dropdown
      if (field === 'itemId' && value) {
        const item = items.find((it) => it.id === value);
        if (item) {
          updated.itemCode = item.code;
          updated.itemName = item.name;
          updated.unitOfMeasure = item.unit || 'PCS';
        }
      }
      return updated;
    }));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName) { notify.error('Customer name is required'); return; }
    if (lines.length === 0) { notify.error('Add at least one line item'); return; }

    const payload: CreateSalesOrderPayload = {
      customerName: form.customerName,
      orderDate: form.orderDate || undefined,
      expectedDeliveryDate: form.expectedDeliveryDate || undefined,
      currency: form.currency,
      notes: form.notes || undefined,
      lines,
    };

    try {
      if (editId) {
        await updateSO.mutateAsync({ id: editId, ...payload });
        notify.success('Sales order updated');
      } else {
        await createSO.mutateAsync(payload);
        notify.success('Sales order created');
      }
      onClose();
    } catch {
      notify.error('Failed to save sales order');
    }
  };

  const calcLineTotal = (l: SalesOrderLine) => {
    const sub = l.quantity * l.unitPrice;
    const disc = sub * ((l.discountPercent || 0) / 100);
    const afterDisc = sub - disc;
    return afterDisc + afterDisc * ((l.taxPercent || 0) / 100);
  };

  const grandTotal = lines.reduce((s, l) => s + calcLineTotal(l), 0);

  return (
    <Modal open={open} onClose={onClose} title={editId ? 'Edit Sales Order' : 'New Sales Order'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button form="so-form" type="submit" loading={createSO.isPending || updateSO.isPending}>
          {editId ? 'Update' : 'Create'} Order
        </Button>
      </>
    }>
      <form id="so-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Header fields */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Customer Name" required value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} placeholder="e.g. Acme Corp" />
          <Select label="Currency" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} options={[
            { label: 'JOD', value: 'JOD' },
            { label: 'USD', value: 'USD' },
            { label: 'EUR', value: 'EUR' },
            { label: 'SAR', value: 'SAR' },
          ]} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Order Date" type="date" value={form.orderDate} onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} />
          <Input label="Expected Delivery" type="date" value={form.expectedDeliveryDate} onChange={(e) => setForm((f) => ({ ...f, expectedDeliveryDate: e.target.value }))} />
        </div>
        <Textarea label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />

        {/* Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-surface-700">Line Items</p>
            <Button type="button" size="sm" variant="secondary" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={addLine}>Add Line</Button>
          </div>
          {lines.length === 0 && <p className="text-xs text-surface-400 italic">No line items yet. Click "Add Line" above.</p>}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-surface-50 p-2 rounded-lg">
                <div className="col-span-4">
                  <Select label={idx === 0 ? 'Item' : undefined} value={line.itemId || ''} onChange={(e) => updateLine(idx, 'itemId', e.target.value)} options={items.map((i) => ({ label: `${i.code} — ${i.name}`, value: i.id }))} placeholder="Select item" />
                </div>
                <div className="col-span-2">
                  <Input label={idx === 0 ? 'Qty' : undefined} type="number" min="0" step="0.01" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))} />
                </div>
                <div className="col-span-2">
                  <Input label={idx === 0 ? 'Price' : undefined} type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => updateLine(idx, 'unitPrice', Number(e.target.value))} />
                </div>
                <div className="col-span-1">
                  <Input label={idx === 0 ? 'Disc%' : undefined} type="number" min="0" max="100" value={line.discountPercent || 0} onChange={(e) => updateLine(idx, 'discountPercent', Number(e.target.value))} />
                </div>
                <div className="col-span-1">
                  <Input label={idx === 0 ? 'Tax%' : undefined} type="number" min="0" max="100" value={line.taxPercent || 0} onChange={(e) => updateLine(idx, 'taxPercent', Number(e.target.value))} />
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-xs font-semibold text-surface-700">{formatCurrency(calcLineTotal(line))}</span>
                </div>
                <div className="col-span-1 text-right">
                  <button type="button" onClick={() => removeLine(idx)} className="text-danger-500 hover:text-danger-700"><XMarkIcon className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          {lines.length > 0 && (
            <div className="text-right mt-2 pr-12">
              <span className="text-sm font-bold text-surface-900">Total: {formatCurrency(grandTotal)}</span>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ─── Detail Modal ───────────────────────���─────────────────────────────────────
interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
}

function DetailModal({ open, onClose, orderId }: DetailModalProps) {
  const { data: order, isLoading } = useSalesOrder(orderId);
  const confirmSO = useConfirmSalesOrder();
  const deliverSO = useDeliverSalesOrder();
  const invoiceSO = useInvoiceSalesOrder();
  const closeSO = useCloseSalesOrder();
  const cancelSO = useCancelSalesOrder();

  if (!orderId) return null;

  const handleAction = async (action: string) => {
    try {
      switch (action) {
        case 'confirm': await confirmSO.mutateAsync(orderId); break;
        case 'deliver': await deliverSO.mutateAsync(orderId); break;
        case 'invoice': await invoiceSO.mutateAsync(orderId); break;
        case 'close': await closeSO.mutateAsync(orderId); break;
        case 'cancel': await cancelSO.mutateAsync({ id: orderId }); break;
      }
      notify.success(`Order ${action}ed successfully`);
      onClose();
    } catch {
      notify.error(`Failed to ${action} order`);
    }
  };

  const status = order?.status;

  return (
    <Modal open={open} onClose={onClose} title={`Sales Order ${order?.orderNumber || ''}`} size="lg" footer={
      <div className="flex items-center gap-2 flex-wrap">
        {status === 'DRAFT' && (
          <>
            <Button size="sm" onClick={() => handleAction('confirm')} leftIcon={<CheckCircleIcon className="h-4 w-4" />} loading={confirmSO.isPending}>Confirm</Button>
            <Button size="sm" variant="danger" onClick={() => handleAction('cancel')} leftIcon={<XMarkIcon className="h-4 w-4" />} loading={cancelSO.isPending}>Cancel</Button>
          </>
        )}
        {status === 'CONFIRMED' && (
          <>
            <Button size="sm" onClick={() => handleAction('deliver')} leftIcon={<TruckIcon className="h-4 w-4" />} loading={deliverSO.isPending}>Mark Delivering</Button>
            <Button size="sm" variant="danger" onClick={() => handleAction('cancel')} loading={cancelSO.isPending}>Cancel</Button>
          </>
        )}
        {status === 'DELIVERING' && (
          <Button size="sm" onClick={() => handleAction('invoice')} leftIcon={<DocumentTextIcon className="h-4 w-4" />} loading={invoiceSO.isPending}>Invoice</Button>
        )}
        {status === 'INVOICED' && (
          <Button size="sm" onClick={() => handleAction('close')} leftIcon={<LockClosedIcon className="h-4 w-4" />} loading={closeSO.isPending}>Close</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Close Dialog</Button>
      </div>
    }>
      {isLoading ? <p className="text-sm text-surface-400">Loading...</p> : order && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><span className="text-surface-500">Customer:</span> <span className="font-medium">{order.customerName}</span></div>
            <div><span className="text-surface-500">Status:</span> <StatusBadge status={STATUS_MAP[order.status]?.label || order.status} variant={STATUS_MAP[order.status]?.variant || 'neutral'} /></div>
            <div><span className="text-surface-500">Order Date:</span> <span>{formatDate(order.orderDate)}</span></div>
            <div><span className="text-surface-500">Delivery Date:</span> <span>{order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '—'}</span></div>
            <div><span className="text-surface-500">Currency:</span> <span>{order.currency}</span></div>
            <div><span className="text-surface-500">Total:</span> <span className="font-bold">{formatCurrency(order.totalAmount)}</span></div>
          </div>
          {order.notes && <p className="text-xs text-surface-500 bg-surface-50 p-2 rounded">Notes: {order.notes}</p>}
          {/* Lines table */}
          <div>
            <p className="text-sm font-semibold mb-1">Lines ({order.lines?.length || 0})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-100">
                  <tr>
                    <th className="px-2 py-1 text-left">Item</th>
                    <th className="px-2 py-1 text-right">Qty</th>
                    <th className="px-2 py-1 text-right">Price</th>
                    <th className="px-2 py-1 text-right">Disc%</th>
                    <th className="px-2 py-1 text-right">Tax%</th>
                    <th className="px-2 py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.lines || []).map((l, i) => (
                    <tr key={i} className="border-b border-surface-100">
                      <td className="px-2 py-1">{l.itemCode || '—'} — {l.itemName || '—'}</td>
                      <td className="px-2 py-1 text-right">{l.quantity}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(l.unitPrice)}</td>
                      <td className="px-2 py-1 text-right">{l.discountPercent || 0}%</td>
                      <td className="px-2 py-1 text-right">{l.taxPercent || 0}%</td>
                      <td className="px-2 py-1 text-right font-semibold">{formatCurrency(l.lineTotal || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Table columns ────────────────────────────────────────────────────────────
const columns: ColumnDef<SalesOrder, unknown>[] = [
  { accessorKey: 'orderNumber', header: 'Order #', cell: ({ getValue }) => <span className="font-mono text-xs font-medium">{String(getValue())}</span> },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'orderDate', header: 'Date', cell: ({ getValue }) => <span className="text-xs">{formatDate(String(getValue()))}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => {
    const s = String(getValue());
    const m = STATUS_MAP[s] || { label: s, variant: 'neutral' as const };
    return <StatusBadge status={m.label} variant={m.variant} />;
  }},
  { accessorKey: 'totalAmount', header: 'Total', cell: ({ getValue }) => <span className="font-semibold tabular">{formatCurrency(Number(getValue()))}</span> },
  { accessorKey: 'currency', header: 'Ccy', cell: ({ getValue }) => <span className="text-xs text-surface-500">{String(getValue())}</span> },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SalesOrdersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: orders, isLoading } = useSalesOrders();

  const handleRowClick = (order: SalesOrder) => {
    if (order.status === 'DRAFT') {
      setEditId(order.id);
    } else {
      setDetailId(order.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900">Sales Orders</h1>
          <p className="text-sm text-surface-500 mt-0.5">Manage customer sales orders and deliveries</p>
        </div>
        <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => { setEditId(null); setShowCreate(true); }}>
          New Sales Order
        </Button>
      </div>

      {/* Table */}
      <DataTable
        data={orders ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage="No sales orders found"
        emptyDescription="Create your first sales order to get started."
        searchPlaceholder="Search orders..."
        onRowClick={handleRowClick}
      />

      {/* Create/Edit Modal */}
      <SOModal open={showCreate || !!editId} onClose={() => { setShowCreate(false); setEditId(null); }} editId={editId} />

      {/* Detail Modal */}
      <DetailModal open={!!detailId} onClose={() => setDetailId(null)} orderId={detailId} />
    </div>
  );
}
