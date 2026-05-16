import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataSource } from 'typeorm';

interface AuditLog {
  tenant_id: string;
  user_id: string;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string;
  old_values: any;
  new_values: any;
  timestamp: Date;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure';
  error_message?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private auditTableExists: boolean | null = null;

  constructor(private dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Skip non-CUD operations
    const method = request.method;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    // Extract audit information
    const auditLog = this.extractAuditInfo(request, method);

    return next.handle().pipe(
      tap(
        (data) => {
          // On success
          auditLog.status = 'success';
          auditLog.timestamp = new Date();
          auditLog.new_values = data;
          this.logAudit(auditLog);
        },
        (error) => {
          // On error
          auditLog.status = 'failure';
          auditLog.error_message = error?.message;
          auditLog.timestamp = new Date();
          this.logAudit(auditLog);
        },
      ),
    );
  }

  private extractAuditInfo(request: any, method: string): Partial<AuditLog> {
    const path = request.path;
    const [, , module, resource] = path.split('/');

    return {
      tenant_id: request.tenantId,
      user_id: request.user?.id,
      action: this.mapHttpMethodToAction(method),
      module: module || 'unknown',
      entity_type: resource || 'unknown',
      entity_id: request.params?.id,
      old_values: method === 'PUT' || method === 'PATCH' ? request.body : null,
      new_values: null,
      ip_address: request.ip || request.connection.remoteAddress,
      user_agent: request.get('user-agent') || 'unknown',
    };
  }

  private mapHttpMethodToAction(method: string): string {
    const actionMap: { [key: string]: string } = {
      POST: 'Create',
      PUT: 'Update',
      PATCH: 'Update',
      DELETE: 'Delete',
    };
    return actionMap[method] || 'Unknown';
  }

  private async ensureAuditTable(): Promise<boolean> {
    if (this.auditTableExists === true) return true;
    if (this.auditTableExists === false) return false;

    try {
      const result = await this.dataSource.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') AS exists`,
      );
      this.auditTableExists = result[0]?.exists === true || result[0]?.exists === 't';

      if (!this.auditTableExists) {
        // Auto-create the audit_log table
        await this.dataSource.query(`
          CREATE TABLE IF NOT EXISTS audit_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            user_id UUID,
            action VARCHAR(50),
            module VARCHAR(100),
            entity_type VARCHAR(100),
            entity_id UUID,
            old_values JSONB,
            new_values JSONB,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            ip_address VARCHAR(50),
            user_agent TEXT,
            status VARCHAR(20),
            error_message TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log (tenant_id);
          CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log (timestamp);
        `);
        this.auditTableExists = true;
        this.logger.log('Created audit_log table automatically');
      }

      return this.auditTableExists;
    } catch (error) {
      this.logger.warn(`Failed to check/create audit_log table: ${error.message}`);
      this.auditTableExists = false;
      return false;
    }
  }

  private async logAudit(auditLog: Partial<AuditLog>) {
    try {
      const tableReady = await this.ensureAuditTable();
      if (!tableReady) return;

      await this.dataSource.query(
        `INSERT INTO audit_log (tenant_id, user_id, action, module, entity_type, entity_id, old_values, new_values, timestamp, ip_address, user_agent, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          auditLog.tenant_id,
          auditLog.user_id,
          auditLog.action,
          auditLog.module,
          auditLog.entity_type,
          auditLog.entity_id,
          JSON.stringify(auditLog.old_values),
          JSON.stringify(auditLog.new_values),
          auditLog.timestamp,
          auditLog.ip_address,
          auditLog.user_agent,
          auditLog.status,
          auditLog.error_message,
        ],
      );
    } catch (error) {
      // Never let audit logging break the actual request
      this.logger.warn(`Audit log failed (non-blocking): ${error.message}`);
    }
  }
}
