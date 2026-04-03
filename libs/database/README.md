# AiERP Database Library

Shared database entities and configuration for the AiERP multi-tenant SaaS platform.

## Overview

This library contains:
- TypeORM entity definitions for all core business concepts
- Shared database configuration
- Database migration infrastructure
- Row-Level Security (RLS) policies for multi-tenancy

## Entities

### Multi-Tenancy
- **Tenant**: Represents a tenant/organization
- **User**: User accounts within a tenant
- **Role**: Role-based access control definitions

### Financial
- **ChartOfAccounts**: Chart of accounts structure
- **GLTransaction**: General ledger transactions
- **FinancialPeriod**: Accounting periods
- **AccountingTemplate**: Reusable templates

### Operations
- **InventoryLog**: Inventory movements
- **Webhook**: External webhook configurations
- **Workflow**: Business workflow definitions

### Audit & Admin
- **AuditLog**: Comprehensive audit trail
- **MetadataRegistry**: Dynamic metadata storage

## Usage

```typescript
import { ChartOfAccounts, GLTransaction } from '@database';

// Entities are exported from index.ts
```

## Configuration

Database configuration is handled by the main API application via TypeORM configuration files.

## Row-Level Security

All entities support Row-Level Security (RLS) policies in PostgreSQL:

```sql
-- Example policy
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

## Migrations

Migrations are stored in `apps/api/src/database/migrations/`

Run migrations with:
```bash
npm run migration:run
```

## Development

When adding new entities:
1. Create entity file in `src/entities/`
2. Export from `src/entities/index.ts`
3. Register with TypeOrmModule in app module
4. Create migration for schema changes

## Notes

- All entities include `tenantId` for multi-tenancy
- All entities include timestamp fields (`createdAt`, `updatedAt`)
- Use UUIDs for primary keys
- Implement soft deletes with `deletedAt` field where needed
