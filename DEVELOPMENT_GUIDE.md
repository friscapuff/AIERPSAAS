# AiERP Database Development Guide

## Quick Start for Developers

### 1. Running Migrations

Before starting the application, run the initial migration:

```bash
npm run typeorm migration:run
# or with NestJS CLI
npm run migration:run
```

This will:
- Create all 12 core tables
- Set up indexes and constraints
- Enable RLS on all tenant-scoped tables
- Create RLS policies for multi-tenant isolation

### 2. Importing Entities

```typescript
// Import from barrel export
import {
  Tenant,
  User,
  Role,
  ChartOfAccounts,
  GLTransaction,
  FinancialPeriod,
  AccountingTemplate,
  MetadataRegistry,
  InventoryLog,
  AuditLog,
  Workflow,
  Webhook,
} from '@libs/database/entities';
```

### 3. Using Repositories

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@libs/database/entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(tenantId: string, email: string): Promise<User> {
    return this.usersRepository.findOne({
      where: {
        tenant_id: tenantId,
        email,
      },
    });
  }
}
```

### 4. Multi-Tenant Context

**CRITICAL:** Always set the tenant context before queries:

```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class TenantContextService {
  constructor(private dataSource: DataSource) {}

  async withTenantContext<T>(
    tenantId: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      // Set RLS context
      await queryRunner.query(
        `SET app.current_tenant_id = $1::uuid`,
        [tenantId],
      );

      // Execute callback with context
      return await callback();
    } finally {
      await queryRunner.release();
    }
  }
}
```

**Usage:**

```typescript
// In your service
await this.tenantContextService.withTenantContext(
  tenantId,
  async () => {
    // All queries here are automatically filtered by tenant_id
    const users = await this.usersRepository.find();
    return users;
  },
);
```

### 5. Creating GL Transactions

The GL transaction table is immutable. Create entries like this:

```typescript
@Injectable()
export class GLService {
  constructor(
    @InjectRepository(GLTransaction)
    private glRepository: Repository<GLTransaction>,
  ) {}

  async postInvoice(
    tenantId: string,
    invoiceId: string,
    amount: number,
    description: string,
  ): Promise<void> {
    const journalId = uuidv4(); // Group debit+credit entries

    // Debit: Accounts Receivable
    await this.glRepository.save({
      tenant_id: tenantId,
      journal_id: journalId,
      account_id: receivablesAccountId,
      debit: amount,
      credit: 0,
      posting_date: new Date(),
      source_doc_type: 'INVOICE',
      source_doc_id: invoiceId,
      description,
      created_by: userId,
    });

    // Credit: Revenue
    await this.glRepository.save({
      tenant_id: tenantId,
      journal_id: journalId,
      account_id: revenueAccountId,
      debit: 0,
      credit: amount,
      posting_date: new Date(),
      source_doc_type: 'INVOICE',
      source_doc_id: invoiceId,
      description,
      created_by: userId,
    });
  }
}
```

### 6. Audit Logging

Audit logs are automatically created for compliance. To manually log:

```typescript
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async logChange(
    tenantId: string,
    tableName: string,
    recordId: string,
    action: AuditAction,
    userId: string,
    oldValue: any,
    newValue: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.auditRepository.save({
      tenant_id: tenantId,
      table_name: tableName,
      record_id: recordId,
      action,
      user_id: userId,
      old_value: oldValue,
      new_value: newValue,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }
}
```

### 7. Role-Based Access Control (RBAC)

Roles use JSONB permissions. Example checking permissions:

```typescript
@Injectable()
export class RBACService {
  canAccess(role: Role, module: string, action: string): boolean {
    const modulePerms = role.permissions[module];
    if (!modulePerms) return false;

    switch (action) {
      case 'create':
      case 'read':
      case 'update':
      case 'delete':
      case 'post':
      case 'void':
        return modulePerms[action] === true;
      default:
        return false;
    }
  }

  getFieldRestrictions(role: Role, field: string): 'hidden' | 'readonly' | null {
    return role.permissions.field_restrictions?.[field] ?? null;
  }
}
```

### 8. Creating Seeding Default Roles

When a tenant is created, seed default roles:

```typescript
@Injectable()
export class TenantSeederService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async seedDefaultRoles(tenantId: string): Promise<void> {
    const adminRole = this.roleRepository.create({
      tenant_id: tenantId,
      name: 'Admin',
      description: 'Full system access',
      is_system: true,
      permissions: {
        accounting: {
          create: true,
          read: true,
          update: true,
          delete: true,
          post: true,
          void: true,
        },
        sales: {
          create: true,
          read: true,
          update: true,
          delete: true,
          post: true,
          void: true,
        },
        users: {
          create: true,
          read: true,
          update: true,
          delete: true,
        },
      },
    });

    const managerRole = this.roleRepository.create({
      tenant_id: tenantId,
      name: 'Manager',
      description: 'Manager access with approvals',
      is_system: true,
      permissions: {
        accounting: {
          create: true,
          read: true,
          update: true,
          post: true,
          void: false,
        },
        sales: {
          create: true,
          read: true,
          update: true,
          post: true,
          void: false,
        },
      },
    });

    await this.roleRepository.save([adminRole, managerRole]);
  }
}
```

## More patterns and details in full documentation
