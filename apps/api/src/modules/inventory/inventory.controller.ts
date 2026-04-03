import { Controller, Get, Post, Body, UseGuards, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movements')
  async logMovement(
    @CurrentUser() user: any,
    @Body() dto: any,
  ) {
    return this.inventoryService.logMovement(user.tenant_id, user.id, dto);
  }

  @Get('movements')
  async getMovements(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.inventoryService.getMovements(user.tenant_id, page, limit);
  }
}
