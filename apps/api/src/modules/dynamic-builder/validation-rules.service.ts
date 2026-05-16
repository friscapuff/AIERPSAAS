import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValidationRule, ValidationRuleType, ValidationAppliesOn } from '@libs/database/entities/validation-rule.entity';
import { MetadataRegistry, DynamicData } from '@libs/database';

interface ValidationError {
  field: string;
  rule: string;
  message: string;
}

@Injectable()
export class ValidationRulesService {
  constructor(
    @InjectRepository(ValidationRule)
    private readonly ruleRepo: Repository<ValidationRule>,
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
    if (!rule) throw new NotFoundException('Validation rule not found');
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
      ruleType: dto.ruleType,
      config: dto.config,
      appliesOn: dto.appliesOn || ValidationAppliesOn.BOTH,
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
    if (dto.ruleType !== undefined) rule.ruleType = dto.ruleType;
    if (dto.config !== undefined) rule.config = dto.config;
    if (dto.appliesOn !== undefined) rule.appliesOn = dto.appliesOn;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;
    if (dto.priority !== undefined) rule.priority = dto.priority;
    return this.ruleRepo.save(rule);
  }

  async deleteRule(tenantId: string, id: string) {
    const rule = await this.getRule(tenantId, id);
    await this.ruleRepo.remove(rule);
  }

  // Run all active validations for a table against record data
  async validateRecord(tenantId: string, tableName: string, data: Record<string, any>, isUpdate: boolean): Promise<ValidationError[]> {
    const applicableOn = isUpdate ? [ValidationAppliesOn.UPDATE, ValidationAppliesOn.BOTH] : [ValidationAppliesOn.CREATE, ValidationAppliesOn.BOTH];

    const rules = await this.ruleRepo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.tableName = :tableName', { tableName })
      .andWhere('r.isActive = true')
      .andWhere('r.appliesOn IN (:...applicableOn)', { applicableOn })
      .orderBy('r.priority', 'DESC')
      .getMany();

    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const cfg = rule.config as any;
      switch (rule.ruleType) {
        case ValidationRuleType.FIELD:
          this.validateField(cfg, data, rule.ruleName, errors);
          break;
        case ValidationRuleType.CROSS_FIELD:
          this.validateCrossField(cfg, data, rule.ruleName, errors);
          break;
        case ValidationRuleType.EXPRESSION:
          this.validateExpression(cfg, data, rule.ruleName, errors);
          break;
        case ValidationRuleType.UNIQUE_COMBO:
          await this.validateUniqueCombo(tenantId, tableName, cfg, data, rule.ruleName, errors);
          break;
      }
    }

    return errors;
  }

  private validateField(cfg: any, data: Record<string, any>, ruleName: string, errors: ValidationError[]) {
    const value = data[cfg.fieldName];
    let failed = false;

    switch (cfg.operator) {
      case 'REQUIRED': failed = value == null || value === ''; break;
      case 'MIN': failed = Number(value) < Number(cfg.value); break;
      case 'MAX': failed = Number(value) > Number(cfg.value); break;
      case 'MIN_LENGTH': failed = String(value || '').length < Number(cfg.value); break;
      case 'MAX_LENGTH': failed = String(value || '').length > Number(cfg.value); break;
      case 'REGEX': failed = !new RegExp(String(cfg.value)).test(String(value || '')); break;
      case 'IN': failed = !Array.isArray(cfg.value) || !cfg.value.includes(value); break;
      case 'NOT_IN': failed = Array.isArray(cfg.value) && cfg.value.includes(value); break;
      case 'BETWEEN': {
        const [min, max] = Array.isArray(cfg.value) ? cfg.value : [0, 0];
        failed = Number(value) < Number(min) || Number(value) > Number(max);
        break;
      }
    }

    if (failed) errors.push({ field: cfg.fieldName, rule: ruleName, message: cfg.errorMessage });
  }

  private validateCrossField(cfg: any, data: Record<string, any>, ruleName: string, errors: ValidationError[]) {
    const a = data[cfg.fieldName];
    const b = data[cfg.compareField];
    let failed = false;

    switch (cfg.operator) {
      case 'EQUALS': failed = a != b; break;
      case 'NOT_EQUALS': failed = a == b; break;
      case 'GREATER_THAN': failed = Number(a) <= Number(b); break;
      case 'LESS_THAN': failed = Number(a) >= Number(b); break;
      case 'BEFORE_DATE': failed = new Date(a) >= new Date(b); break;
      case 'AFTER_DATE': failed = new Date(a) <= new Date(b); break;
    }

    if (failed) errors.push({ field: cfg.fieldName, rule: ruleName, message: cfg.errorMessage });
  }

  private validateExpression(cfg: any, data: Record<string, any>, ruleName: string, errors: ValidationError[]) {
    try {
      // Simple expression evaluator — replaces field names with values
      let expr = cfg.expression;
      for (const [key, val] of Object.entries(data)) {
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), JSON.stringify(val));
      }
      // Safety: only allow basic math and comparisons
      if (/[^\d\s+\-*/().><=!&|"'\w]/.test(expr)) {
        errors.push({ field: '_expression', rule: ruleName, message: 'Invalid expression characters' });
        return;
      }
      const result = new Function(`return (${expr})`)();
      if (!result) errors.push({ field: '_expression', rule: ruleName, message: cfg.errorMessage });
    } catch {
      errors.push({ field: '_expression', rule: ruleName, message: cfg.errorMessage });
    }
  }

  private async validateUniqueCombo(tenantId: string, tableName: string, cfg: any, data: Record<string, any>, ruleName: string, errors: ValidationError[]) {
    const fields: string[] = cfg.fields || [];
    if (fields.length === 0) return;

    let query = this.dynamicDataRepo.createQueryBuilder('d')
      .where('d.tenant_id = :tenantId', { tenantId })
      .andWhere('d.table_name = :tableName', { tableName });

    for (let i = 0; i < fields.length; i++) {
      const fieldName = fields[i];
      const value = data[fieldName];
      query = query.andWhere(`d.data->>'${fieldName}' = :val_${i}`, { [`val_${i}`]: String(value) });
    }

    const count = await query.getCount();
    if (count > 0) {
      errors.push({ field: fields.join('+'), rule: ruleName, message: cfg.errorMessage });
    }
  }
}
