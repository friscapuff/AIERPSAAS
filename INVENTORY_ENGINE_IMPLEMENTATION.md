# Inventory Engine Implementation Guide

## Overview

The Inventory Engine is a comprehensive stock management system for the AiERP platform. It handles product management, warehouse operations, stock tracking, and movement history.

## Architecture

### Layered Design

```
┌─────────────────────────────────┐
│      API Controllers            │  (HTTP requests)
├─────────────────────────────────┤
│       Services                  │  (Business logic)
├─────────────────────────────────┤
│     Repositories                │  (Data access)
├─────────────────────────────────┤
│    Entities & Database          │  (Persistence)
└─────────────────────────────────┘
```

## Core Components

### 1. Entities

#### Product Entity
Represents a product in the inventory system.

```typescript
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('varchar', { unique: true })
  sku: string;

  @Column('varchar')
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar')
  category: string;

  @Column('varchar')
  unitOfMeasure: string;

  @Column('numeric', { precision: 10, scale: 2 })
  unitCost: number;

  @Column('numeric', { precision: 10, scale: 2 })
  sellingPrice: number;

  @Column('integer')
  reorderLevel: number;

  @Column('integer')
  leadTimeDays: number;

  @Column('boolean', { default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('uuid')
  createdBy: string;

  @Column('uuid')
  updatedBy: string;
}
```

#### Stock Entity
Tracks stock levels by product and warehouse.

```typescript
@Entity('stock')
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  productId: string;

  @Column('uuid')
  warehouseId: string;

  @Column('integer', { default: 0 })
  quantityOnHand: number;

  @Column('integer', { default: 0 })
  quantityReserved: number;

  @Column('timestamp', { nullable: true })
  lastCountDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get quantityAvailable(): number {
    return this.quantityOnHand - this.quantityReserved;
  }
}
```

#### StockMovement Entity
Records all stock movements for audit trail.

```typescript
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  productId: string;

  @Column('uuid')
  warehouseId: string;

  @Column('enum', { enum: MovementType })
  movementType: MovementType;

  @Column('integer')
  quantity: number;

  @Column('varchar', { nullable: true })
  referenceType: string;

  @Column('varchar', { nullable: true })
  referenceId: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column('uuid')
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;
}

enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
}
```

### 2. Repository Layer

Handles database queries and data persistence.

```typescript
@Injectable()
export class StockRepository extends Repository<Stock> {
  constructor(private dataSource: DataSource) {
    super(Stock, dataSource.createEntityManager());
  }

  async findByProductAndWarehouse(
    tenantId: string,
    productId: string,
    warehouseId: string,
  ): Promise<Stock | null> {
    return this.findOne({
      where: { tenantId, productId, warehouseId },
    });
  }

  async findProductStock(tenantId: string, productId: string): Promise<Stock[]> {
    return this.find({
      where: { tenantId, productId },
    });
  }

  async findLowStock(tenantId: string): Promise<Stock[]> {
    return this.query(`
      SELECT s.* FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE s.tenant_id = $1
      AND s.quantity_on_hand <= p.reorder_level
    `, [tenantId]);
  }
}
```

### 3. Service Layer

Contains business logic and orchestrates repositories.

```typescript
@Injectable()
export class StockService {
  constructor(
    private stockRepository: StockRepository,
    private movementRepository: StockMovementRepository,
    private auditService: AuditService,
  ) {}

  async getStockLevel(
    tenantId: string,
    productId: string,
    warehouseId?: string,
  ): Promise<StockLevelDto> {
    if (warehouseId) {
      const stock = await this.stockRepository.findByProductAndWarehouse(
        tenantId,
        productId,
        warehouseId,
      );
      return this.mapToDto(stock);
    } else {
      const stocks = await this.stockRepository.findProductStock(
        tenantId,
        productId,
      );
      return this.aggregateStocks(stocks);
    }
  }

  async updateStock(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
    movementType: MovementType,
    referenceId?: string,
    userId?: string,
  ): Promise<Stock> {
    const stock = await this.stockRepository.findByProductAndWarehouse(
      tenantId,
      productId,
      warehouseId,
    );

    if (!stock) {
      throw new StockNotFoundException();
    }

    // Validate sufficient stock for OUT movements
    if (movementType === MovementType.OUT) {
      if (stock.quantityAvailable < quantity) {
        throw new InsufficientStockException();
      }
    }

    // Update stock based on movement type
    switch (movementType) {
      case MovementType.IN:
        stock.quantityOnHand += quantity;
        break;
      case MovementType.OUT:
        stock.quantityOnHand -= quantity;
        break;
      case MovementType.ADJUSTMENT:
        stock.quantityOnHand = quantity;
        break;
    }

    // Record movement
    await this.movementRepository.save({
      tenantId,
      productId,
      warehouseId,
      movementType,
      quantity,
      referenceId,
      createdBy: userId,
    });

    // Audit the change
    await this.auditService.log({
      tenantId,
      userId,
      action: 'UPDATE_STOCK',
      entityType: 'Stock',
      entityId: stock.id,
      changes: { quantityOnHand: stock.quantityOnHand },
    });

    return this.stockRepository.save(stock);
  }

  async reserveStock(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number,
    referenceId: string,
    userId?: string,
  ): Promise<Stock> {
    const stock = await this.stockRepository.findByProductAndWarehouse(
      tenantId,
      productId,
      warehouseId,
    );

    if (!stock) {
      throw new StockNotFoundException();
    }

    if (stock.quantityAvailable < quantity) {
      throw new InsufficientStockException();
    }

    stock.quantityReserved += quantity;
    await this.stockRepository.save(stock);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'RESERVE_STOCK',
      entityType: 'Stock',
      entityId: stock.id,
      changes: { quantityReserved: stock.quantityReserved },
    });

    return stock;
  }
}
```

### 4. Controller Layer

Handles HTTP requests and responses.

```typescript
@Controller('api/v1/inventory')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private stockService: StockService,
  ) {}

  @Post('products')
  @Roles('ADMIN', 'INVENTORY_MANAGER')
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User,
    @Tenant() tenantId: string,
  ): Promise<ProductDto> {
    return this.inventoryService.createProduct(
      tenantId,
      createProductDto,
      user.id,
    );
  }

  @Get('stock/:productId/warehouse/:warehouseId')
  @Roles('ADMIN', 'INVENTORY_VIEWER')
  async getStock(
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string,
    @Tenant() tenantId: string,
  ): Promise<StockLevelDto> {
    return this.stockService.getStockLevel(tenantId, productId, warehouseId);
  }

  @Post('stock/adjust')
  @Roles('ADMIN', 'INVENTORY_MANAGER')
  async adjustStock(
    @Body() adjustmentDto: StockAdjustmentDto,
    @CurrentUser() user: User,
    @Tenant() tenantId: string,
  ): Promise<StockLevelDto> {
    return this.stockService.updateStock(
      tenantId,
      adjustmentDto.productId,
      adjustmentDto.warehouseId,
      adjustmentDto.quantity,
      MovementType.ADJUSTMENT,
      undefined,
      user.id,
    );
  }
}
```

## Data Flow

### Stock Adjustment Flow

1. User sends adjustment request via API
2. Controller validates input and authorization
3. Service verifies stock exists and has sufficient quantity
4. Stock quantity is updated
5. Movement record is created
6. Audit log is recorded
7. Response is returned to user

### Stock Transfer Flow

1. Validate source warehouse has sufficient stock
2. Decrement source warehouse stock (OUT movement)
3. Increment destination warehouse stock (IN movement)
4. Record both movements
5. Create audit trail
6. Return result

## Key Features

### Multi-Tenancy
- All queries filtered by tenant_id
- RLS policies enforce tenant isolation
- Cross-tenant data access prevented

### Audit Trail
- All stock movements recorded
- User tracking
- Timestamp recording
- Change reason tracking

### Validation
- Stock availability checks
- Warehouse capacity validation
- SKU uniqueness per tenant
- Positive quantity validation

### Performance
- Database indexes on common queries
- Efficient aggregation queries
- Query optimization
- Connection pooling

## Usage Examples

### Create Product
```bash
POST /api/v1/inventory/products
{
  "sku": "PROD-001",
  "name": "Widget A",
  "category": "Widgets",
  "unitOfMeasure": "EA",
  "unitCost": 10.00,
  "sellingPrice": 25.00,
  "reorderLevel": 10
}
```

### Adjust Stock
```bash
POST /api/v1/inventory/stock/adjust
{
  "productId": "uuid",
  "warehouseId": "uuid",
  "quantity": 100,
  "adjustmentType": "RECEIVE",
  "reason": "PO #12345"
}
```

### Transfer Stock
```bash
POST /api/v1/inventory/stock/transfer
{
  "productId": "uuid",
  "sourceWarehouseId": "uuid",
  "destinationWarehouseId": "uuid",
  "quantity": 50,
  "referenceId": "TRANSFER-001"
}
```
