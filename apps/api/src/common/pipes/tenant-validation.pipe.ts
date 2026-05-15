import { Injectable, PipeTransform, BadRequestException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Validates that the tenant_id is valid and active
 *
 * Usage:
 * @Get(':tenantId')
 * getTenant(@Param('tenantId', new TenantValidationPipe()) tenantId: string) { ... }
 */
@Injectable()
export class TenantValidationPipe implements PipeTransform {
  private readonly logger = new Logger(TenantValidationPipe.name);

  constructor(private dataSource: DataSource) {}

  async transform(value: string): Promise<string> {
    if (!value) {
      throw new BadRequestException('Tenant ID is required');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new BadRequestException('Invalid tenant ID format');
    }

    // Check if tenant exists and is active
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const tenant = await queryRunner.query(
        `SELECT id, is_active FROM tenants WHERE id = $1 LIMIT 1`,
        [value],
      );

      await queryRunner.release();

      if (!tenant || tenant.length === 0) {
        throw new BadRequestException('Tenant not found');
      }

      if (!tenant[0].is_active) {
        throw new BadRequestException('Tenant is not active');
      }

      return value;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Tenant validation error: ${error.message}`);
      throw new BadRequestException('Failed to validate tenant');
    }
  }
}
