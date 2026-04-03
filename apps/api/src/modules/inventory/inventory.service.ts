import { Injectable } from '@nestjs/common';

@Injectable()
export class InventoryService {
  async getProducts(tenantId: string) {
    return { data: [] };
  }

  async createProduct(tenantId: string, data: any) {
    return { id: 'product-1', ...data };
  }

  async getWarehouses(tenantId: string) {
    return { data: [] };
  }

  async adjustStock(tenantId: string, data: any) {
    return { success: true };
  }
}
