import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalRule } from '@libs/database/entities/approval-rule.entity';
import { MetadataRegistry, DynamicData } from '@libs/database';

@Injectable()
export class ApprovalRulesService {
  constructor(
    @InjectRepository(ApprovalRule)
    private readonly ruleRepo: Repository<ApprovalRule>,
    @InjectRepository(MetadataRegistry)
    private readonly metadataRepo: Repository<MetadataRegistry>,
    @InjectRepository(DynamicData)
    private readonly dynamicDataRepo: Repository<DynamicData>,
  ) {}

  async listRules(tenantId: string, tableName?: string) {
    const where: any = { tenantId };
    if (tableName) where.tableName = tableName;
    return this.ruleRepo.find({ where, order: { priority: 'DESC', createdAt: 'DESC' } });
  }

  async getRule(tenantId: string, id: string) {
    const rule = await this.ruleRepo.findOne({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Approval rule not found');
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
      conditions: dto.conditions || [],
      approvalLevels: dto.approvalLevels || [],
      targetApprovedStatus: dto.targetApprovedStatus,
      targetRejectedStatus: dto.targetRejectedStatus,
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
    if (dto.conditions !== undefined) rule.conditions = dto.conditions;
    if (dto.approvalLevels !== undefined) rule.approvalLevels = dto.approvalLevels;
    if (dto.targetApprovedStatus !== undefined) rule.targetApprovedStatus = dto.targetApprovedStatus;
    if (dto.targetRejectedStatus !== undefined) rule.targetRejectedStatus = dto.targetRejectedStatus;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;
    if (dto.priority !== undefined) rule.priority = dto.priority;
    return this.ruleRepo.save(rule);
  }

  async deleteRule(tenantId: string, id: string) {
    const rule = await this.getRule(tenantId, id);
    await this.ruleRepo.remove(rule);
  }

  // Execute approval rules when a record's status changes
  async evaluateApproval(tenantId: string, tableName: string, recordId: string, newStatus: string): Promise<{ routed: boolean; targetStatus?: string; approvalRequired?: boolean; currentLevel?: number }> {
    // Find matching rules for this status transition
    const rules = await this.ruleRepo.find({
      where: { tenantId, tableName, triggerStatus: newStatus, isActive: true },
      order: { priority: 'DESC' },
    });

    if (rules.length === 0) return { routed: false };

    const record = await this.dynamicDataRepo.findOne({ where: { id: recordId, tenant_id: tenantId, table_name: tableName } });
    if (!record) return { routed: false };

    for (const rule of rules) {
      const conditionsMet = this.evaluateConditions(rule.conditions, record.data);
      if (conditionsMet) {
        if (rule.approvalLevels.length === 0) {
          // No approval levels — auto-approve
          return { routed: true, targetStatus: rule.targetApprovedStatus };
        }
        // Requires approval — set to pending
        return { routed: true, approvalRequired: true, currentLevel: 1, targetStatus: 'PENDING_APPROVAL' };
      }
    }

    return { routed: false };
  }

  private evaluateConditions(conditions: any[], data: Record<string, any>): boolean {
    if (!conditions || conditions.length === 0) return true;
    return conditions.every((c) => {
      const fieldValue = data[c.field];
      switch (c.operator) {
        case 'EQ': return fieldValue == c.value;
        case 'NE': return fieldValue != c.value;
        case 'GT': return Number(fieldValue) > Number(c.value);
        case 'LT': return Number(fieldValue) < Number(c.value);
        case 'GTE': return Number(fieldValue) >= Number(c.value);
        case 'LTE': return Number(fieldValue) <= Number(c.value);
        case 'IN': return Array.isArray(c.value) && c.value.includes(fieldValue);
        case 'NOT_IN': return Array.isArray(c.value) && !c.value.includes(fieldValue);
        case 'IS_NULL': return fieldValue == null;
        case 'IS_NOT_NULL': return fieldValue != null;
        default: return true;
      }
    });
  }
}
