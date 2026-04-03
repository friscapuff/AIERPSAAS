import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantsService {
  async getSettings(tenantId: string) {
    return { tenantId, settings: {} };
  }

  async updateSettings(tenantId: string, data: any) {
    return { tenantId, ...data };
  }
}
