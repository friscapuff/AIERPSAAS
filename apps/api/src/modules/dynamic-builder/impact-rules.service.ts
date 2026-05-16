import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ImpactRule, ImpactType } from '@libs/database/entities/impact-rule.entity';
import { MetadataRegistry, DynamicData } from '@libs/database';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImpactRulesService {
  private readonly logger = new Logger(ImpactRulesService.name);

  constructor(
    @InjectRepository(ImpactRule)
    private readonly ruleRepo: Repository<ImpactRule>,
    @InjectRepository(MetadataRegistry)
    private readonly metadataRepo: Repository<MetadataRegistry>,
    @InjectRepository(DynamicData)
    private readonly dynamicDataRepo: Repository<DynamicData>,
    private readonly dataSource: DataSource,
  ) {}

  async listRules(tenantId: string, tableName?: string) {
    const where: any = { tenantId };
    if (tableName) where.tableName = tableName;
    return this.ruleRepo.find({ where, order: { priority: 'DESC', createdAt: 'DESC' } });
  }

  async getRule(tenantId: string, id: string) {
    const rule = await this.ruleRepo.findOne({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Impact rule not found');
    return rule;
  }

  async createRule(tenantId: string, userId: string, dto: any) {
    const table = await this.metadataRepo.findOne({ where: { tenant_id: tenantId, table_name: dto.tableName } });
    if (!table) throw new BadRequestException(`Table "${dto.tableName}" does not exist`);

    const rule = this.ruleRepo.create({
      tenantId,
      tableName: dto.tableName,
      ruleName: dto.ruleName,
      description: dto.description || null,
      triggerStatus: dto.triggerStatus,
      impactType: dto.impactType,
      config: dto.config,
      isActive: dto.isActive ?? true,
      priority: dto.priority ?? 0,
      createdBy: userId,
    });

    return this.ruleRepo.save(rule);
  }

  async updateRule(tenantId: string, id: string, dto: any) {
    const rule = await this.getRule(tenantId, id);
    if (dto.ruleName !== undefined) rule.ruleName = dto.ruleName;
    if (dto.description !== undefined) rule.description = dto.description;
    if (dto.triggerStatus !== undefined) rule.triggerStatus = dto.triggerStatus;
    if (dto.impactType !== undefined) rule.impactType = dto.impactType;
    if (dto.config !== undefined) rule.config = dto.config;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;
    if (dto.priority !== undefined) rule.priority = dto.priority;
    return this.ruleRepo.save(rule);
  }

  async deleteRule(tenantId: string, id: string) {
    const rule = await this.getRule(tenantId, id);
    await this.ruleRepo.remove(rule);
  }

  // Fire all active impact rules for a status transition
  async executeImpacts(tenantId: string, tableName: string, recordId: string, newStatus: string): Promise<{ executed: number; results: any[] }> {
    const rules = await this.ruleRepo.find({
      where: { tenantId, tableName, triggerStatus: newStatus, isActive: true },
      order: { priority: 'DESC' },
    });

    if (rules.length === 0) return { executed: 0, results: [] };

    const record = await this.dynamicDataRepo.findOne({ where: { id: recordId, tenant_id: tenantId, table_name: tableName } });
    if (!record) return { executed: 0, results: [] };

    const results: any[] = [];

    for (const rule of rules) {
      try {
        const result = await this.executeRule(tenantId, rule, record.data, record.created_by);
        results.push({ ruleName: rule.ruleName, impactType: rule.impactType, success: true, result });
      } catch (error) {
        this.logger.error(`Impact rule "${rule.ruleName}" failed: ${(error as Error).message}`);
        results.push({ ruleName: rule.ruleName, impactType: rule.impactType, success: false, error: (error as Error).message });
      }
    }

    return { executed: results.filter((r) => r.success).length, results };
  }

  private async executeRule(tenantId: string, rule: ImpactRule, recordData: Record<string, any>, userId: string): Promise<any> {
    const cfg = rule.config as any;

    switch (rule.impactType) {
      case ImpactType.GL_POSTING:
        return this.executeGlPosting(tenantId, cfg, recordData, userId);
      case ImpactType.INVENTORY_MOVEMENT:
        return this.executeInventoryMovement(tenantId, cfg, recordData, userId);
      case ImpactType.RECORD_CREATE:
        return this.executeRecordCreate(tenantId, cfg, recordData, userId);
      case ImpactType.FIELD_UPDATE:
        return this.executeFieldUpdate(tenantId, cfg, recordData);
      case ImpactType.CRM_LOG:
        return this.executeCrmLog(tenantId, cfg, recordData, userId);
      case ImpactType.WEBHOOK:
        return { type: 'WEBHOOK', message: 'Webhook dispatch delegated to webhook module' };
      default:
        return { type: 'UNKNOWN', message: 'Impact type not implemented' };
    }
  }

  private async executeGlPosting(tenantId: string, cfg: any, data: Record<string, any>, userId: string) {
    const journalId = uuidv4();
    const entries = cfg.entries || [];
    const glLines: any[] = [];

    for (const entry of entries) {
      const accountCode = entry.accountCodeFixed || data[entry.accountCodeField];
      const debit = entry.debitField ? Number(data[entry.debitField]) || 0 : 0;
      const credit = entry.creditField ? Number(data[entry.creditField]) || 0 : 0;
      const description = this.interpolateTemplate(entry.descriptionTemplate || '', data);

      if (accountCode && (debit > 0 || credit > 0)) {
        glLines.push({ tenantId, journalId, accountCode, debit, credit, description, userId });
      }
    }

    // Insert GL lines via raw query (gl_transactions table)
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      for (const line of glLines) {
        await qr.query(
          `INSERT INTO gl_transactions (id, tenant_id, journal_id, account_id, debit, credit, posting_date, source_doc_type, description, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, (SELECT id FROM chart_of_accounts WHERE tenant_id = $2 AND code = $4 LIMIT 1), $5, $6, NOW(), 'DYNAMIC_IMPACT', $7, $8, NOW(), NOW())`,
          [uuidv4(), line.tenantId, line.journalId, line.accountCode, line.debit, line.credit, line.description, line.userId],
        );
      }
      await qr.commitTransaction();
      return { type: 'GL_POSTING', journalId, linesCreated: glLines.length };
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  private async executeInventoryMovement(tenantId: string, cfg: any, data: Record<string, any>, userId: string) {
    const itemId = data[cfg.itemField];
    const warehouseId = data[cfg.warehouseField];
    const quantity = Number(data[cfg.quantityField]) || 0;
    const unitCost = Number(data[cfg.unitCostField]) || 0;

    await this.dataSource.query(
      `INSERT INTO inventory_logs (id, tenant_id, item_id, warehouse_id, movement_type, quantity, unit_cost, total_cost, reference_type, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DYNAMIC_IMPACT', $9, NOW(), NOW())`,
      [uuidv4(), tenantId, itemId, warehouseId, cfg.movementType, quantity, unitCost, quantity * unitCost, userId],
    );

    return { type: 'INVENTORY_MOVEMENT', itemId, warehouseId, quantity, movementType: cfg.movementType };
  }

  private async executeRecordCreate(tenantId: string, cfg: any, data: Record<string, any>, userId: string) {
    const targetData: Record<string, any> = {};
    for (const mapping of (cfg.fieldMapping || [])) {
      const value = data[mapping.sourceFieldOrValue] !== undefined ? data[mapping.sourceFieldOrValue] : mapping.sourceFieldOrValue;
      targetData[mapping.targetField] = value;
    }

    const record = this.dynamicDataRepo.create({
      id: uuidv4(),
      tenant_id: tenantId,
      table_name: cfg.targetTable,
      data: targetData,
      created_by: userId,
    });

    await this.dynamicDataRepo.save(record);
    return { type: 'RECORD_CREATE', targetTable: cfg.targetTable, recordId: record.id };
  }

  private async executeFieldUpdate(tenantId: string, cfg: any, data: Record<string, any>) {
    const targetRecordId = data[cfg.targetRecordField];
    if (!targetRecordId) return { type: 'FIELD_UPDATE', skipped: true, reason: 'No target record ID' };

    const record = await this.dynamicDataRepo.findOne({
      where: { id: targetRecordId, tenant_id: tenantId, table_name: cfg.targetTable },
    });
    if (!record) return { type: 'FIELD_UPDATE', skipped: true, reason: 'Target record not found' };

    for (const update of (cfg.updates || [])) {
      record.data[update.field] = data[update.valueOrExpression] !== undefined ? data[update.valueOrExpression] : update.valueOrExpression;
    }

    await this.dynamicDataRepo.save(record);
    return { type: 'FIELD_UPDATE', targetTable: cfg.targetTable, recordId: targetRecordId };
  }

  private async executeCrmLog(tenantId: string, cfg: any, data: Record<string, any>, userId: string) {
    const crmData = {
      customer: data[cfg.customerField],
      activity_type: cfg.activityType,
      description: this.interpolateTemplate(cfg.descriptionTemplate || '', data),
      date: new Date().toISOString(),
    };

    const record = this.dynamicDataRepo.create({
      id: uuidv4(),
      tenant_id: tenantId,
      table_name: 'crm_activity_log',
      data: crmData,
      created_by: userId,
    });

    await this.dynamicDataRepo.save(record);
    return { type: 'CRM_LOG', recordId: record.id };
  }

  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ''));
  }
}
