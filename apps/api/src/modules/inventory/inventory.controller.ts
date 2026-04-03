import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

interface InventoryMovementDto {
  productId: string;
  warehouseId: string;
  quantity: number;
  movementType: 'in' | 'out' | 'adjustment';
  referenceId?: string;
}

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('items')
  async getInventoryItems() {
    return this.inventoryService.getItems();
  }

  @Get('items/:id')
  async getInventoryItem(@Param('id') id: string) {
    return this.inventoryService.getItem(id);
  }

  @Post('movements')
  async recordMovement(
    @Body() movementDto: InventoryMovementDto,
  ) {
    return this.inventoryService.recordMovement(movementDto);
  }

  @Get('movements')
  async getMovements(
    @Query('productId') productId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getMovements(
      productId,
      startDate,
      endDate,
    );
  }
}
