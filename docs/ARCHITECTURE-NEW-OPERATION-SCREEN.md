# Architecture Guide: Creating a New Operation Screen

This document explains the end-to-end pattern for adding a new transactional operation screen (like Sales Orders or Purchase Orders) to AiERP. Follow these 6 layers in order.

---

## Overview: The 6 Layers

```
1. Entity (TypeORM)       → Database table definition
2. Module (NestJS)        → DI container wiring
3. Service (Business)     → Logic, validation, state machine
4. Controller (HTTP)      → REST endpoints + DTOs
5. Hook (React Query)     → Frontend API layer
6. Page (Next.js)         → UI with modals, tables, actions
```

---

## Layer 1: Entity (Database)

**Location:** `libs/database/src/entities/`

Every operation needs a **header entity** and a **line entity**.

### Header Entity Pattern

```typescript
// libs/database/src/entities/purchase-order.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PurchaseOrderLine } from './purchase-order-line.entity';

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  // ... more states
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;               // REQUIRED for multi-tenancy

  @Column({ name: 'order_number', unique: true })
  orderNumber: string;            // Auto-generated sequence

  @Column({ name: 'supplier_name' })
  supplierName: string;

  @Column({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  status: PurchaseOrderStatus;

  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0 })
  totalAmount: number;

  @OneToMany(() => PurchaseOrderLine, (line) => line.purchaseOrder, { cascade: true })
  lines: PurchaseOrderLine[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

### Key Rules:
- Always include `tenantId` column
- Use snake_case column names with camelCase properties: `@Column({ name: 'snake_case' })`
- Use decimal(15,3) for monetary fields
- Define status as a TypeScript enum
- Use `cascade: true` on the `@OneToMany` for lines
- Export the entity from `libs/database/src/entities/index.ts`

---

## Layer 2: Module (NestJS DI)

**Location:** `apps/api/src/modules/<name>/<name>.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from '@libs/database/entities/purchase-order.entity';
import { PurchaseOrderLine } from '@libs/database/entities/purchase-order-line.entity';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrder, PurchaseOrderLine])],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
```

Then register it in `apps/api/src/app.module.ts`:
```typescript
imports: [
  // ... existing modules
  PurchaseOrdersModule,
]
```

---

## Layer 3: Service (Business Logic)

**Location:** `apps/api/src/modules/<name>/<name>.service.ts`

The service is where ALL business logic lives. Key patterns:

### 3a. Auto-Numbering
```typescript
private async generateOrderNumber(tenantId: string): Promise<string> {
  const lastOrder = await this.repo.findOne({
    where: { tenantId },
    order: { orderNumber: 'DESC' },
  });
  if (!lastOrder) return 'PO-00001';
  const lastNum = parseInt(lastOrder.orderNumber.replace('PO-', ''), 10);
  return `PO-${String(lastNum + 1).padStart(5, '0')}`;
}
```

### 3b. Line Calculation
```typescript
const lineSubtotal = qty * price;
const discountAmt = lineSubtotal * (discPct / 100);
const afterDiscount = lineSubtotal - discountAmt;
const taxAmt = afterDiscount * (taxPct / 100);
const lineTotal = afterDiscount + taxAmt;
```

### 3c. State Machine
Every operation has a status workflow. Validate transitions:
```typescript
async confirm(tenantId: string, id: string) {
  const order = await this.findOne(tenantId, id);
  if (order.status !== Status.DRAFT) {
    throw new BadRequestException('Can only confirm orders in DRAFT status');
  }
  // Apply business rules (e.g., approval threshold)
  if (order.totalAmount > order.approvalThreshold) {
    order.status = Status.PENDING_APPROVAL;
  } else {
    order.status = Status.APPROVED;
  }
  return this.repo.save(order);
}
```

### 3d. Multi-Tenancy
EVERY query must filter by `tenantId`:
```typescript
async findAll(tenantId: string) {
  return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
}
```

---

## Layer 4: Controller + DTOs

**Location:** `apps/api/src/modules/<name>/<name>.controller.ts` + `dto/index.ts`

### DTO Pattern (Dual Naming)
The frontend may send camelCase or snake_case. Accept BOTH:
```typescript
export class CreatePurchaseOrderDto {
  @IsOptional() @IsString() supplier_name?: string;
  @IsOptional() @IsString() supplierName?: string;
  // ... service picks whichever is provided
}
```

### Controller Pattern
```typescript
@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get()
  async findAll(@CurrentTenant() tenantId: string) { ... }

  @Post()
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) { ... }

  @Post(':id/confirm')
  async confirm(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) { ... }
}
```

### Standard REST Endpoints
| Method | Route | Purpose |
|--------|-------|----------|
| GET | / | List all for tenant |
| GET | /:id | Get with lines |
| POST | / | Create (DRAFT) |
| PUT | /:id | Update (DRAFT only) |
| POST | /:id/confirm | Advance state |
| POST | /:id/approve | Approve (if needed) |
| POST | /:id/cancel | Cancel |

---

## Layer 5: React Query Hook

**Location:** `apps/web/src/hooks/use<Name>.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '@/lib/api';

const KEYS = {
  all: ['purchase-orders'] as const,
  list: () => [...KEYS.all, 'list'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
};

export function usePurchaseOrders() {
  return useQuery<PurchaseOrder[]>({
    queryKey: KEYS.list(),
    queryFn: () => get<PurchaseOrder[]>('/purchase-orders'),
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => post('/purchase-orders', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
```

Note: The `api.ts` client auto-unwraps the `{ data, meta }` envelope from the TransformInterceptor.

---

## Layer 6: Frontend Page

**Location:** `apps/web/src/app/(dashboard)/<name>/page.tsx`

Structure every page with:
1. **List view** — DataTable with columns, search, filter
2. **Create/Edit Modal** — form with dropdowns for linked entities (items, warehouses)
3. **Detail Modal** — read-only view with action buttons per status

### Key UI Patterns:
- Use `<Select>` for any linked entity (items → dropdown of inventory items)
- Line items use a dynamic row builder (add/remove)
- Action buttons are conditional on `order.status`
- Row click: DRAFT opens edit modal, other statuses open detail modal

---

## Checklist: Adding a New Operation

```
[ ] 1. Create header entity + line entity in libs/database/src/entities/
[ ] 2. Export both from libs/database/src/entities/index.ts
[ ] 3. Create module file with TypeOrmModule.forFeature([...])
[ ] 4. Import module in app.module.ts
[ ] 5. Create service with: findAll, findOne, create, update, state transitions
[ ] 6. Create controller with guards, decorators, DTOs
[ ] 7. Create React Query hook file
[ ] 8. Create page.tsx under (dashboard)/<name>/
[ ] 9. Add navigation link in Sidebar.tsx
[ ] 10. Test: create, list, state transitions, edit
```

---

## State Machine Diagram

### Sales Order
```
DRAFT → CONFIRMED → DELIVERING → INVOICED → CLOSED
  ↓         ↓
CANCELLED  CANCELLED
```

### Purchase Order
```
DRAFT → [if > threshold] → PENDING_APPROVAL → APPROVED → PARTIALLY_RECEIVED → RECEIVED → CLOSED
  ↓                                ↓              ↓
  ↓     [if <= threshold] ─────────────── APPROVED
  ↓         ↓                       ↓
CANCELLED  CANCELLED              CANCELLED
```

---

## Integration Points

| When | Trigger |
|------|--------|
| SO Invoiced | Create GL journal entry (Revenue DR, AR CR) |
| PO Received | Create inventory movement (RECEIPT) |
| Any state change | Fire webhook event |
| Any state change | Create audit log entry |

These integrations can be added via NestJS EventEmitter or direct service calls.
