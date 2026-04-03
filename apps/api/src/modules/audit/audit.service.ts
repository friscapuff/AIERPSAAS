import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog } from 'libs/database/src/entities/audit-log.entity';

interface AuditFilterOptions {
  page: number;
  limit: number;
  module?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async getAuditLogs(tenantId: string, options: AuditFilterOptions) {
    const { page, limit, module, action, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const query = this.auditLogRepository
      .createQueryBuilder('audit')
      .where('audit.tenant_id = :tenantId', { tenantId });

    if (module) {
      query.andWhere('audit.module = :module', { module });
    }

    if (action) {
      query.andWhere('audit.action = :action', { action });
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      query.andWhere('audit.timestamp BETWEEN :start AND :end', { start, end });
    }

    const [logs, total] = await query
      .orderBy('audit.timestamp', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAuditLogById(tenantId: string, id: string) {
    return this.auditLogRepository.findOne({
      where: { id, tenant_id: tenantId },
    });
  }

  async logAction(
    tenantId: string,
    userId: string,
    action: string,
    module: string,
    entityType: string,
    entityId: string,
    oldValues?: any,
    newValues?: any,
  ) {
    try {
      const auditLog = this.auditLogRepository.create({
        tenant_id: tenantId,
        user_id: userId,
        action,
        module,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues,
        new_values: newValues,
        timestamp: new Date(),
      });

      await this.auditLogRepository.save(auditLog);
      return auditLog;
    } catch (error) {
      this.logger.error(`Failed to log action: ${error.message}`, error.stack);
      // Don't throw, as audit logging should not break main operations
    }
  }
}
