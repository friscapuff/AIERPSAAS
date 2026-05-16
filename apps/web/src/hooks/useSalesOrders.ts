import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '@/lib/api';

// ─── Types ──────────────────���────────────────────────────���────────────────────
export interface SalesOrderLine {
  id?: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
  lineTotal?: number;
  deliveredQuantity?: number;
  unitOfMeasure?: string;
  notes?: string;
}

export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'DELIVERING'
  | 'INVOICED'
  | 'CLOSED'
  | 'CANCELLED';

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerId?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: SalesOrderStatus;
  currency: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  warehouseId?: string;
  createdBy?: string;
  createdAt: string;
  lines?: SalesOrderLine[];
}

export interface CreateSalesOrderPayload {
  customerName: string;
  customerId?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  currency?: string;
  notes?: string;
  warehouseId?: string;
  lines: SalesOrderLine[];
}

export interface UpdateSalesOrderPayload {
  customerName?: string;
  customerId?: string;
  expectedDeliveryDate?: string;
  currency?: string;
  notes?: string;
  warehouseId?: string;
  lines?: SalesOrderLine[];
}

// ─── Query Keys ─────────────────────���──────────────────────────────────��──────
const KEYS = {
  all: ['sales-orders'] as const,
  list: () => [...KEYS.all, 'list'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────��───────────
export function useSalesOrders() {
  return useQuery<SalesOrder[]>({
    queryKey: KEYS.list(),
    queryFn: () => get<SalesOrder[]>('/sales-orders'),
  });
}

export function useSalesOrder(id: string | null) {
  return useQuery<SalesOrder>({
    queryKey: KEYS.detail(id!),
    queryFn: () => get<SalesOrder>(`/sales-orders/${id}`),
    enabled: !!id,
  });
}

export function useCreateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalesOrderPayload) =>
      post<SalesOrder>('/sales-orders', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateSalesOrderPayload & { id: string }) =>
      put<SalesOrder>(`/sales-orders/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useConfirmSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<SalesOrder>(`/sales-orders/${id}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeliverSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<SalesOrder>(`/sales-orders/${id}/deliver`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useInvoiceSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<SalesOrder>(`/sales-orders/${id}/invoice`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useCloseSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<SalesOrder>(`/sales-orders/${id}/close`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useCancelSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      post<SalesOrder>(`/sales-orders/${id}/cancel`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
