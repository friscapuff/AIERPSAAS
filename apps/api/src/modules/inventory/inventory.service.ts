import { Injectable } from '@nestjs/common';

interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  warehouseId: string;
}

interface InventoryMovement {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  movementType: string;
  referenceId?: string;
  timestamp: Date;
}

@Injectable()
export class InventoryService {
  private items: Map<string, InventoryItem> = new Map();
  private movements: InventoryMovement[] = [];

  async getItems() {
    return Array.from(this.items.values());
  }

  async getItem(id: string) {
    return this.items.get(id);
  }

  async recordMovement(movementDto: any) {
    const movement: InventoryMovement = {
      id: Math.random().toString(36).substr(2, 9),
      ...movementDto,
      timestamp: new Date(),
    };
    this.movements.push(movement);
    return movement;
  }

  async getMovements(
    productId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    return this.movements.filter((m) => {
      if (productId && m.productId !== productId) return false;
      if (startDate && m.timestamp < new Date(startDate)) return false;
      if (endDate && m.timestamp > new Date(endDate)) return false;
      return true;
    });
  }
}
