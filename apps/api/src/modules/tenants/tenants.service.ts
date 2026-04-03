import { Injectable } from '@nestjs/common';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  subscriptionTier: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class TenantsService {
  private tenants: Map<string, Tenant> = new Map();

  async getTenants() {
    return Array.from(this.tenants.values());
  }

  async getTenant(id: string) {
    return this.tenants.get(id);
  }

  async createTenant(createTenantDto: any) {
    const id = Math.random().toString(36).substr(2, 9);
    const tenant: Tenant = {
      id,
      ...createTenantDto,
      subscriptionTier: createTenantDto.subscriptionTier || 'free',
      status: 'active',
      createdAt: new Date(),
    };
    this.tenants.set(id, tenant);
    return tenant;
  }

  async updateTenant(id: string, updateTenantDto: any) {
    const tenant = this.tenants.get(id);
    if (!tenant) return null;
    const updated = { ...tenant, ...updateTenantDto };
    this.tenants.set(id, updated);
    return updated;
  }
}
