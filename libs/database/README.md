# Database Library

Shared database configuration, entities, and utilities for AiERP SaaS platform.

## Contents

- **entities/**: TypeORM entity definitions for all data models
- **migrations/**: Database schema migrations
- **seeds/**: Database seed data
- **config/**: Database configuration

## Key Entities

- **Tenant**: Multi-tenant organization data
- **User**: User accounts with authentication
- **Role**: Role-based access control
- **AuditLog**: Comprehensive audit trail
- **ChartOfAccounts**: General Ledger structure
- **FinancialPeriod**: Fiscal periods
- **GLTransaction**: Journal entries
- **InventoryLog**: Inventory movements
- **MetadataRegistry**: Dynamic table definitions
- **Webhook**: Event subscriptions
- **Workflow**: Workflow definitions

## Usage

```typescript
import { Tenant, User, Role } from '@aierp/database';
```
