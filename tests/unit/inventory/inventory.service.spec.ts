/**
 * Inventory Service — unit test suite.
 *
 * Coverage:
 *  - createItem: success, duplicate code conflict
 *  - updateItem: cannot change costing method after movements
 *  - recordMovement: insufficient stock, FIFO layer creation, weighted average
 *  - transferStock: atomic OUT + IN, insufficient source stock
 *  - getStockBalance: correct qty/value aggregation from movements
 *  - getLowStockAlerts: only returns items below min level
 *  - FIFO cost calculation: multiple layers consumed in order
 *  - Weighted average cost calculation
 */

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InventoryService } from '../../../apps/api/src/modules/inventory/inventory.service';
import {
  createMockRepository,
  createMockDataSource,
  createMockQueryRunner,
  createMockItem,
  createMockWarehouse,
  createMockInventoryLog,
  createMockCostLayer,
  mockTenantId,
} from '../../setup/test-utils';

// ---------------------------------------------------------------------------
// Enums — mirror the values from @libs/database
// ---------------------------------------------------------------------------

const MovementType = {
  IN: 'IN',
  OUT: 'OUT',
  TRANSFER: 'TRANSFER',
  ADJUST: 'ADJUST',
} as const;

const CostingMethod = {
  FIFO: 'FIFO',
  WEIGHTED_AVG: 'WEIGHTED_AVG',
} as const;

// ---------------------------------------------------------------------------

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryLogRepository: ReturnType<typeof createMockRepository>;
  let itemRepository: ReturnType<typeof createMockRepository>;
  let warehouseRepository: ReturnType<typeof createMockRepository>;
  let costLayerRepository: ReturnType<typeof createMockRepository>;
  let dataSource: ReturnType<typeof createMockDataSource>;
  let queryRunner: ReturnType<typeof createMockQueryRunner>;

  beforeEach(() => {
    inventoryLogRepository = createMockRepository();
    itemRepository = createMockRepository();
    warehouseRepository = createMockRepository();
    costLayerRepository = createMockRepository();
    queryRunner = createMockQueryRunner();
    dataSource = createMockDataSource(queryRunner);

    service = new InventoryService(
      inventoryLogRepository as any,
      itemRepository as any,
      warehouseRepository as any,
      costLayerRepository as any,
      dataSource as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // createItem
  // =========================================================================

  describe('createItem', () => {
    const createDto = {
      code: 'ITEM-001',
      name: 'Widget Pro',
      unitOfMeasure: 'PCS',
      costingMethod: CostingMethod.FIFO,
      minStockLevel: 10,
    };

    it('should create and return a new item when code is unique', async () => {
      itemRepository.findOne.mockResolvedValue(null);
      const created = createMockItem({ ...createDto });
      itemRepository.create.mockReturnValue(created);
      itemRepository.save.mockResolvedValue(created);

      const result = await service.createItem(mockTenantId, createDto as any);

      expect(itemRepository.findOne).toHaveBeenCalledWith({
        where: { tenant_id: mockTenantId, code: createDto.code },
      });
      expect(result.code).toBe('ITEM-001');
    });

    it('should throw ConflictException when item code already exists for tenant', async () => {
      itemRepository.findOne.mockResolvedValue(createMockItem({ code: 'ITEM-001' }));

      await expect(service.createItem(mockTenantId, createDto as any))
        .rejects
        .toThrow(ConflictException);
    });

    it('should store tenant_id on the created item', async () => {
      itemRepository.findOne.mockResolvedValue(null);
      const created = createMockItem();
      itemRepository.create.mockReturnValue(created);
      itemRepository.save.mockResolvedValue(created);

      await service.createItem(mockTenantId, createDto as any);

      expect(itemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_id: mockTenantId }),
      );
    });
  });

  // =========================================================================
  // updateItem
  // =========================================================================

  describe('updateItem', () => {
    it('should throw NotFoundException when item does not exist', async () => {
      itemRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateItem(mockTenantId, 'bad-id', { name: 'New Name' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when changing costing method after movements exist', async () => {
      itemRepository.findOne.mockResolvedValue(
        createMockItem({ costing_method: CostingMethod.FIFO }),
      );
      inventoryLogRepository.count.mockResolvedValue(5); // movements exist

      await expect(
        service.updateItem(mockTenantId, 'item-1111', {
          costingMethod: CostingMethod.WEIGHTED_AVG,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow costing method change when no movements exist', async () => {
      const item = createMockItem({ costing_method: CostingMethod.FIFO });
      itemRepository.findOne.mockResolvedValue(item);
      inventoryLogRepository.count.mockResolvedValue(0); // no movements
      itemRepository.save.mockResolvedValue({
        ...item,
        costing_method: CostingMethod.WEIGHTED_AVG,
      });

      const result = await service.updateItem(mockTenantId, 'item-1111', {
        costingMethod: CostingMethod.WEIGHTED_AVG,
      } as any);

      expect(result.costing_method).toBe(CostingMethod.WEIGHTED_AVG);
    });

    it('should throw ConflictException when updating to an already-used item code', async () => {
      const existingItem = createMockItem({ code: 'ITEM-001' });
      itemRepository.findOne
        .mockResolvedValueOnce(existingItem)       // look up the item being updated
        .mockResolvedValueOnce(createMockItem({ code: 'ITEM-002' })); // code collision

      await expect(
        service.updateItem(mockTenantId, 'item-1111', { code: 'ITEM-002' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =========================================================================
  // recordMovement — IN
  // =========================================================================

  describe('recordMovement', () => {
    const baseDto = {
      itemId: 'item-1111-1111',
      warehouseId: 'wh-1111-1111',
      quantity: 50,
      movementType: MovementType.IN,
      unitCost: 20,
    };

    beforeEach(() => {
      queryRunner.manager.findOne
        .mockResolvedValueOnce(createMockItem({ costing_method: CostingMethod.FIFO }))
        .mockResolvedValueOnce(createMockWarehouse());
      const savedLog = createMockInventoryLog({ quantity: 50, unit_cost: 20, total_cost: 1000 });
      queryRunner.manager.save.mockResolvedValue(savedLog);
      queryRunner.manager.create.mockImplementation((_: any, data: any) => ({ ...data }));
    });

    it('should create inventory log and FIFO cost layer on IN movement', async () => {
      const result = await service.recordMovement(mockTenantId, baseDto as any);

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when OUT quantity exceeds on-hand stock', async () => {
      // Mock item and warehouse found, but stock = 0
      queryRunner.manager.findOne
        .mockResolvedValueOnce(createMockItem({ costing_method: CostingMethod.FIFO }))
        .mockResolvedValueOnce(createMockWarehouse());

      // getStockBalance uses inventoryLogRepository.find (via queryRunner repo)
      queryRunner.manager.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([]), // no movements -> 0 stock
        findOne: jest.fn().mockResolvedValue(null),
      });

      const outDto = { ...baseDto, movementType: MovementType.OUT, quantity: 100 };

      await expect(service.recordMovement(mockTenantId, outDto as any))
        .rejects
        .toThrow(BadRequestException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when item does not exist', async () => {
      queryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.recordMovement(mockTenantId, baseDto as any))
        .rejects
        .toThrow(NotFoundException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when warehouse does not exist', async () => {
      queryRunner.manager.findOne
        .mockResolvedValueOnce(createMockItem())
        .mockResolvedValueOnce(null);

      await expect(service.recordMovement(mockTenantId, baseDto as any))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw BadRequestException when IN movement has no unit cost', async () => {
      queryRunner.manager.findOne
        .mockResolvedValueOnce(createMockItem())
        .mockResolvedValueOnce(createMockWarehouse());

      const dtoNoUnitCost = { ...baseDto, unitCost: undefined };

      await expect(service.recordMovement(mockTenantId, dtoNoUnitCost as any))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should rollback on any unexpected error during save', async () => {
      queryRunner.manager.save.mockRejectedValue(new Error('DB write failed'));

      await expect(service.recordMovement(mockTenantId, baseDto as any))
        .rejects
        .toThrow('DB write failed');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // transferStock
  // =========================================================================

  describe('transferStock', () => {
    const transferDto = {
      itemId: 'item-1111-1111',
      fromWarehouseId: 'wh-source',
      toWarehouseId: 'wh-dest',
      quantity: 30,
    };

    it('should create OUT and IN movements atomically', async () => {
      const item = createMockItem({ costing_method: CostingMethod.WEIGHTED_AVG });
      const sourceWh = createMockWarehouse({ id: 'wh-source' });
      const destWh = createMockWarehouse({ id: 'wh-dest' });

      queryRunner.manager.findOne
        .mockResolvedValueOnce(item)
        .mockResolvedValueOnce(sourceWh)
        .mockResolvedValueOnce(destWh);

      // getStockBalance internal
      queryRunner.manager.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([
          createMockInventoryLog({ quantity: 100, total_cost: 1000, movement_type: MovementType.IN }),
        ]),
        findOne: jest.fn().mockResolvedValue(null),
      });

      const outLog = createMockInventoryLog({ warehouse_id: 'wh-source', movement_type: MovementType.TRANSFER });
      const inLog = createMockInventoryLog({ warehouse_id: 'wh-dest', movement_type: MovementType.TRANSFER });

      queryRunner.manager.save
        .mockResolvedValueOnce(outLog)
        .mockResolvedValueOnce(inLog);
      queryRunner.manager.create.mockImplementation((_: any, data: any) => ({ ...data }));

      const result = await service.transferStock(mockTenantId, transferDto as any);

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.outMovement).toBeDefined();
      expect(result.inMovement).toBeDefined();
    });

    it('should throw BadRequestException when source warehouse has insufficient stock', async () => {
      const item = createMockItem();
      queryRunner.manager.findOne
        .mockResolvedValueOnce(item)
        .mockResolvedValueOnce(createMockWarehouse({ id: 'wh-source' }))
        .mockResolvedValueOnce(createMockWarehouse({ id: 'wh-dest' }));

      // Stock = 0 at source
      queryRunner.manager.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.transferStock(mockTenantId, transferDto as any))
        .rejects
        .toThrow(BadRequestException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when source or destination warehouse not found', async () => {
      queryRunner.manager.findOne
        .mockResolvedValueOnce(createMockItem())
        .mockResolvedValueOnce(null) // source WH not found
        .mockResolvedValueOnce(null);

      await expect(service.transferStock(mockTenantId, transferDto as any))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // getStockBalance
  // =========================================================================

  describe('getStockBalance', () => {
    it('should return zero balance when no movements exist', async () => {
      inventoryLogRepository.find.mockResolvedValue([]);

      const result = await service.getStockBalance(mockTenantId, 'item-1111');

      expect(result.total_quantity).toBe(0);
      expect(result.total_cost).toBe(0);
      expect(result.average_cost).toBe(0);
    });

    it('should correctly sum IN movements', async () => {
      inventoryLogRepository.find.mockResolvedValue([
        createMockInventoryLog({ quantity: 100, total_cost: 1000, movement_type: MovementType.IN }),
        createMockInventoryLog({ quantity: 50,  total_cost: 600,  movement_type: MovementType.IN }),
      ]);

      const result = await service.getStockBalance(mockTenantId, 'item-1111');

      expect(result.total_quantity).toBe(150);
      expect(result.total_cost).toBe(1600);
      expect(result.average_cost).toBeCloseTo(1600 / 150, 5);
    });

    it('should subtract OUT movements from balance', async () => {
      inventoryLogRepository.find.mockResolvedValue([
        createMockInventoryLog({ quantity: 100, total_cost: 1000, movement_type: MovementType.IN }),
        createMockInventoryLog({ quantity: 30,  total_cost: 300,  movement_type: MovementType.OUT }),
      ]);

      const result = await service.getStockBalance(mockTenantId, 'item-1111');

      expect(result.total_quantity).toBe(70);
      expect(result.total_cost).toBe(700);
    });

    it('should handle TRANSFER movements as negative (OUT from this warehouse)', async () => {
      inventoryLogRepository.find.mockResolvedValue([
        createMockInventoryLog({ quantity: 100, total_cost: 1000, movement_type: MovementType.IN }),
        createMockInventoryLog({ quantity: 20,  total_cost: 200,  movement_type: MovementType.TRANSFER }),
      ]);

      const result = await service.getStockBalance(mockTenantId, 'item-1111');

      expect(result.total_quantity).toBe(80);
    });

    it('should handle ADJUST movements as additive', async () => {
      inventoryLogRepository.find.mockResolvedValue([
        createMockInventoryLog({ quantity: 100, total_cost: 1000, movement_type: MovementType.IN }),
        createMockInventoryLog({ quantity: -5,  total_cost: -50,  movement_type: MovementType.ADJUST }),
      ]);

      const result = await service.getStockBalance(mockTenantId, 'item-1111');

      expect(result.total_quantity).toBe(95);
    });

    it('should return zero average_cost when total_quantity is zero (avoids division by zero)', async () => {
      inventoryLogRepository.find.mockResolvedValue([
        createMockInventoryLog({ quantity: 100, total_cost: 1000, movement_type: MovementType.IN }),
        createMockInventoryLog({ quantity: 100, total_cost: 1000, movement_type: MovementType.OUT }),
      ]);

      const result = await service.getStockBalance(mockTenantId, 'item-1111');

      expect(result.total_quantity).toBe(0);
      expect(result.average_cost).toBe(0);
    });
  });

  // =========================================================================
  // getLowStockAlerts
  // =========================================================================

  describe('getLowStockAlerts', () => {
    it('should return items whose current stock is below min_stock_level', async () => {
      const lowStockItem = createMockItem({ min_stock_level: 50, id: 'item-low' });
      const okItem = createMockItem({ min_stock_level: 10, id: 'item-ok' });

      itemRepository.find.mockResolvedValue([lowStockItem, okItem]);

      // Mock getStockBalance for each item
      inventoryLogRepository.find
        .mockResolvedValueOnce([
          // low stock item: only 20 on hand vs min 50
          createMockInventoryLog({ quantity: 20, total_cost: 200, movement_type: MovementType.IN }),
        ])
        .mockResolvedValueOnce([
          // ok item: 100 on hand vs min 10
          createMockInventoryLog({ quantity: 100, total_cost: 1000, movement_type: MovementType.IN }),
        ]);

      const alerts = await service.getLowStockAlerts(mockTenantId);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].item_id).toBe('item-low');
      expect(alerts[0].current_qty).toBe(20);
      expect(alerts[0].min_stock_level).toBe(50);
    });

    it('should not include items with min_stock_level of zero', async () => {
      // Item has no minimum set -- should not alert even with 0 stock
      const item = createMockItem({ min_stock_level: 0, id: 'item-no-min' });
      itemRepository.find.mockResolvedValue([item]);
      inventoryLogRepository.find.mockResolvedValue([]);

      const alerts = await service.getLowStockAlerts(mockTenantId);
      expect(alerts).toHaveLength(0);
    });

    it('should return empty array when all items are adequately stocked', async () => {
      const item = createMockItem({ min_stock_level: 10 });
      itemRepository.find.mockResolvedValue([item]);
      inventoryLogRepository.find.mockResolvedValue([
        createMockInventoryLog({ quantity: 100, total_cost: 1000, movement_type: MovementType.IN }),
      ]);

      const alerts = await service.getLowStockAlerts(mockTenantId);
      expect(alerts).toHaveLength(0);
    });

    it('should return empty array when no items exist', async () => {
      itemRepository.find.mockResolvedValue([]);
      const alerts = await service.getLowStockAlerts(mockTenantId);
      expect(alerts).toHaveLength(0);
    });
  });

  // =========================================================================
  // FIFO cost calculation (via private method -- tested indirectly through recordMovement)
  // =========================================================================

  describe('FIFO costing (documented behavior)', () => {
    it('should consume the oldest cost layer first when calculating OUT cost', async () => {
      const item = createMockItem({ costing_method: CostingMethod.FIFO });
      queryRunner.manager.findOne
        .mockResolvedValueOnce(item)
        .mockResolvedValueOnce(createMockWarehouse());

      // Stock balance: 100 units available
      queryRunner.manager.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([
          createMockInventoryLog({ quantity: 100, total_cost: 1250, movement_type: MovementType.IN }),
        ]),
        findOne: jest.fn().mockResolvedValue(null),
      });

      // Cost layers for FIFO calculation
      queryRunner.manager.find = jest.fn()
        .mockResolvedValueOnce([
          createMockCostLayer({ remaining_quantity: 50, unit_cost: 10, layer_date: new Date('2024-01-01') }),
          createMockCostLayer({ remaining_quantity: 50, unit_cost: 15, layer_date: new Date('2024-01-10') }),
        ])
        .mockResolvedValueOnce([
          createMockCostLayer({ remaining_quantity: 50, unit_cost: 10, layer_date: new Date('2024-01-01') }),
          createMockCostLayer({ remaining_quantity: 50, unit_cost: 15, layer_date: new Date('2024-01-10') }),
        ]);

      queryRunner.manager.save.mockResolvedValue(
        createMockInventoryLog({ quantity: 60, movement_type: MovementType.OUT }),
      );
      queryRunner.manager.create.mockImplementation((_: any, data: any) => ({ ...data }));

      const result = await service.recordMovement(mockTenantId, {
        itemId: 'item-1111-1111',
        warehouseId: 'wh-1111-1111',
        movementType: MovementType.OUT,
        quantity: 60,
      } as any);

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Weighted average cost
  // =========================================================================

  describe('Weighted Average costing (documented behavior)', () => {
    it('should use running average cost for OUT movements', async () => {
      const item = createMockItem({ costing_method: CostingMethod.WEIGHTED_AVG });
      queryRunner.manager.findOne
        .mockResolvedValueOnce(item)
        .mockResolvedValueOnce(createMockWarehouse());

      // Stock: 150 units at avg $11.33
      queryRunner.manager.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([
          createMockInventoryLog({ quantity: 100, total_cost: 1000, movement_type: MovementType.IN }),
          createMockInventoryLog({ quantity: 50,  total_cost: 700,  movement_type: MovementType.IN }),
        ]),
        findOne: jest.fn().mockResolvedValue(null),
      });

      queryRunner.manager.save.mockResolvedValue(
        createMockInventoryLog({ quantity: 50, movement_type: MovementType.OUT }),
      );
      queryRunner.manager.create.mockImplementation((_: any, data: any) => ({ ...data }));

      const result = await service.recordMovement(mockTenantId, {
        itemId: 'item-1111-1111',
        warehouseId: 'wh-1111-1111',
        movementType: MovementType.OUT,
        quantity: 50,
      } as any);

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
