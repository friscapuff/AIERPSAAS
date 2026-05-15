import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, LessThan, Between } from 'typeorm';
import { Decimal } from 'decimal.js';
import {
  InventoryLog,
  MovementType,
  CostingMethod,
  Item,
  Warehouse,
  CostLayer,
} from '@libs/database';
import {
  CreateItemDto,
  UpdateItemDto,
  CreateWarehouseDto,
  RecordMovementDto,
  TransferStockDto,
  QueryInventoryDto,
} from './dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryLog)
    private inventoryLogRepository: Repository<InventoryLog>,
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    @InjectRepository(CostLayer)
    private costLayerRepository: Repository<CostLayer>,
    private dataSource: DataSource,
  ) {}

  async createItem(tenantId: string, createItemDto: CreateItemDto): Promise<Item> {
    const existingItem = await this.itemRepository.findOne({ where: { tenant_id: tenantId, code: createItemDto.code } });
    if (existingItem) throw new ConflictException(`Item with code "${createItemDto.code}" already exists`);

    const item = this.itemRepository.create({
      tenant_id: tenantId,
      code: createItemDto.code,
      name: createItemDto.name,
      description: createItemDto.description || null,
      category: createItemDto.category || null,
      unit_of_measure: createItemDto.unitOfMeasure,
      costing_method: createItemDto.costingMethod,
      min_stock_level: createItemDto.minStockLevel || 0,
      max_stock_level: createItemDto.maxStockLevel || 0,
    });

    return this.itemRepository.save(item);
  }

  async updateItem(tenantId: string, itemId: string, updateItemDto: UpdateItemDto): Promise<Item> {
    const item = await this.itemRepository.findOne({ where: { id: itemId, tenant_id: tenantId } });
    if (!item) throw new NotFoundException(`Item with id "${itemId}" not found`);

    if (updateItemDto.code && updateItemDto.code !== item.code) {
      const existing = await this.itemRepository.findOne({ where: { tenant_id: tenantId, code: updateItemDto.code } });
      if (existing) throw new ConflictException(`Item with code "${updateItemDto.code}" already exists`);
    }

    if (updateItemDto.costingMethod && updateItemDto.costingMethod !== item.costing_method) {
      const movements = await this.inventoryLogRepository.count({ where: { tenant_id: tenantId, item_id: itemId } });
      if (movements > 0) throw new BadRequestException('Cannot change costing method after inventory movements have been recorded');
    }

    Object.assign(item, {
      code: updateItemDto.code || item.code,
      name: updateItemDto.name || item.name,
      description: updateItemDto.description !== undefined ? updateItemDto.description : item.description,
      category: updateItemDto.category !== undefined ? updateItemDto.category : item.category,
      unit_of_measure: updateItemDto.unitOfMeasure || item.unit_of_measure,
      costing_method: updateItemDto.costingMethod || item.costing_method,
      min_stock_level: updateItemDto.minStockLevel !== undefined ? updateItemDto.minStockLevel : item.min_stock_level,
      max_stock_level: updateItemDto.maxStockLevel !== undefined ? updateItemDto.maxStockLevel : item.max_stock_level,
    });

    return this.itemRepository.save(item);
  }

  async deleteItem(tenantId: string, itemId: string): Promise<void> {
    const item = await this.itemRepository.findOne({ where: { id: itemId, tenant_id: tenantId } });
    if (!item) throw new NotFoundException(`Item with id "${itemId}" not found`);
    item.is_active = false;
    await this.itemRepository.save(item);
  }

  async getItem(tenantId: string, itemId: string): Promise<Item & { stock_balance: any }> {
    const item = await this.itemRepository.findOne({ where: { id: itemId, tenant_id: tenantId } });
    if (!item) throw new NotFoundException(`Item with id "${itemId}" not found`);
    const stockBalance = await this.getStockBalance(tenantId, itemId);
    return { ...item, stock_balance: stockBalance };
  }

  async listItems(tenantId: string, includeInactive = false): Promise<Item[]> {
    const where: any = { tenant_id: tenantId };
    if (!includeInactive) where.is_active = true;
    return this.itemRepository.find({ where, order: { created_at: 'DESC' } });
  }

  async createWarehouse(tenantId: string, createWarehouseDto: CreateWarehouseDto): Promise<Warehouse> {
    const existing = await this.warehouseRepository.findOne({ where: { tenant_id: tenantId, code: createWarehouseDto.code } });
    if (existing) throw new ConflictException(`Warehouse with code "${createWarehouseDto.code}" already exists`);

    if (createWarehouseDto.isDefault) {
      await this.warehouseRepository.update({ tenant_id: tenantId, is_default: true }, { is_default: false });
    }

    const warehouse = this.warehouseRepository.create({
      tenant_id: tenantId,
      code: createWarehouseDto.code,
      name: createWarehouseDto.name,
      address: createWarehouseDto.address || null,
      is_default: createWarehouseDto.isDefault || false,
    });

    return this.warehouseRepository.save(warehouse);
  }

  async updateWarehouse(tenantId: string, warehouseId: string, updateDto: Partial<CreateWarehouseDto>): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findOne({ where: { id: warehouseId, tenant_id: tenantId } });
    if (!warehouse) throw new NotFoundException(`Warehouse with id "${warehouseId}" not found`);

    if (updateDto.isDefault) {
      await this.warehouseRepository.update({ tenant_id: tenantId, is_default: true }, { is_default: false });
    }

    Object.assign(warehouse, {
      code: updateDto.code || warehouse.code,
      name: updateDto.name || warehouse.name,
      address: updateDto.address !== undefined ? updateDto.address : warehouse.address,
      is_default: updateDto.isDefault !== undefined ? updateDto.isDefault : warehouse.is_default,
    });

    return this.warehouseRepository.save(warehouse);
  }

  async listWarehouses(tenantId: string, includeInactive = false): Promise<Warehouse[]> {
    const where: any = { tenant_id: tenantId };
    if (!includeInactive) where.is_active = true;
    return this.warehouseRepository.find({ where, order: { is_default: 'DESC', created_at: 'ASC' } });
  }

  async recordMovement(tenantId: string, dto: RecordMovementDto): Promise<InventoryLog> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = await queryRunner.manager.findOne(Item, { where: { id: dto.itemId, tenant_id: tenantId } });
      if (!item) throw new NotFoundException(`Item with id "${dto.itemId}" not found`);

      const warehouse = await queryRunner.manager.findOne(Warehouse, { where: { id: dto.warehouseId, tenant_id: tenantId } });
      if (!warehouse) throw new NotFoundException(`Warehouse with id "${dto.warehouseId}" not found`);

      const quantity = new Decimal(dto.quantity);

      if (dto.movementType === MovementType.OUT) {
        const balance = await this.getStockBalance(tenantId, dto.itemId, dto.warehouseId, queryRunner);
        if (new Decimal(balance.total_quantity).lessThan(quantity)) {
          throw new BadRequestException(`Insufficient stock. On hand: ${balance.total_quantity}, Requested: ${quantity}`);
        }
      }

      let unitCost = new Decimal(0);
      let totalCost = new Decimal(0);

      if (dto.movementType === MovementType.IN || dto.movementType === MovementType.TRANSFER) {
        if (!dto.unitCost) throw new BadRequestException('Unit cost is required for IN and TRANSFER movements');
        unitCost = new Decimal(dto.unitCost);
        totalCost = quantity.mul(unitCost);
      } else if (dto.movementType === MovementType.OUT) {
        const costData = await this.calculateOutCost(tenantId, dto.itemId, dto.warehouseId, quantity, item.costing_method, queryRunner);
        unitCost = costData.unitCost;
        totalCost = costData.totalCost;
      } else if (dto.movementType === MovementType.ADJUST) {
        if (dto.unitCost) {
          unitCost = new Decimal(dto.unitCost);
        } else {
          const balance = await this.getStockBalance(tenantId, dto.itemId, dto.warehouseId, queryRunner);
          unitCost = new Decimal(balance.average_cost);
        }
        totalCost = quantity.mul(unitCost);
      }

      const log = queryRunner.manager.create(InventoryLog, {
        tenant_id: tenantId,
        item_id: dto.itemId,
        warehouse_id: dto.warehouseId,
        quantity: quantity.toNumber(),
        unit_cost: unitCost.toNumber(),
        total_cost: totalCost.toNumber(),
        movement_type: dto.movementType,
        costing_method: item.costing_method,
        reference_doc_type: dto.referenceDocType || null,
        reference_doc_id: dto.referenceDocId || null,
        posting_date: new Date(),
      });

      const savedLog = await queryRunner.manager.save(log);

      if (item.costing_method === CostingMethod.FIFO) {
        if (dto.movementType === MovementType.IN) {
          const layer = queryRunner.manager.create(CostLayer, { tenant_id: tenantId, item_id: dto.itemId, warehouse_id: dto.warehouseId, remaining_quantity: quantity.toNumber(), unit_cost: unitCost.toNumber(), layer_date: new Date(), reference_log_id: savedLog.id });
          await queryRunner.manager.save(layer);
        } else if (dto.movementType === MovementType.OUT) {
          await this.consumeCostLayers(tenantId, dto.itemId, dto.warehouseId, quantity, queryRunner);
        }
      }

      await queryRunner.commitTransaction();
      return savedLog;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async transferStock(tenantId: string, dto: TransferStockDto): Promise<{ outMovement: InventoryLog; inMovement: InventoryLog }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = await queryRunner.manager.findOne(Item, { where: { id: dto.itemId, tenant_id: tenantId } });
      if (!item) throw new NotFoundException(`Item with id "${dto.itemId}" not found`);

      const sourceWarehouse = await queryRunner.manager.findOne(Warehouse, { where: { id: dto.fromWarehouseId, tenant_id: tenantId } });
      const destWarehouse = await queryRunner.manager.findOne(Warehouse, { where: { id: dto.toWarehouseId, tenant_id: tenantId } });
      if (!sourceWarehouse || !destWarehouse) throw new NotFoundException('One or both warehouses not found');

      const quantity = new Decimal(dto.quantity);
      const sourceBalance = await this.getStockBalance(tenantId, dto.itemId, dto.fromWarehouseId, queryRunner);
      if (new Decimal(sourceBalance.total_quantity).lessThan(quantity)) throw new BadRequestException(`Insufficient stock at source warehouse. On hand: ${sourceBalance.total_quantity}`);

      const unitCost = new Decimal(sourceBalance.average_cost);
      const totalCost = quantity.mul(unitCost);

      const outLog = queryRunner.manager.create(InventoryLog, { tenant_id: tenantId, item_id: dto.itemId, warehouse_id: dto.fromWarehouseId, quantity: quantity.toNumber(), unit_cost: unitCost.toNumber(), total_cost: totalCost.toNumber(), movement_type: MovementType.TRANSFER, costing_method: item.costing_method, reference_doc_type: 'TRANSFER', reference_doc_id: null, posting_date: new Date() });
      const savedOutLog = await queryRunner.manager.save(outLog);

      if (item.costing_method === CostingMethod.FIFO) {
        await this.consumeCostLayers(tenantId, dto.itemId, dto.fromWarehouseId, quantity, queryRunner);
      }

      const inLog = queryRunner.manager.create(InventoryLog, { tenant_id: tenantId, item_id: dto.itemId, warehouse_id: dto.toWarehouseId, quantity: quantity.toNumber(), unit_cost: unitCost.toNumber(), total_cost: totalCost.toNumber(), movement_type: MovementType.TRANSFER, costing_method: item.costing_method, reference_doc_type: 'TRANSFER', reference_doc_id: savedOutLog.id, posting_date: new Date() });
      const savedInLog = await queryRunner.manager.save(inLog);

      if (item.costing_method === CostingMethod.FIFO) {
        const layer = queryRunner.manager.create(CostLayer, { tenant_id: tenantId, item_id: dto.itemId, warehouse_id: dto.toWarehouseId, remaining_quantity: quantity.toNumber(), unit_cost: unitCost.toNumber(), layer_date: new Date(), reference_log_id: savedInLog.id });
        await queryRunner.manager.save(layer);
      }

      await queryRunner.commitTransaction();
      return { outMovement: savedOutLog, inMovement: savedInLog };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getStockBalance(tenantId: string, itemId: string, warehouseId?: string, queryRunner?: QueryRunner): Promise<{ item_id: string; warehouse_id?: string; total_quantity: number; total_cost: number; average_cost: number }> {
    const repo = queryRunner?.manager.getRepository(InventoryLog) || this.inventoryLogRepository;
    const where: any = { tenant_id: tenantId, item_id: itemId };
    if (warehouseId) where.warehouse_id = warehouseId;

    const movements = await repo.find({ where });
    let totalQty = new Decimal(0);
    let totalCost = new Decimal(0);

    for (const movement of movements) {
      const qty = new Decimal(movement.quantity);
      const cost = new Decimal(movement.total_cost);
      if (movement.movement_type === MovementType.IN) { totalQty = totalQty.plus(qty); totalCost = totalCost.plus(cost); }
      else if (movement.movement_type === MovementType.OUT || movement.movement_type === MovementType.TRANSFER) { totalQty = totalQty.minus(qty); totalCost = totalCost.minus(cost); }
      else if (movement.movement_type === MovementType.ADJUST) { totalQty = totalQty.plus(qty); totalCost = totalCost.plus(cost); }
    }

    const avgCost = totalQty.isZero() ? new Decimal(0) : totalCost.div(totalQty);
    return { item_id: itemId, warehouse_id: warehouseId, total_quantity: totalQty.toNumber(), total_cost: totalCost.toNumber(), average_cost: avgCost.toNumber() };
  }

  async getStockValuation(tenantId: string, warehouseId?: string): Promise<any[]> {
    let query = `SELECT i.id as item_id, i.code as item_code, i.name as item_name, w.id as warehouse_id, w.code as warehouse_code, COALESCE(SUM(CASE WHEN il.movement_type IN ('IN', 'TRANSFER') THEN il.quantity ELSE -il.quantity END), 0) as total_qty, COALESCE(SUM(CASE WHEN il.movement_type IN ('IN', 'TRANSFER') THEN il.total_cost ELSE -il.total_cost END), 0) as total_cost FROM items i CROSS JOIN warehouses w LEFT JOIN inventory_logs il ON i.id = il.item_id AND w.id = il.warehouse_id AND il.tenant_id = $1 WHERE i.tenant_id = $1 AND w.tenant_id = $1`;
    const params: any[] = [tenantId];
    if (warehouseId) { query += ` AND w.id = $2`; params.push(warehouseId); }
    query += ` GROUP BY i.id, i.code, i.name, w.id, w.code`;
    const results = await this.inventoryLogRepository.query(query, params);
    return results.map((row: any) => ({ item_id: row.item_id, item_code: row.item_code, item_name: row.item_name, warehouse_id: row.warehouse_id, warehouse_code: row.warehouse_code, total_quantity: parseFloat(row.total_qty), total_cost: parseFloat(row.total_cost), average_cost: parseFloat(row.total_qty) === 0 ? 0 : parseFloat(row.total_cost) / parseFloat(row.total_qty) }));
  }

  async getMovementHistory(tenantId: string, queryDto: QueryInventoryDto): Promise<{ data: InventoryLog[]; total: number; page: number; limit: number }> {
    const where: any = { tenant_id: tenantId };
    if (queryDto.itemId) where.item_id = queryDto.itemId;
    if (queryDto.warehouseId) where.warehouse_id = queryDto.warehouseId;
    if (queryDto.movementType) where.movement_type = queryDto.movementType;
    if (queryDto.startDate && queryDto.endDate) { const end = new Date(queryDto.endDate); end.setHours(23, 59, 59, 999); where.posting_date = Between(new Date(queryDto.startDate), end); }
    else if (queryDto.startDate) where.posting_date = Between(new Date(queryDto.startDate), new Date());
    else if (queryDto.endDate) { const end = new Date(queryDto.endDate); end.setHours(23, 59, 59, 999); where.posting_date = LessThan(end); }

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 50;
    const [data, total] = await this.inventoryLogRepository.findAndCount({ where, order: { posting_date: 'DESC' }, take: limit, skip: (page - 1) * limit });
    return { data, total, page, limit };
  }

  async getLowStockAlerts(tenantId: string): Promise<any[]> {
    const items = await this.itemRepository.find({ where: { tenant_id: tenantId, is_active: true } });
    const alerts = [];
    for (const item of items) {
      const balance = await this.getStockBalance(tenantId, item.id);
      const minStock = new Decimal(item.min_stock_level);
      const currentQty = new Decimal(balance.total_quantity);
      if (currentQty.lessThan(minStock) && minStock.greaterThan(0)) {
        alerts.push({ item_id: item.id, item_code: item.code, item_name: item.name, current_qty: currentQty.toNumber(), min_stock_level: minStock.toNumber() });
      }
    }
    return alerts;
  }

  private async calculateOutCost(tenantId: string, itemId: string, warehouseId: string, quantity: Decimal, costingMethod: CostingMethod, queryRunner: QueryRunner): Promise<{ unitCost: Decimal; totalCost: Decimal }> {
    if (costingMethod === CostingMethod.FIFO) return this.calculateFIFOCost(tenantId, itemId, warehouseId, quantity, queryRunner);
    if (costingMethod === CostingMethod.WEIGHTED_AVG) return this.calculateWeightedAvgCost(tenantId, itemId, warehouseId, quantity, queryRunner);
    throw new InternalServerErrorException('Unknown costing method');
  }

  private async calculateFIFOCost(tenantId: string, itemId: string, warehouseId: string, quantity: Decimal, queryRunner: QueryRunner): Promise<{ unitCost: Decimal; totalCost: Decimal }> {
    const layers = await queryRunner.manager.find(CostLayer, { where: { tenant_id: tenantId, item_id: itemId, warehouse_id: warehouseId }, order: { layer_date: 'ASC' } });
    let remaining = quantity;
    let totalCost = new Decimal(0);
    for (const layer of layers) {
      if (remaining.isZero()) break;
      const layerQty = new Decimal(layer.remaining_quantity);
      const layerCost = new Decimal(layer.unit_cost);
      if (layerQty.gte(remaining)) { totalCost = totalCost.plus(remaining.mul(layerCost)); remaining = new Decimal(0); }
      else { totalCost = totalCost.plus(layerQty.mul(layerCost)); remaining = remaining.minus(layerQty); }
    }
    return { unitCost: quantity.isZero() ? new Decimal(0) : totalCost.div(quantity), totalCost };
  }

  private async calculateWeightedAvgCost(tenantId: string, itemId: string, warehouseId: string, quantity: Decimal, queryRunner: QueryRunner): Promise<{ unitCost: Decimal; totalCost: Decimal }> {
    const balance = await this.getStockBalance(tenantId, itemId, warehouseId, queryRunner);
    const unitCost = new Decimal(balance.average_cost);
    return { unitCost, totalCost: quantity.mul(unitCost) };
  }

  private async consumeCostLayers(tenantId: string, itemId: string, warehouseId: string, quantity: Decimal, queryRunner: QueryRunner): Promise<void> {
    const layers = await queryRunner.manager.find(CostLayer, { where: { tenant_id: tenantId, item_id: itemId, warehouse_id: warehouseId }, order: { layer_date: 'ASC' } });
    let remaining = quantity;
    for (const layer of layers) {
      if (remaining.isZero()) break;
      const layerQty = new Decimal(layer.remaining_quantity);
      if (layerQty.gte(remaining)) { layer.remaining_quantity = layerQty.minus(remaining).toNumber(); await queryRunner.manager.save(layer); remaining = new Decimal(0); }
      else { remaining = remaining.minus(layerQty); await queryRunner.manager.remove(layer); }
    }
  }
}
