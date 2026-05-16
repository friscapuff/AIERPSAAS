import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '@/lib/api';

// ─── Types ───────────────────────────────────────────��────────────────────────
export interface PurchaseOrderLine {
  id?: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
  lineTotal?: number;
  receivedQuantity?: number;
  unitOfMeasure?: string;
  notes?: string;
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  supplierId?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: PurchaseOrderStatus;
  currency: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  approvalThreshold: number;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  warehouseId?: string;
  createdBy?: string;
  createdAt: string;
  lines?: PurchaseOrderLine[];
}

export interface CreatePurchaseOrderPayload {
  supplierName: string;
  supplierId?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  currency?: string;
  notes?: string;
  warehouseId?: string;
  approvalThreshold?: number;
  lines: PurchaseOrderLine[];
}

export interface UpdatePurchaseOrderPayload {
  supplierName?: string;
  supplierId?: string;
  expectedDeliveryDate?: string;
  currency?: string;
  notes?: string;
  warehouseId?: string;
  lines?: PurchaseOrderLine[];
}

// ─── Query Keys ────────────��───────────────────────────��──────────────────────
const KEYS = {
  all: ['purchase-orders'] as const,
  list: () => [...KEYS.all, 'list'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function usePurchaseOrders() {
  return useQuery<PurchaseOrder[]>({
    queryKey: KEYS.list(),
    queryFn: () => get<PurchaseOrder[]>('/purchase-orders'),
  });
}

export function usePurchaseOrder(id: string | null) {
  return useQuery<PurchaseOrder>({
    queryKey: KEYS.detail(id!),
    queryFn: () => get<PurchaseOrder>(`/purchase-orders/${id}`),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) =>
      post<PurchaseOrder>('/purchase-orders', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdatePurchaseOrderPayload & { id: string }) =>
      put<PurchaseOrder>(`/purchase-orders/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useConfirmPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<PurchaseOrder>(`/purchase-orders/${id}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useApprovePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<PurchaseOrder>(`/purchase-orders/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useReceivePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<PurchaseOrder>(`/purchase-orders/${id}/receive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function usePartialReceivePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<PurchaseOrder>(`/purchase-orders/${id}/partial-receive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useClosePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<PurchaseOrder>(`/purchase-orders/${id}/close`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      post<PurchaseOrder>(`/purchase-orders/${id}/cancel`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
