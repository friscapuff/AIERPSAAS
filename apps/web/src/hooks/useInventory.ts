import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Item {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  costMethod: 'FIFO' | 'LIFO' | 'AVERAGE' | 'SPECIFIC';
  reorderPoint?: number;
  reorderQty?: number;
  isActive: boolean;
  stockLevels: StockLevel[];
  totalStock: number;
  averageCost: number;
  totalValue: number;
}

export interface StockLevel {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  lastUpdated: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location?: string;
  isActive: boolean;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  type: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  unitCost: number;
  totalCost: number;
  reference?: string;
  notes?: string;
  date: string;
  createdAt: string;
}

export interface LowStockItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  reorderPoint: number;
  shortage: number;
}

// ─── Query keys ───────────────────────────────────────────────────────────────
export const inventoryKeys = {
  all:        ['inventory'] as const,
  items:      (params?: object) => ['inventory', 'items', params] as const,
  item:       (id: string) => ['inventory', 'items', id] as const,
  warehouses: () => ['inventory', 'warehouses'] as const,
  movements:  (params?: object) => ['inventory', 'movements', params] as const,
  lowStock:   () => ['inventory', 'low-stock'] as const,
  valuation:  () => ['inventory', 'valuation'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export interface ItemFilters {
  page?: number;
  limit?: number;
  search?: string;
  warehouseId?: string;
  category?: string;
  lowStock?: boolean;
}

export function useItems(filters: ItemFilters = {}) {
  return useQuery({
    queryKey: inventoryKeys.items(filters),
    queryFn: () => get<{ data: Item[]; meta: { total: number; page: number; limit: number; totalPages: number } }>('/inventory/items', filters as Record<string, unknown>),
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: inventoryKeys.item(id),
    queryFn: () => get<Item>(`/inventory/items/${id}`),
    enabled: !!id,
  });
}

export function useWarehouses() {
  return useQuery({
    queryKey: inventoryKeys.warehouses(),
    queryFn: () => get<Warehouse[]>('/inventory/warehouses'),
  });
}

export interface MovementFilters {
  page?: number;
  limit?: number;
  itemId?: string;
  warehouseId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export function useMovements(filters: MovementFilters = {}) {
  return useQuery({
    queryKey: inventoryKeys.movements(filters),
    queryFn: () => get<{ data: StockMovement[]; meta: object }>('/inventory/movements', filters as Record<string, unknown>),
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: () => get<LowStockItem[]>('/inventory/low-stock'),
    refetchInterval: 60_000, // refresh every minute
  });
}

export interface ValuationSummary {
  totalValue: number;
  totalItems: number;
  byCategory: { category: string; value: number; quantity: number }[];
  byWarehouse: { warehouseId: string; warehouseName: string; value: number }[];
}

export function useValuationSummary() {
  return useQuery({
    queryKey: inventoryKeys.valuation(),
    queryFn: () => get<ValuationSummary>('/inventory/valuation'),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
interface RecordMovementInput {
  itemId: string;
  warehouseId: string;
  type: StockMovement['type'];
  quantity: number;
  unitCost: number;
  reference?: string;
  notes?: string;
  date?: string;
  destinationWarehouseId?: string; // for transfers
}

export function useRecordMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordMovementInput) =>
      post<StockMovement>('/inventory/movements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export interface CreateItemInput {
  code: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  costMethod: Item['costMethod'];
  reorderPoint?: number;
  reorderQty?: number;
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateItemInput) =>
      post<Item>('/inventory/items', {
        // Map frontend field names to backend DTO field names
        code: data.code,
        name: data.name,
        description: data.description,
        category: data.category,
        unitOfMeasure: data.unit,
        costingMethod: data.costMethod,
        minStockLevel: data.reorderPoint,
        maxStockLevel: data.reorderQty,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
}
