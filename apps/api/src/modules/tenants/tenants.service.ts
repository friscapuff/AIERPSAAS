import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from 'libs/database/src/entities/tenant.entity';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async getUserTenants(userId: string) {
    // TODO: Implement getting user's tenants
    return [];
  }

  async getTenant(userId: string, tenantId: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // TODO: Verify user has access to this tenant
    return tenant;
  }

  async updateTenant(userId: string, tenantId: string, dto: any) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // TODO: Verify user has admin access to this tenant
    Object.assign(tenant, dto);
    return this.tenantRepository.save(tenant);
  }
}
