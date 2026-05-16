import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesOrder } from '@libs/database/entities/sales-order.entity';
import { SalesOrderLine } from '@libs/database/entities/sales-order-line.entity';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalesOrder, SalesOrderLine])],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}
