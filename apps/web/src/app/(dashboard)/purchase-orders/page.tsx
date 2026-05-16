'use client';

import React, { useState } from 'react';
import {
  PlusIcon,
  CheckCircleIcon,
  TruckIcon,
  XMarkIcon,
  LockClosedIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Select, Input, Textarea } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/Badge';
import {
  usePurchaseOrders,
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useConfirmPurchaseOrder,
  useApprovePurchaseOrder,
  useReceivePurchaseOrder,
  usePartialReceivePurchaseOrder,
  useClosePurchaseOrder,
  useCancelPurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderLine,
  type CreatePurchaseOrderPayload,
} from '@/hooks/usePurchaseOrders';
import { useItems } from '@/hooks/useInventory';
import { formatCurrency, formatDate } from '@/lib/utils';
import { notify } from '@/components/ui/Toast';

// ─── Status colors ──────────────────────��──────────────────────────���──────────
const STATUS_MAP: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  DRAFT: { label: 'Draft', variant: 'neutral' },
  PENDING_APPROVAL: { label: 'Pending Approval', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'info' },
  PARTIALLY_RECEIVED: { label: 'Partial Received', variant: 'warning' },
  RECEIVED: { label: 'Received', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'neutral' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
};

// ─── Create/Edit Modal ──���────────────────────────────���────────────────────────
interface POModalProps {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
}

function POModal({ open, onClose, editId }: POModalProps) {
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const { data: editOrder } = usePurchaseOrder(editId ?? null);
  const { data: itemsData } = useItems({});
  const items = itemsData?.data ?? [];

  const [form, setForm] = useState({
    supplierName: '',
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: '',
    currency: 'JOD',
    notes: '',
    approvalThreshold: '1000',
  });
  const [lines, setLines] = useState<PurchaseOrderLine[]>([]);

  React.useEffect(() => {
    if (editOrder && editId) {
      setForm({
        supplierName: editOrder.supplierName || '',
        orderDate: editOrder.orderDate?.slice(0, 10) || '',
        expectedDeliveryDate: editOrder.expectedDeliveryDate?.slice(0, 10) || '',
        currency: editOrder.currency || 'JOD',
        notes: editOrder.notes || '',
        approvalThreshold: String(editOrder.approvalThreshold ?? 1000),
      });
      setLines(editOrder.lines || []);
    } else if (!editId) {
      setForm({ supplierName: '', orderDate: new Date().toISOString().slice(0, 10), expectedDeliveryDate: '', currency: 'JOD', notes: '', approvalThreshold: '1000' });
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
    if (!form.supplierName) { notify.error('Supplier name is required'); return; }
    if (lines.length === 0) { notify.error('Add at least one line item'); return; }

    const payload: CreatePurchaseOrderPayload = {
      supplierName: form.supplierName,
      orderDate: form.orderDate || undefined,
      expectedDeliveryDate: form.expectedDeliveryDate || undefined,
      currency: form.currency,
      notes: form.notes || undefined,
      approvalThreshold: Number(form.approvalThreshold) || 1000,
      lines,
    };

    try {
      if (editId) {
        await updatePO.mutateAsync({ id: editId, ...payload });
        notify.success('Purchase order updated');
      } else {
        await createPO.mutateAsync(payload);
        notify.success('Purchase order created');
      }
      onClose();
    } catch {
      notify.error('Failed to save purchase order');
    }
  };

  const calcLineTotal = (l: PurchaseOrderLine) => {
    const sub = l.quantity * l.unitPrice;
    const disc = sub * ((l.discountPercent || 0) / 100);
    const afterDisc = sub - disc;
    return afterDisc + afterDisc * ((l.taxPercent || 0) / 100);
  };

  const grandTotal = lines.reduce((s, l) => s + calcLineTotal(l), 0);

  return (
    <Modal open={open} onClose={onClose} title={editId ? 'Edit Purchase Order' : 'New Purchase Order'} size="lg" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button form="po-form" type="submit" loading={createPO.isPending || updatePO.isPending}>
          {editId ? 'Update' : 'Create'} Order
        </Button>
      </>
    }>
      <form id="po-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Supplier Name" required value={form.supplierName} onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))} placeholder="e.g. Global Supplies Ltd" />
          <Select label="Currency" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} options={[
            { label: 'JOD', value: 'JOD' },
            { label: 'USD', value: 'USD' },
            { label: 'EUR', value: 'EUR' },
            { label: 'SAR', value: 'SAR' },
          ]} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Order Date" type="date" value={form.orderDate} onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} />
          <Input label="Expected Delivery" type="date" value={form.expectedDeliveryDate} onChange={(e) => setForm((f) => ({ ...f, expectedDeliveryDate: e.target.value }))} />
          <Input label="Approval Threshold (JOD)" type="number" min="0" value={form.approvalThreshold} onChange={(e) => setForm((f) => ({ ...f, approvalThreshold: e.target.value }))} />
        </div>
        <Textarea label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />

        {/* Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-surface-700">Line Items</p>
            <Button type="button" size="sm" variant="secondary" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={addLine}>Add Line</Button>
          </div>
          {lines.length === 0 && <p className="text-xs text-surface-400 italic">No line items yet.</p>}
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
              {grandTotal > Number(form.approvalThreshold) && (
                <p className="text-xs text-warning-600 mt-0.5">Exceeds approval threshold — will require manager approval</p>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ─── Detail Modal ───────────────────────────────��─────────────────────────────
interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
}

function DetailModal({ open, onClose, orderId }: DetailModalProps) {
  const { data: order, isLoading } = usePurchaseOrder(orderId);
  const confirmPO = useConfirmPurchaseOrder();
  const approvePO = useApprovePurchaseOrder();
  const receivePO = useReceivePurchaseOrder();
  const partialPO = usePartialReceivePurchaseOrder();
  const closePO = useClosePurchaseOrder();
  const cancelPO = useCancelPurchaseOrder();

  if (!orderId) return null;

  const handleAction = async (action: string) => {
    try {
      switch (action) {
        case 'confirm': await confirmPO.mutateAsync(orderId); break;
        case 'approve': await approvePO.mutateAsync(orderId); break;
        case 'receive': await receivePO.mutateAsync(orderId); break;
        case 'partial': await partialPO.mutateAsync(orderId); break;
        case 'close': await closePO.mutateAsync(orderId); break;
        case 'cancel': await cancelPO.mutateAsync({ id: orderId }); break;
      }
      notify.success(`Order action completed`);
      onClose();
    } catch {
      notify.error(`Failed to perform action`);
    }
  };

  const status = order?.status;

  return (
    <Modal open={open} onClose={onClose} title={`Purchase Order ${order?.orderNumber || ''}`} size="lg" footer={
      <div className="flex items-center gap-2 flex-wrap">
        {status === 'DRAFT' && (
          <>
            <Button size="sm" onClick={() => handleAction('confirm')} leftIcon={<CheckCircleIcon className="h-4 w-4" />} loading={confirmPO.isPending}>Confirm</Button>
            <Button size="sm" variant="danger" onClick={() => handleAction('cancel')} loading={cancelPO.isPending}>Cancel</Button>
          </>
        )}
        {status === 'PENDING_APPROVAL' && (
          <>
            <Button size="sm" onClick={() => handleAction('approve')} leftIcon={<ClipboardDocumentCheckIcon className="h-4 w-4" />} loading={approvePO.isPending}>Approve</Button>
            <Button size="sm" variant="danger" onClick={() => handleAction('cancel')} loading={cancelPO.isPending}>Cancel</Button>
          </>
        )}
        {status === 'APPROVED' && (
          <>
            <Button size="sm" onClick={() => handleAction('receive')} leftIcon={<TruckIcon className="h-4 w-4" />} loading={receivePO.isPending}>Full Receive</Button>
            <Button size="sm" variant="secondary" onClick={() => handleAction('partial')} loading={partialPO.isPending}>Partial Receive</Button>
            <Button size="sm" variant="danger" onClick={() => handleAction('cancel')} loading={cancelPO.isPending}>Cancel</Button>
          </>
        )}
        {status === 'PARTIALLY_RECEIVED' && (
          <Button size="sm" onClick={() => handleAction('receive')} leftIcon={<TruckIcon className="h-4 w-4" />} loading={receivePO.isPending}>Full Receive</Button>
        )}
        {status === 'RECEIVED' && (
          <Button size="sm" onClick={() => handleAction('close')} leftIcon={<LockClosedIcon className="h-4 w-4" />} loading={closePO.isPending}>Close</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Close Dialog</Button>
      </div>
    }>
      {isLoading ? <p className="text-sm text-surface-400">Loading...</p> : order && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><span className="text-surface-500">Supplier:</span> <span className="font-medium">{order.supplierName}</span></div>
            <div><span className="text-surface-500">Status:</span> <StatusBadge status={STATUS_MAP[order.status]?.label || order.status} variant={STATUS_MAP[order.status]?.variant || 'neutral'} /></div>
            <div><span className="text-surface-500">Order Date:</span> <span>{formatDate(order.orderDate)}</span></div>
            <div><span className="text-surface-500">Delivery Date:</span> <span>{order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '—'}</span></div>
            <div><span className="text-surface-500">Currency:</span> <span>{order.currency}</span></div>
            <div><span className="text-surface-500">Total:</span> <span className="font-bold">{formatCurrency(order.totalAmount)}</span></div>
            <div><span className="text-surface-500">Threshold:</span> <span>{formatCurrency(order.approvalThreshold)}</span></div>
            {order.approvedBy && <div><span className="text-surface-500">Approved By:</span> <span>{order.approvedBy}</span></div>}
          </div>
          {order.notes && <p className="text-xs text-surface-500 bg-surface-50 p-2 rounded">Notes: {order.notes}</p>}
          <div>
            <p className="text-sm font-semibold mb-1">Lines ({order.lines?.length || 0})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-100">
                  <tr>
                    <th className="px-2 py-1 text-left">Item</th>
                    <th className="px-2 py-1 text-right">Qty</th>
                    <th className="px-2 py-1 text-right">Received</th>
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
                      <td className="px-2 py-1 text-right">{l.receivedQuantity || 0}</td>
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

// ─── Table columns ───────────────���────────────────────────────────────────────
const columns: ColumnDef<PurchaseOrder, unknown>[] = [
  { accessorKey: 'orderNumber', header: 'Order #', cell: ({ getValue }) => <span className="font-mono text-xs font-medium">{String(getValue())}</span> },
  { accessorKey: 'supplierName', header: 'Supplier' },
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
export default function PurchaseOrdersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: orders, isLoading } = usePurchaseOrders();

  const handleRowClick = (order: PurchaseOrder) => {
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
          <h1 className="text-xl font-bold text-surface-900">Purchase Orders</h1>
          <p className="text-sm text-surface-500 mt-0.5">Manage supplier orders, approvals, and goods receipt</p>
        </div>
        <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => { setEditId(null); setShowCreate(true); }}>
          New Purchase Order
        </Button>
      </div>

      {/* Info banner about approval threshold */}
      <div className="bg-info-50 border border-info-200 rounded-xl px-4 py-3 text-sm text-info-800">
        <strong>Approval workflow:</strong> Orders exceeding the approval threshold (default 1,000 JOD) will require manager approval before they can be received.
      </div>

      {/* Table */}
      <DataTable
        data={orders ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage="No purchase orders found"
        emptyDescription="Create your first purchase order to get started."
        searchPlaceholder="Search orders..."
        onRowClick={handleRowClick}
      />

      {/* Create/Edit Modal */}
      <POModal open={showCreate || !!editId} onClose={() => { setShowCreate(false); setEditId(null); }} editId={editId} />

      {/* Detail Modal */}
      <DetailModal open={!!detailId} onClose={() => setDetailId(null)} orderId={detailId} />
    </div>
  );
}
