# AiERP Database Schema

## Overview

The database uses PostgreSQL with a multi-tenant Row-Level Security (RLS) implementation.

## Core Tables

### Tenants & Users

```sql
-- Tenants (organizations using the platform)
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role ENUM('admin', 'manager', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, email)
);
```

### Financial Modules

```sql
-- Chart of Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('asset', 'liability', 'equity', 'revenue', 'expense'),
  balance DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entries
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  date DATE NOT NULL,
  reference VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entry Lines
CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY,
  journal_entry_id UUID REFERENCES journal_entries(id),
  account_id UUID REFERENCES accounts(id),
  debit DECIMAL(15, 2),
  credit DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Inventory Modules

```sql
-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_price DECIMAL(12, 2),
  stock_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Movements
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  product_id UUID REFERENCES products(id),
  movement_type ENUM('purchase', 'sale', 'adjustment', 'transfer'),
  quantity INTEGER,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sales & Purchasing

```sql
-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  credit_limit DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Orders
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  customer_id UUID REFERENCES customers(id),
  order_date DATE NOT NULL,
  due_date DATE,
  status ENUM('draft', 'confirmed', 'shipped', 'invoiced', 'closed'),
  total_amount DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Order Items
CREATE TABLE sales_order_items (
  id UUID PRIMARY KEY,
  sales_order_id UUID REFERENCES sales_orders(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER,
  unit_price DECIMAL(12, 2),
  line_total DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Row-Level Security (RLS)

All tables implement RLS to ensure data isolation between tenants:

```sql
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_isolation ON accounts
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

## Indexes

Key indexes for performance:

```sql
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_accounts_tenant_id ON accounts(tenant_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(date);
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id, created_at);
```

## Migrations

Migrations are stored in `packages/database/migrations/` and executed via TypeORM.
