# TypeORM Configuration for AiERP

## Overview

AiERP uses TypeORM as the ORM for database access with PostgreSQL as the primary database. The configuration supports both development and production environments with multi-tenancy support.

## Configuration File Structure

### Development Configuration

Development uses connection pooling and logging for debugging:

```typescript
// Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=aierp
DB_SCHEMA=public
DB_LOGGING=true      // Enable SQL logging in development
DB_SYNCHRONIZE=false // Do not auto-sync schema
DB_MIGRATIONS_RUN=true // Run migrations on startup
```

### Production Configuration

Production configuration emphasizes performance and security:

```typescript
DB_HOST=db-host
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=secure-password
DB_DATABASE=aierp
DB_SCHEMA=public
DB_LOGGING=false     // Disable logging for performance
DB_SYNCHRONIZE=false // Use migrations only
DB_MIGRATIONS_RUN=true // Run migrations on startup
```

## Entity Organization

### Shared Database Library

All TypeORM entities are defined in the shared `libs/database` library:

```
libs/database/
├── src/
│   ├── entities/
│   │   ├── tenant.entity.ts
│   │   ├── user.entity.ts
│   │   ├── chart-of-accounts.entity.ts
│   │   ├── gl-transaction.entity.ts
│   │   ├── financial-period.entity.ts
│   │   ├── accounting-template.entity.ts
│   │   ├── inventory-log.entity.ts
│   │   ├── audit-log.entity.ts
│   │   ├── role.entity.ts
│   │   ├── webhook.entity.ts
│   │   ├── workflow.entity.ts
│   │   ├── metadata-registry.entity.ts
│   │   └── index.ts (exports all entities)
│   └── index.ts (library entry point)
└── README.md
```

### Entity Base Class

All entities extend a base class with common fields:

```typescript
export class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
```

## Core Entities

### Multi-Tenancy Entities

#### Tenant Entity
- `id`: UUID primary key
- `name`: Tenant display name
- `slug`: Unique identifier for tenant
- `description`: Tenant description
- `subscriptionTier`: free, pro, enterprise
- `status`: active, inactive, suspended

#### User Entity
- `id`: UUID primary key
- `tenantId`: Foreign key to tenant
- `email`: Unique within tenant
- `passwordHash`: Bcrypt hashed password
- `firstName`, `lastName`: User name
- `status`: active, inactive, suspended

#### Role Entity
- `id`: UUID primary key
- `tenantId`: Tenant-specific role
- `roleName`: e.g., admin, accountant, manager
- `permissions`: JSONB array of permission strings
- `isSystemRole`: Built-in vs custom role

### Financial Entities

#### Chart of Accounts Entity
- `accountNumber`: Unique within tenant
- `accountName`: Display name
- `accountType`: asset, liability, equity, revenue, expense
- `normalBalance`: debit or credit
- `parentAccountId`: For account hierarchy
- `isActive`: Whether account is active

#### GL Transaction Entity
- `transactionDate`: Date of transaction
- `description`: Transaction description
- `debitAmount`: Debit side amount
- `creditAmount`: Credit side amount
- `accountId`: Reference to chart of accounts
- `referenceNumber`: External reference (invoice, check #, etc.)
- `createdBy`: User ID of creator

#### Financial Period Entity
- `periodName`: e.g., "January 2024"
- `startDate`: Period start date
- `endDate`: Period end date
- `status`: open, closed, locked

#### Accounting Template Entity
- `templateName`: Display name
- `templateType`: e.g., "invoice", "expense"
- `definition`: JSONB with template structure
- `isActive`: Template availability

### Operational Entities

#### Inventory Log Entity
- `productId`: Reference to product
- `warehouseId`: Warehouse location
- `quantity`: Quantity moved
- `movementType`: in, out, adjustment
- `referenceId`: Purchase order, sales order, etc.

#### Webhook Entity
- `eventType`: Type of event to listen for
- `url`: Webhook endpoint URL
- `headers`: JSONB with custom headers
- `isActive`: Webhook enabled status
- `retryCount`: Number of retry attempts

#### Workflow Entity
- `workflowName`: Display name
- `description`: Workflow description
- `definition`: JSONB with workflow steps
- `isActive`: Workflow enabled status

### Audit & Configuration Entities

#### Audit Log Entity
- `userId`: User performing action
- `entityType`: Type of entity modified
- `entityId`: ID of entity modified
- `action`: create, update, delete, view
- `oldValues`: JSONB with previous values
- `newValues`: JSONB with new values
- `ipAddress`: Client IP
- `userAgent`: Client user agent

#### Metadata Registry Entity
- `entityType`: Type of entity
- `metadata`: JSONB with custom metadata
- Allows flexible extension without schema changes

## Migrations

### Creating Migrations

```bash
# Generate a new migration
npm run typeorm migration:create -- --name AddNewTable

# TypeORM will create a file in src/database/migrations/
```

### Migration Structure

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Forward migration
    await queryRunner.query(`CREATE TABLE ...`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback migration
    await queryRunner.query(`DROP TABLE ...`);
  }
}
```

### Running Migrations

```bash
# Run all pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert
```

## Row-Level Security (RLS)

PostgreSQL Row-Level Security policies enforce tenant isolation at the database level:

```sql
-- Enable RLS on all tenant-aware tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_transactions ENABLE ROW LEVEL SECURITY;
-- ... etc for all tenant-scoped tables

-- Create tenant isolation policy
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);
```

## Database Indexes

Key indexes for performance:

```sql
-- Tenant lookup
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- User lookup
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(tenant_id, email);

-- GL queries
CREATE INDEX idx_gl_transactions_account ON gl_transactions(account_id);
CREATE INDEX idx_gl_transactions_date ON gl_transactions(transaction_date);
CREATE INDEX idx_gl_transactions_tenant_date ON gl_transactions(tenant_id, transaction_date);

-- Audit
CREATE INDEX idx_audit_logs_tenant_date ON audit_logs(tenant_id, created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);

-- Inventory
CREATE INDEX idx_inventory_logs_tenant ON inventory_logs(tenant_id);
CREATE INDEX idx_inventory_logs_date ON inventory_logs(created_at);
```

## Connection Pooling

TypeORM uses connection pooling for database connections:

```typescript
{
  "pool": {
    "min": 2,
    "max": 10
  }
}
```

## Query Performance

### Best Practices

1. **Always include tenant_id in WHERE clauses**
   ```typescript
   const transaction = await queryBuilder
     .where('tenant_id = :tenantId', { tenantId })
     .andWhere('id = :id', { id })
     .getOne();
   ```

2. **Use query builder for complex queries**
   ```typescript
   const transactions = await queryBuilder
     .leftJoinAndSelect('transaction.account', 'account')
     .where('transaction.tenantId = :tenantId', { tenantId })
     .orderBy('transaction.transactionDate', 'DESC')
     .take(100)
     .getMany();
   ```

3. **Use pagination for large result sets**
   ```typescript
   const [transactions, total] = await repository.findAndCount({
     where: { tenantId },
     skip: (page - 1) * pageSize,
     take: pageSize,
   });
   ```

## Troubleshooting

### Connection Issues

```bash
# Verify database is accessible
pg_isready -h localhost -p 5432

# Check connection pool in logs
LOG_LEVEL=debug npm run start:dev
```

### Migration Issues

```bash
# Check migration status
npm run typeorm migration:show

# Rollback and retry
npm run migration:revert
npm run migration:run
```

### Query Performance

```bash
# Enable detailed logging
DB_LOGGING=true npm run start:dev

# Check slow query logs
SELECT query, calls, total_time FROM pg_stat_statements WHERE query LIKE '%transactions%';
```

## References

- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/sql-createpolicy.html)
