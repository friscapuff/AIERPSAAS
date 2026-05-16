import { useDynamicTables } from '@/hooks/useDynamic';

export interface TableField {
  name: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'DECIMAL' | 'DATE' | 'SELECT' | 'BOOLEAN';
}

export interface TableDefinition {
  id: string;
  name: string;
  label: string;
  fields: TableField[];
  isSystem: boolean;
}

const SYSTEM_TABLES: TableDefinition[] = [
  {
    id: 'system_sales_orders',
    name: 'sales_orders',
    label: 'Sales Orders',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'order_number', label: 'Order Number', type: 'TEXT' },
      { name: 'customer_name', label: 'Customer Name', type: 'TEXT' },
      { name: 'order_date', label: 'Order Date', type: 'DATE' },
      { name: 'status', label: 'Status', type: 'SELECT' },
      { name: 'total_amount', label: 'Total Amount', type: 'DECIMAL' },
      { name: 'currency', label: 'Currency', type: 'TEXT' },
      { name: 'notes', label: 'Notes', type: 'TEXT' },
    ],
  },
  {
    id: 'system_sales_order_lines',
    name: 'sales_order_lines',
    label: 'Sales Order Lines',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'order_id', label: 'Order ID', type: 'NUMBER' },
      { name: 'item_name', label: 'Item Name', type: 'TEXT' },
      { name: 'quantity', label: 'Quantity', type: 'NUMBER' },
      { name: 'unit_price', label: 'Unit Price', type: 'DECIMAL' },
      { name: 'line_total', label: 'Line Total', type: 'DECIMAL' },
      { name: 'description', label: 'Description', type: 'TEXT' },
    ],
  },
  {
    id: 'system_purchase_orders',
    name: 'purchase_orders',
    label: 'Purchase Orders',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'po_number', label: 'PO Number', type: 'TEXT' },
      { name: 'vendor_name', label: 'Vendor Name', type: 'TEXT' },
      { name: 'order_date', label: 'Order Date', type: 'DATE' },
      { name: 'status', label: 'Status', type: 'SELECT' },
      { name: 'total_amount', label: 'Total Amount', type: 'DECIMAL' },
      { name: 'currency', label: 'Currency', type: 'TEXT' },
      { name: 'notes', label: 'Notes', type: 'TEXT' },
    ],
  },
  {
    id: 'system_purchase_order_lines',
    name: 'purchase_order_lines',
    label: 'Purchase Order Lines',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'order_id', label: 'Order ID', type: 'NUMBER' },
      { name: 'item_name', label: 'Item Name', type: 'TEXT' },
      { name: 'quantity', label: 'Quantity', type: 'NUMBER' },
      { name: 'unit_price', label: 'Unit Price', type: 'DECIMAL' },
      { name: 'line_total', label: 'Line Total', type: 'DECIMAL' },
      { name: 'description', label: 'Description', type: 'TEXT' },
    ],
  },
  {
    id: 'system_inventory_items',
    name: 'inventory_items',
    label: 'Inventory Items',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'item_code', label: 'Item Code', type: 'TEXT' },
      { name: 'item_name', label: 'Item Name', type: 'TEXT' },
      { name: 'category', label: 'Category', type: 'TEXT' },
      { name: 'quantity_on_hand', label: 'Quantity on Hand', type: 'NUMBER' },
      { name: 'unit_cost', label: 'Unit Cost', type: 'DECIMAL' },
      { name: 'warehouse', label: 'Warehouse', type: 'TEXT' },
      { name: 'reorder_level', label: 'Reorder Level', type: 'NUMBER' },
    ],
  },
  {
    id: 'system_gl_transactions',
    name: 'gl_transactions',
    label: 'GL Transactions',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'journal_id', label: 'Journal ID', type: 'NUMBER' },
      { name: 'account_id', label: 'Account ID', type: 'NUMBER' },
      { name: 'debit', label: 'Debit', type: 'DECIMAL' },
      { name: 'credit', label: 'Credit', type: 'DECIMAL' },
      { name: 'currency', label: 'Currency', type: 'TEXT' },
      { name: 'exchange_rate', label: 'Exchange Rate', type: 'DECIMAL' },
      { name: 'description', label: 'Description', type: 'TEXT' },
      { name: 'posting_date', label: 'Posting Date', type: 'DATE' },
    ],
  },
  {
    id: 'system_chart_of_accounts',
    name: 'chart_of_accounts',
    label: 'Chart of Accounts',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'account_code', label: 'Account Code', type: 'TEXT' },
      { name: 'account_name', label: 'Account Name', type: 'TEXT' },
      { name: 'account_type', label: 'Account Type', type: 'SELECT' },
      { name: 'parent_id', label: 'Parent ID', type: 'NUMBER' },
      { name: 'currency', label: 'Currency', type: 'TEXT' },
      { name: 'is_active', label: 'Is Active', type: 'BOOLEAN' },
    ],
  },
  {
    id: 'system_financial_periods',
    name: 'financial_periods',
    label: 'Financial Periods',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'period_name', label: 'Period Name', type: 'TEXT' },
      { name: 'start_date', label: 'Start Date', type: 'DATE' },
      { name: 'end_date', label: 'End Date', type: 'DATE' },
      { name: 'status', label: 'Status', type: 'SELECT' },
      { name: 'fiscal_year', label: 'Fiscal Year', type: 'NUMBER' },
    ],
  },
];

export function useAllTables(): TableDefinition[] {
  const { tables: dynamicTables = [] } = useDynamicTables();

  const mappedDynamic: TableDefinition[] = dynamicTables.map((dt: any) => ({
    id: dt.id || dt.name,
    name: dt.name,
    label: dt.label || dt.name,
    fields: (dt.fields || dt.columns || []).map((f: any) => ({
      name: f.name,
      label: f.label || f.name,
      type: f.type || 'TEXT',
    })),
    isSystem: false,
  }));

  return [...SYSTEM_TABLES, ...mappedDynamic];
}

export function useAllTablesGrouped() {
  const allTables = useAllTables();

  const systemTables = allTables.filter((t) => t.isSystem);
  const dynamicTables = allTables.filter((t) => !t.isSystem);

  return { systemTables, dynamicTables, allTables };
}

export { SYSTEM_TABLES };
export default useAllTables;
