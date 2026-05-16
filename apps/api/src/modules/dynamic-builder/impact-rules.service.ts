import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ImpactRule, ImpactType, ExecutionMode, ConditionExpression } from '@libs/database/entities/impact-rule.entity';
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

  // ===== IMPACT TYPES REFERENCE =====
  getImpactTypes() {
    return [
      { value: 'GL_POSTING', label: 'GL Posting (Accounting)', category: 'Financial', description: 'Create journal entries in the General Ledger' },
      { value: 'BUDGET_IMPACT', label: 'Budget Impact', category: 'Financial', description: 'Consume, release, or reserve budget amounts' },
      { value: 'COST_UPDATE', label: 'Cost Layer Update', category: 'Financial', description: 'Update item cost layers (FIFO/Weighted Avg/Standard)' },
      { value: 'COMMISSION_CALC', label: 'Commission Calculation', category: 'Financial', description: 'Calculate and record sales commissions' },
      { value: 'INTERCOMPANY', label: 'Intercompany Transaction', category: 'Financial', description: 'Create due-to/due-from entries between entities' },
      { value: 'INVENTORY_MOVEMENT', label: 'Inventory Movement', category: 'Supply Chain', description: 'Record stock receipt, issue, transfer, or adjustment' },
      { value: 'STOCK_PLANNING', label: 'Stock Planning / Reorder', category: 'Supply Chain', description: 'Check reorder points and auto-create purchase requisitions' },
      { value: 'CRM_LOG', label: 'CRM Activity Log', category: 'CRM', description: 'Log customer interaction or activity' },
      { value: 'RECORD_CREATE', label: 'Create Record', category: 'Data', description: 'Create a new record in any table with field mapping' },
      { value: 'FIELD_UPDATE', label: 'Update Fields', category: 'Data', description: 'Update fields on a related record' },
      { value: 'NOTIFICATION', label: 'Send Notification', category: 'Workflow', description: 'Send email, in-app, SMS, or push notification' },
      { value: 'WEBHOOK', label: 'Webhook', category: 'Workflow', description: 'Call an external HTTP endpoint' },
      { value: 'APPROVAL_TRIGGER', label: 'Trigger Approval', category: 'Workflow', description: 'Auto-submit document into an approval workflow' },
      { value: 'ANALYTICS_EVENT', label: 'Analytics Event', category: 'Analytics', description: 'Log a business event for dashboards and reporting' },
    ];
  }

  // ===== CRUD =====

  async listRules(tenantId: string, tableName?: string, groupId?: string) {
    const where: any = { tenantId };
    if (tableName) where.tableName = tableName;
    if (groupId) where.groupId = groupId;
    return this.ruleRepo.find({ where, order: { groupId: 'ASC', priority: 'DESC', createdAt: 'DESC' } });
  }

  async listGrouped(tenantId: string, tableName?: string) {
    const where: any = { tenantId };
    if (tableName) where.tableName = tableName;
    const rules = await this.ruleRepo.find({ where, order: { groupId: 'ASC', priority: 'DESC' } });

    // Group by triggerStatus + groupId
    const groups: Record<string, { groupId: string | null; groupName: string | null; tableName: string; triggerStatus: string; executionMode: string; rules: any[] }> = {};
    for (const rule of rules) {
      const key = `${rule.triggerStatus}::${rule.groupId || rule.id}`;
      if (!groups[key]) {
        groups[key] = {
          groupId: rule.groupId,
          groupName: rule.groupName,
          tableName: rule.tableName,
          triggerStatus: rule.triggerStatus,
          executionMode: rule.executionMode,
          rules: [],
        };
      }
      groups[key].rules.push(rule);
    }

    return Object.values(groups);
  }

  async getRule(tenantId: string, id: string) {
    const rule = await this.ruleRepo.findOne({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Impact rule not found');
    return rule;
  }

  async createRule(tenantId: string, userId: string, dto: any) {
    // Allow creating without strict table validation for flexibility
    const rule = this.ruleRepo.create({
      tenantId,
      tableName: dto.tableName,
      ruleName: dto.ruleName,
      description: dto.description || null,
      triggerStatus: dto.triggerStatus,
      impactType: dto.impactType,
      config: dto.config || {},
      isActive: dto.isActive ?? true,
      priority: dto.priority ?? 0,
      groupId: dto.groupId || null,
      groupName: dto.groupName || null,
      executionMode: dto.executionMode || ExecutionMode.SEQUENTIAL,
      conditionExpression: dto.conditionExpression || null,
      rollbackOnFailure: dto.rollbackOnFailure ?? true,
      createdBy: userId,
    });

    return this.ruleRepo.save(rule);
  }

  // ===== BATCH CREATE (Multi-Impact) =====
  async createBatch(
    tenantId: string,
    userId: string,
    dto: { groupName: string; tableName: string; triggerStatus: string; executionMode?: string; rules: any[] },
  ) {
    const groupId = uuidv4();
    const executionMode = dto.executionMode || ExecutionMode.TRANSACTIONAL;
    const created: ImpactRule[] = [];

    for (let i = 0; i < dto.rules.length; i++) {
      const r = dto.rules[i];
      const rule = this.ruleRepo.create({
        tenantId,
        tableName: dto.tableName,
        ruleName: r.ruleName || `${r.impactType} #${i + 1}`,
        description: r.description || null,
        triggerStatus: dto.triggerStatus,
        impactType: r.impactType,
        config: r.config || {},
        isActive: r.isActive ?? true,
        priority: r.priority ?? (dto.rules.length - i),
        groupId,
        groupName: dto.groupName,
        executionMode,
        conditionExpression: r.conditionExpression || null,
        rollbackOnFailure: r.rollbackOnFailure ?? true,
        createdBy: userId,
      });
      created.push(rule);
    }

    const saved = await this.ruleRepo.save(created);
    return { groupId, groupName: dto.groupName, rulesCreated: saved.length, rules: saved };
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
    if (dto.groupId !== undefined) rule.groupId = dto.groupId;
    if (dto.groupName !== undefined) rule.groupName = dto.groupName;
    if (dto.executionMode !== undefined) rule.executionMode = dto.executionMode;
    if (dto.conditionExpression !== undefined) rule.conditionExpression = dto.conditionExpression;
    if (dto.rollbackOnFailure !== undefined) rule.rollbackOnFailure = dto.rollbackOnFailure;
    return this.ruleRepo.save(rule);
  }

  async deleteRule(tenantId: string, id: string) {
    const rule = await this.getRule(tenantId, id);
    await this.ruleRepo.remove(rule);
  }

  async deleteGroup(tenantId: string, groupId: string) {
    await this.ruleRepo.delete({ tenantId, groupId });
  }

  // ===== EXECUTION ENGINE (Multi-Impact) =====

  async executeImpacts(
    tenantId: string,
    tableName: string,
    recordId: string,
    newStatus: string,
    userId?: string,
  ): Promise<{ executed: number; failed: number; results: any[] }> {
    const rules = await this.ruleRepo.find({
      where: { tenantId, tableName, triggerStatus: newStatus, isActive: true },
      order: { priority: 'DESC' },
    });

    if (rules.length === 0) return { executed: 0, failed: 0, results: [] };

    const record = await this.dynamicDataRepo.findOne({
      where: { id: recordId, tenant_id: tenantId, table_name: tableName },
    });
    if (!record) return { executed: 0, failed: 0, results: [] };

    const results: any[] = [];
    const recordData = record.data || {};
    const execUserId = userId || record.created_by;

    // Check if any rules require transactional execution
    const needsTransaction = rules.some((r) => r.executionMode === ExecutionMode.TRANSACTIONAL || r.rollbackOnFailure);

    if (needsTransaction) {
      // Execute ALL rules in a single DB transaction
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();

      try {
        for (const rule of rules) {
          if (!this.evaluateConditions(rule.conditionExpression, recordData)) {
            results.push({ ruleName: rule.ruleName, impactType: rule.impactType, success: true, skipped: true, reason: 'Condition not met' });
            continue;
          }

          try {
            const result = await this.executeRule(tenantId, rule, recordData, execUserId, qr);
            results.push({ ruleName: rule.ruleName, impactType: rule.impactType, success: true, result });
          } catch (error) {
            const msg = (error as Error).message;
            this.logger.error(`Impact rule "${rule.ruleName}" failed: ${msg}`);

            if (rule.rollbackOnFailure) {
              await qr.rollbackTransaction();
              await qr.release();
              return {
                executed: 0,
                failed: rules.length,
                results: [{ ruleName: rule.ruleName, impactType: rule.impactType, success: false, error: msg, rolledBack: true }],
              };
            }

            results.push({ ruleName: rule.ruleName, impactType: rule.impactType, success: false, error: msg });
          }
        }

        await qr.commitTransaction();
        await qr.release();
      } catch (e) {
        if (qr.isTransactionActive) await qr.rollbackTransaction();
        await qr.release();
        throw e;
      }
    } else {
      // Non-transactional: fire-and-forget style
      for (const rule of rules) {
        if (!this.evaluateConditions(rule.conditionExpression, recordData)) {
          results.push({ ruleName: rule.ruleName, impactType: rule.impactType, success: true, skipped: true });
          continue;
        }

        try {
          const result = await this.executeRule(tenantId, rule, recordData, execUserId);
          results.push({ ruleName: rule.ruleName, impactType: rule.impactType, success: true, result });
        } catch (error) {
          this.logger.error(`Impact rule "${rule.ruleName}" failed: ${(error as Error).message}`);
          results.push({ ruleName: rule.ruleName, impactType: rule.impactType, success: false, error: (error as Error).message });
        }
      }
    }

    return {
      executed: results.filter((r) => r.success && !r.skipped).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  // ===== CONDITION EVALUATOR =====

  private evaluateConditions(conditions: ConditionExpression[] | null, data: Record<string, any>): boolean {
    if (!conditions || conditions.length === 0) return true;

    let result = true;
    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i];
      const fieldValue = data[cond.field];
      let condResult = false;

      switch (cond.operator) {
        case 'eq': condResult = fieldValue == cond.value; break;
        case 'neq': condResult = fieldValue != cond.value; break;
        case 'gt': condResult = Number(fieldValue) > Number(cond.value); break;
        case 'gte': condResult = Number(fieldValue) >= Number(cond.value); break;
        case 'lt': condResult = Number(fieldValue) < Number(cond.value); break;
        case 'lte': condResult = Number(fieldValue) <= Number(cond.value); break;
        case 'in': condResult = Array.isArray(cond.value) && cond.value.includes(fieldValue); break;
        case 'not_in': condResult = Array.isArray(cond.value) && !cond.value.includes(fieldValue); break;
        case 'contains': condResult = String(fieldValue || '').includes(String(cond.value)); break;
        case 'is_null': condResult = fieldValue == null || fieldValue === ''; break;
        case 'is_not_null': condResult = fieldValue != null && fieldValue !== ''; break;
        default: condResult = true;
      }

      if (i === 0) {
        result = condResult;
      } else {
        result = cond.logic === 'OR' ? (result || condResult) : (result && condResult);
      }
    }

    return result;
  }

  // ===== RULE EXECUTOR DISPATCHER =====

  private async executeRule(tenantId: string, rule: ImpactRule, recordData: Record<string, any>, userId: string, qr?: any): Promise<any> {
    const cfg = rule.config as any;

    switch (rule.impactType) {
      case ImpactType.GL_POSTING:
        return this.executeGlPosting(tenantId, cfg, recordData, userId, qr);
      case ImpactType.INVENTORY_MOVEMENT:
        return this.executeInventoryMovement(tenantId, cfg, recordData, userId, qr);
      case ImpactType.BUDGET_IMPACT:
        return this.executeBudgetImpact(tenantId, cfg, recordData, userId, qr);
      case ImpactType.STOCK_PLANNING:
        return this.executeStockPlanning(tenantId, cfg, recordData, userId);
      case ImpactType.COMMISSION_CALC:
        return this.executeCommissionCalc(tenantId, cfg, recordData, userId, qr);
      case ImpactType.INTERCOMPANY:
        return this.executeIntercompany(tenantId, cfg, recordData, userId, qr);
      case ImpactType.COST_UPDATE:
        return this.executeCostUpdate(tenantId, cfg, recordData, userId, qr);
      case ImpactType.NOTIFICATION:
        return this.executeNotification(tenantId, cfg, recordData, userId);
      case ImpactType.APPROVAL_TRIGGER:
        return this.executeApprovalTrigger(tenantId, cfg, recordData);
      case ImpactType.ANALYTICS_EVENT:
        return this.executeAnalyticsEvent(tenantId, cfg, recordData, userId);
      case ImpactType.RECORD_CREATE:
        return this.executeRecordCreate(tenantId, cfg, recordData, userId);
      case ImpactType.FIELD_UPDATE:
        return this.executeFieldUpdate(tenantId, cfg, recordData);
      case ImpactType.CRM_LOG:
        return this.executeCrmLog(tenantId, cfg, recordData, userId);
      case ImpactType.WEBHOOK:
        return { type: 'WEBHOOK', message: 'Webhook dispatch delegated to webhook module', url: cfg.url };
      default:
        return { type: 'UNKNOWN', message: `Impact type "${rule.impactType}" not implemented` };
    }
  }

  // ===== IMPACT TYPE EXECUTORS =====

  private async executeGlPosting(tenantId: string, cfg: any, data: Record<string, any>, userId: string, qr?: any) {
    const journalId = uuidv4();
    const entries = cfg.entries || [];
    const glLines: any[] = [];

    for (const entry of entries) {
      const accountCode = entry.accountCodeFixed || data[entry.accountCodeField];
      const debit = entry.debitFixed ?? (entry.debitField ? Number(data[entry.debitField]) || 0 : 0);
      const credit = entry.creditFixed ?? (entry.creditField ? Number(data[entry.creditField]) || 0 : 0);
      const description = this.interpolateTemplate(entry.descriptionTemplate || '', data);

      if (accountCode && (debit > 0 || credit > 0)) {
        glLines.push({ tenantId, journalId, accountCode, debit, credit, description, userId });
      }
    }

    const runner = qr || this.dataSource.createQueryRunner();
    const ownRunner = !qr;
    if (ownRunner) { await runner.connect(); await runner.startTransaction(); }

    try {
      for (const line of glLines) {
        await runner.query(
          `INSERT INTO gl_transactions (id, tenant_id, journal_id, account_id, debit, credit, posting_date, source_doc_type, description, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, (SELECT id FROM chart_of_accounts WHERE tenant_id = $2 AND code = $4 LIMIT 1), $5, $6, NOW(), $7, $8, $9, NOW(), NOW())`,
          [uuidv4(), line.tenantId, line.journalId, line.accountCode, line.debit, line.credit, cfg.journalType || 'DYNAMIC_IMPACT', line.description, line.userId],
        );
      }
      if (ownRunner) await runner.commitTransaction();
      return { type: 'GL_POSTING', journalId, linesCreated: glLines.length };
    } catch (e) {
      if (ownRunner) await runner.rollbackTransaction();
      throw e;
    } finally {
      if (ownRunner) await runner.release();
    }
  }

  private async executeInventoryMovement(tenantId: string, cfg: any, data: Record<string, any>, userId: string, qr?: any) {
    const itemId = data[cfg.itemField];
    const warehouseId = data[cfg.warehouseField];
    const quantity = Number(data[cfg.quantityField]) || 0;
    const unitCost = cfg.unitCostField ? Number(data[cfg.unitCostField]) || 0 : 0;

    const runner = qr || this.dataSource;
    await runner.query(
      `INSERT INTO inventory_logs (id, tenant_id, item_id, warehouse_id, movement_type, quantity, unit_cost, total_cost, reference_type, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DYNAMIC_IMPACT', $9, NOW(), NOW())`,
      [uuidv4(), tenantId, itemId, warehouseId, cfg.movementType, quantity, unitCost, quantity * unitCost, userId],
    );

    return { type: 'INVENTORY_MOVEMENT', itemId, warehouseId, quantity, movementType: cfg.movementType };
  }

  private async executeBudgetImpact(tenantId: string, cfg: any, data: Record<string, any>, userId: string, qr?: any) {
    const budgetCode = cfg.budgetCodeFixed || data[cfg.budgetCodeField];
    const amount = Math.abs(Number(data[cfg.amountField]) || 0);
    const costCenter = cfg.costCenterField ? data[cfg.costCenterField] : null;
    const period = cfg.periodField ? data[cfg.periodField] : new Date().toISOString().slice(0, 7);

    // Store budget impact as a dynamic record for flexibility
    const budgetRecord = this.dynamicDataRepo.create({
      id: uuidv4(),
      tenant_id: tenantId,
      table_name: 'budget_transactions',
      data: {
        budgetCode,
        amount,
        direction: cfg.impactDirection,
        costCenter,
        period,
        sourceType: 'IMPACT_RULE',
        timestamp: new Date().toISOString(),
      },
      created_by: userId,
    });
    await this.dynamicDataRepo.save(budgetRecord);

    return { type: 'BUDGET_IMPACT', budgetCode, amount, direction: cfg.impactDirection, period };
  }

  private async executeStockPlanning(tenantId: string, cfg: any, data: Record<string, any>, userId: string) {
    const itemId = data[cfg.itemField];
    const warehouseId = cfg.warehouseField ? data[cfg.warehouseField] : null;

    const result: any = { type: 'STOCK_PLANNING', itemId, warehouseId, actions: [] };

    if (cfg.checkReorderPoint) {
      // Check current stock vs reorder point
      const stockResult = await this.dataSource.query(
        `SELECT COALESCE(SUM(CASE WHEN movement_type IN ('RECEIPT','ADJUSTMENT') THEN quantity ELSE -quantity END), 0) as current_stock
         FROM inventory_logs WHERE tenant_id = $1 AND item_id = $2 ${warehouseId ? 'AND warehouse_id = $3' : ''}`,
        warehouseId ? [tenantId, itemId, warehouseId] : [tenantId, itemId],
      );

      const currentStock = Number(stockResult[0]?.current_stock) || 0;
      result.currentStock = currentStock;

      if (cfg.autoCreatePurchaseReq && currentStock <= 0) {
        // Auto-create purchase requisition record
        const reqRecord = this.dynamicDataRepo.create({
          id: uuidv4(),
          tenant_id: tenantId,
          table_name: 'purchase_requisitions',
          data: {
            itemId,
            warehouseId,
            requestedQuantity: cfg.reorderQuantityField ? data[cfg.reorderQuantityField] : 100,
            preferredSupplier: cfg.preferredSupplierField ? data[cfg.preferredSupplierField] : null,
            requiredDate: new Date(Date.now() + (cfg.leadTimeDays || 7) * 86400000).toISOString(),
            status: 'PENDING',
            sourceType: 'AUTO_REORDER',
            createdAt: new Date().toISOString(),
          },
          created_by: userId,
        });
        await this.dynamicDataRepo.save(reqRecord);
        result.actions.push({ action: 'PURCHASE_REQ_CREATED', recordId: reqRecord.id });
      }
    }

    return result;
  }

  private async executeCommissionCalc(tenantId: string, cfg: any, data: Record<string, any>, userId: string, qr?: any) {
    const salesPerson = data[cfg.salesPersonField];
    const revenue = Number(data[cfg.revenueField]) || 0;
    const rate = cfg.commissionRateField ? Number(data[cfg.commissionRateField]) || 0 : (cfg.commissionRate || 0);
    const commission = revenue * (rate / 100);

    const commRecord = this.dynamicDataRepo.create({
      id: uuidv4(),
      tenant_id: tenantId,
      table_name: cfg.outputTable || 'commission_entries',
      data: {
        salesPerson,
        revenue,
        commissionRate: rate,
        commissionAmount: commission,
        sourceType: 'IMPACT_RULE',
        calculatedAt: new Date().toISOString(),
      },
      created_by: userId,
    });
    await this.dynamicDataRepo.save(commRecord);

    return { type: 'COMMISSION_CALC', salesPerson, revenue, rate, commission, recordId: commRecord.id };
  }

  private async executeIntercompany(tenantId: string, cfg: any, data: Record<string, any>, userId: string, qr?: any) {
    const sourceEntity = cfg.sourceEntityField ? data[cfg.sourceEntityField] : tenantId;
    const targetEntity = cfg.targetEntityField ? data[cfg.targetEntityField] : null;
    const amount = Number(data[cfg.amountField]) || 0;
    const description = this.interpolateTemplate(cfg.descriptionTemplate || 'Intercompany transaction', data);

    if (!targetEntity || amount <= 0) {
      return { type: 'INTERCOMPANY', skipped: true, reason: 'Missing target entity or zero amount' };
    }

    const journalId = uuidv4();
    const runner = qr || this.dataSource;

    // Due-From entry in source entity (asset)
    await runner.query(
      `INSERT INTO gl_transactions (id, tenant_id, journal_id, account_id, debit, credit, posting_date, source_doc_type, description, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, (SELECT id FROM chart_of_accounts WHERE tenant_id = $2 AND code = $4 LIMIT 1), $5, 0, NOW(), 'INTERCOMPANY', $6, $7, NOW(), NOW())`,
      [uuidv4(), sourceEntity, journalId, cfg.dueFromAccount, amount, description, userId],
    );

    // Due-To entry in target entity (liability)
    await runner.query(
      `INSERT INTO gl_transactions (id, tenant_id, journal_id, account_id, debit, credit, posting_date, source_doc_type, description, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, (SELECT id FROM chart_of_accounts WHERE tenant_id = $2 AND code = $4 LIMIT 1), 0, $5, NOW(), 'INTERCOMPANY', $6, $7, NOW(), NOW())`,
      [uuidv4(), targetEntity, journalId, cfg.dueToAccount, amount, description, userId],
    );

    return { type: 'INTERCOMPANY', journalId, sourceEntity, targetEntity, amount };
  }

  private async executeCostUpdate(tenantId: string, cfg: any, data: Record<string, any>, userId: string, qr?: any) {
    const itemId = data[cfg.itemField];
    const quantity = Number(data[cfg.quantityField]) || 0;
    const unitCost = Number(data[cfg.unitCostField]) || 0;

    // Record cost layer entry
    const costRecord = this.dynamicDataRepo.create({
      id: uuidv4(),
      tenant_id: tenantId,
      table_name: 'cost_layers',
      data: {
        itemId,
        quantity,
        unitCost,
        totalCost: quantity * unitCost,
        costMethod: cfg.costMethod,
        timestamp: new Date().toISOString(),
      },
      created_by: userId,
    });
    await this.dynamicDataRepo.save(costRecord);

    return { type: 'COST_UPDATE', itemId, quantity, unitCost, costMethod: cfg.costMethod, recordId: costRecord.id };
  }

  private async executeNotification(tenantId: string, cfg: any, data: Record<string, any>, userId: string) {
    const recipient = cfg.recipientField ? data[cfg.recipientField] : cfg.recipientRoleFixed;
    const subject = this.interpolateTemplate(cfg.subjectTemplate || '', data);
    const body = this.interpolateTemplate(cfg.bodyTemplate || '', data);

    // Store notification in queue table
    const notifRecord = this.dynamicDataRepo.create({
      id: uuidv4(),
      tenant_id: tenantId,
      table_name: 'notification_queue',
      data: {
        channel: cfg.channel,
        recipient,
        subject,
        body,
        priority: cfg.priority || 'NORMAL',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
      created_by: userId,
    });
    await this.dynamicDataRepo.save(notifRecord);

    return { type: 'NOTIFICATION', channel: cfg.channel, recipient, subject, recordId: notifRecord.id };
  }

  private async executeApprovalTrigger(tenantId: string, cfg: any, data: Record<string, any>) {
    // This would integrate with the approval workflow engine
    return {
      type: 'APPROVAL_TRIGGER',
      targetStatus: cfg.targetStatus,
      autoSubmit: cfg.autoSubmit,
      message: 'Document submitted to approval workflow',
    };
  }

  private async executeAnalyticsEvent(tenantId: string, cfg: any, data: Record<string, any>, userId: string) {
    const dimensions: Record<string, any> = {};
    for (const dim of (cfg.dimensions || [])) {
      dimensions[dim.name] = data[dim.sourceField];
    }

    const metrics: Record<string, any> = {};
    for (const met of (cfg.metrics || [])) {
      metrics[met.name] = { value: Number(data[met.sourceField]) || 0, aggregation: met.aggregation };
    }

    const eventRecord = this.dynamicDataRepo.create({
      id: uuidv4(),
      tenant_id: tenantId,
      table_name: 'analytics_events',
      data: {
        eventName: cfg.eventName,
        category: cfg.category,
        dimensions,
        metrics,
        timestamp: new Date().toISOString(),
      },
      created_by: userId,
    });
    await this.dynamicDataRepo.save(eventRecord);

    return { type: 'ANALYTICS_EVENT', eventName: cfg.eventName, category: cfg.category, recordId: eventRecord.id };
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

  // ===== UTILITY =====

  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ''));
  }
}
