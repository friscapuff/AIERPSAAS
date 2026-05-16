import { useDynamicTables } from '@/hooks/useDynamic';

export interface TableField {
  name: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'DECIMAL' | 'DATE' | 'SELECT' | 'BOOLEAN' | 'FILE' | 'LOOKUP';
}

export interface TableDefinition {
  id: string;
  name: string;
  label: string;
  fields: TableField[];
  isSystem: boolean;
}

export interface SystemScreen {
  id: string;
  name: string;
  label: string;
  path: string;
  headerTable: string;
  detailTables: string[];
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
      { name: 'customer_id', label: 'Customer', type: 'LOOKUP' },
      { name: 'customer_name', label: 'Customer Name', type: 'TEXT' },
      { name: 'order_date', label: 'Order Date', type: 'DATE' },
      { name: 'delivery_date', label: 'Delivery Date', type: 'DATE' },
      { name: 'status', label: 'Status', type: 'SELECT' },
      { name: 'total_amount', label: 'Total Amount', type: 'DECIMAL' },
      { name: 'currency', label: 'Currency', type: 'SELECT' },
      { name: 'notes', label: 'Notes', type: 'TEXT' },
      { name: 'attachments', label: 'Attachments', type: 'FILE' },
    ],
  },
  {
    id: 'system_sales_order_lines',
    name: 'sales_order_lines',
    label: 'Sales Order Lines',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'order_id', label: 'Order ID', type: 'LOOKUP' },
      { name: 'item_id', label: 'Item', type: 'LOOKUP' },
      { name: 'item_name', label: 'Item Name', type: 'TEXT' },
      { name: 'quantity', label: 'Quantity', type: 'NUMBER' },
      { name: 'unit_price', label: 'Unit Price', type: 'DECIMAL' },
      { name: 'discount', label: 'Discount %', type: 'DECIMAL' },
      { name: 'tax_rate', label: 'Tax Rate %', type: 'DECIMAL' },
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
      { name: 'vendor_id', label: 'Vendor', type: 'LOOKUP' },
      { name: 'vendor_name', label: 'Vendor Name', type: 'TEXT' },
      { name: 'order_date', label: 'Order Date', type: 'DATE' },
      { name: 'expected_date', label: 'Expected Date', type: 'DATE' },
      { name: 'status', label: 'Status', type: 'SELECT' },
      { name: 'total_amount', label: 'Total Amount', type: 'DECIMAL' },
      { name: 'currency', label: 'Currency', type: 'SELECT' },
      { name: 'notes', label: 'Notes', type: 'TEXT' },
      { name: 'attachments', label: 'Attachments', type: 'FILE' },
    ],
  },
  {
    id: 'system_purchase_order_lines',
    name: 'purchase_order_lines',
    label: 'Purchase Order Lines',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'order_id', label: 'Order ID', type: 'LOOKUP' },
      { name: 'item_id', label: 'Item', type: 'LOOKUP' },
      { name: 'item_name', label: 'Item Name', type: 'TEXT' },
      { name: 'quantity', label: 'Quantity', type: 'NUMBER' },
      { name: 'unit_price', label: 'Unit Price', type: 'DECIMAL' },
      { name: 'discount', label: 'Discount %', type: 'DECIMAL' },
      { name: 'tax_rate', label: 'Tax Rate %', type: 'DECIMAL' },
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
      { name: 'category', label: 'Category', type: 'SELECT' },
      { name: 'quantity_on_hand', label: 'Quantity on Hand', type: 'NUMBER' },
      { name: 'unit_cost', label: 'Unit Cost', type: 'DECIMAL' },
      { name: 'selling_price', label: 'Selling Price', type: 'DECIMAL' },
      { name: 'warehouse', label: 'Warehouse', type: 'SELECT' },
      { name: 'reorder_level', label: 'Reorder Level', type: 'NUMBER' },
      { name: 'barcode', label: 'Barcode', type: 'TEXT' },
      { name: 'image', label: 'Item Image', type: 'FILE' },
      { name: 'is_active', label: 'Is Active', type: 'BOOLEAN' },
    ],
  },
  {
    id: 'system_inventory_movements',
    name: 'inventory_movements',
    label: 'Inventory Movements',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'item_id', label: 'Item', type: 'LOOKUP' },
      { name: 'movement_type', label: 'Movement Type', type: 'SELECT' },
      { name: 'quantity', label: 'Quantity', type: 'NUMBER' },
      { name: 'from_warehouse', label: 'From Warehouse', type: 'SELECT' },
      { name: 'to_warehouse', label: 'To Warehouse', type: 'SELECT' },
      { name: 'reference_doc', label: 'Reference Doc', type: 'TEXT' },
      { name: 'movement_date', label: 'Movement Date', type: 'DATE' },
      { name: 'notes', label: 'Notes', type: 'TEXT' },
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
      { name: 'account_id', label: 'Account', type: 'LOOKUP' },
      { name: 'debit', label: 'Debit', type: 'DECIMAL' },
      { name: 'credit', label: 'Credit', type: 'DECIMAL' },
      { name: 'currency', label: 'Currency', type: 'SELECT' },
      { name: 'exchange_rate', label: 'Exchange Rate', type: 'DECIMAL' },
      { name: 'description', label: 'Description', type: 'TEXT' },
      { name: 'posting_date', label: 'Posting Date', type: 'DATE' },
      { name: 'reference', label: 'Reference', type: 'TEXT' },
      { name: 'attachments', label: 'Attachments', type: 'FILE' },
    ],
  },
  {
    id: 'system_gl_journals',
    name: 'gl_journals',
    label: 'GL Journals',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'journal_number', label: 'Journal Number', type: 'TEXT' },
      { name: 'journal_date', label: 'Journal Date', type: 'DATE' },
      { name: 'period_id', label: 'Period', type: 'LOOKUP' },
      { name: 'status', label: 'Status', type: 'SELECT' },
      { name: 'total_debit', label: 'Total Debit', type: 'DECIMAL' },
      { name: 'total_credit', label: 'Total Credit', type: 'DECIMAL' },
      { name: 'description', label: 'Description', type: 'TEXT' },
      { name: 'attachments', label: 'Attachments', type: 'FILE' },
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
      { name: 'parent_id', label: 'Parent Account', type: 'LOOKUP' },
      { name: 'currency', label: 'Currency', type: 'SELECT' },
      { name: 'is_active', label: 'Is Active', type: 'BOOLEAN' },
      { name: 'description', label: 'Description', type: 'TEXT' },
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
  {
    id: 'system_customers',
    name: 'customers',
    label: 'Customers',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'customer_code', label: 'Customer Code', type: 'TEXT' },
      { name: 'customer_name', label: 'Customer Name', type: 'TEXT' },
      { name: 'contact_person', label: 'Contact Person', type: 'TEXT' },
      { name: 'email', label: 'Email', type: 'TEXT' },
      { name: 'phone', label: 'Phone', type: 'TEXT' },
      { name: 'address', label: 'Address', type: 'TEXT' },
      { name: 'tax_number', label: 'Tax Number', type: 'TEXT' },
      { name: 'credit_limit', label: 'Credit Limit', type: 'DECIMAL' },
      { name: 'is_active', label: 'Is Active', type: 'BOOLEAN' },
    ],
  },
  {
    id: 'system_vendors',
    name: 'vendors',
    label: 'Vendors',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'vendor_code', label: 'Vendor Code', type: 'TEXT' },
      { name: 'vendor_name', label: 'Vendor Name', type: 'TEXT' },
      { name: 'contact_person', label: 'Contact Person', type: 'TEXT' },
      { name: 'email', label: 'Email', type: 'TEXT' },
      { name: 'phone', label: 'Phone', type: 'TEXT' },
      { name: 'address', label: 'Address', type: 'TEXT' },
      { name: 'tax_number', label: 'Tax Number', type: 'TEXT' },
      { name: 'payment_terms', label: 'Payment Terms', type: 'SELECT' },
      { name: 'is_active', label: 'Is Active', type: 'BOOLEAN' },
    ],
  },
  {
    id: 'system_employees',
    name: 'employees',
    label: 'Employees',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'employee_code', label: 'Employee Code', type: 'TEXT' },
      { name: 'full_name', label: 'Full Name', type: 'TEXT' },
      { name: 'department', label: 'Department', type: 'SELECT' },
      { name: 'position', label: 'Position', type: 'TEXT' },
      { name: 'hire_date', label: 'Hire Date', type: 'DATE' },
      { name: 'email', label: 'Email', type: 'TEXT' },
      { name: 'phone', label: 'Phone', type: 'TEXT' },
      { name: 'salary', label: 'Salary', type: 'DECIMAL' },
      { name: 'photo', label: 'Photo', type: 'FILE' },
      { name: 'is_active', label: 'Is Active', type: 'BOOLEAN' },
    ],
  },
  {
    id: 'system_warehouses',
    name: 'warehouses',
    label: 'Warehouses',
    isSystem: true,
    fields: [
      { name: 'id', label: 'ID', type: 'NUMBER' },
      { name: 'warehouse_code', label: 'Warehouse Code', type: 'TEXT' },
      { name: 'warehouse_name', label: 'Warehouse Name', type: 'TEXT' },
      { name: 'location', label: 'Location', type: 'TEXT' },
      { name: 'manager', label: 'Manager', type: 'LOOKUP' },
      { name: 'is_active', label: 'Is Active', type: 'BOOLEAN' },
    ],
  },
];

const SYSTEM_SCREENS: SystemScreen[] = [
  {
    id: 'screen_sales_orders',
    name: 'sales_orders_screen',
    label: 'Sales Orders',
    path: '/sales-orders',
    headerTable: 'sales_orders',
    detailTables: ['sales_order_lines'],
    isSystem: true,
  },
  {
    id: 'screen_purchase_orders',
    name: 'purchase_orders_screen',
    label: 'Purchase Orders',
    path: '/purchase-orders',
    headerTable: 'purchase_orders',
    detailTables: ['purchase_order_lines'],
    isSystem: true,
  },
  {
    id: 'screen_inventory',
    name: 'inventory_screen',
    label: 'Inventory Management',
    path: '/inventory',
    headerTable: 'inventory_items',
    detailTables: ['inventory_movements'],
    isSystem: true,
  },
  {
    id: 'screen_gl_journals',
    name: 'gl_journals_screen',
    label: 'Journal Entries',
    path: '/finance',
    headerTable: 'gl_journals',
    detailTables: ['gl_transactions'],
    isSystem: true,
  },
  {
    id: 'screen_chart_of_accounts',
    name: 'chart_of_accounts_screen',
    label: 'Chart of Accounts',
    path: '/finance',
    headerTable: 'chart_of_accounts',
    detailTables: [],
    isSystem: true,
  },
  {
    id: 'screen_customers',
    name: 'customers_screen',
    label: 'Customers',
    path: '/customers',
    headerTable: 'customers',
    detailTables: [],
    isSystem: true,
  },
  {
    id: 'screen_vendors',
    name: 'vendors_screen',
    label: 'Vendors',
    path: '/vendors',
    headerTable: 'vendors',
    detailTables: [],
    isSystem: true,
  },
  {
    id: 'screen_employees',
    name: 'employees_screen',
    label: 'Employees',
    path: '/employees',
    headerTable: 'employees',
    detailTables: [],
    isSystem: true,
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

export function useSystemScreens() {
  return SYSTEM_SCREENS;
}

export { SYSTEM_TABLES, SYSTEM_SCREENS };
export default useAllTables;
