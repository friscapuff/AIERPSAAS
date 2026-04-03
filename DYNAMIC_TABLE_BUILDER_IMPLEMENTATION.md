# Dynamic Table Builder Implementation

## Overview

The Dynamic Table Builder enables users to create and manage custom tables for their tenant without code changes.

## Core Concepts

### Table Definition

```typescript
interface TableDefinition {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  description: string;
  columns: ColumnDefinition[];
  primaryKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ColumnDefinition {
  id: string;
  name: string;
  displayName: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'timestamp' | 'json';
  isRequired: boolean;
  isUnique: boolean;
  isIndexed: boolean;
  defaultValue?: any;
  validation?: ValidationRule[];
}
```

## API Endpoints

### Create Table

```
POST /api/v1/table-builder/tables
```

Request:
```json
{
  "name": "customers",
  "displayName": "Customers",
  "description": "Customer database",
  "columns": [
    {
      "name": "email",
      "displayName": "Email",
      "dataType": "string",
      "isRequired": true,
      "isUnique": true
    }
  ]
}
```

### List Tables

```
GET /api/v1/table-builder/tables
```

### Update Table

```
PATCH /api/v1/table-builder/tables/:tableId
```

### Delete Table

```
DELETE /api/v1/table-builder/tables/:tableId
```

## Implementation Details

### Schema Migration

When a table is created:

1. Table definition is stored in the `table_definitions` table
2. PostgreSQL migration is generated
3. Migration is executed to create the actual table
4. Indexes are created for indexed columns
5. Constraints are applied

### Tenant Isolation

Each table includes:
- `tenant_id` column for data isolation
- Row-Level Security (RLS) policy restricting access to tenant's data
- Audit triggers for tracking changes

## Data Type Mapping

| Data Type | PostgreSQL Type | TypeScript Type |
|-----------|-----------------|---------------|
| string | VARCHAR(255) | string |
| number | NUMERIC | number |
| boolean | BOOLEAN | boolean |
| date | DATE | Date |
| timestamp | TIMESTAMP | Date |
| json | JSONB | Record<string, any> |

