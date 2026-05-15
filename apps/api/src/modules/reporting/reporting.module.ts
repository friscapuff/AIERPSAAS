import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import {
  GLTransaction,
  ChartOfAccounts,
  FinancialPeriod,
  InventoryLog,
  Item,
  Warehouse,
  CostLayer,
  SavedReport,
} from '@libs/database';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GLTransaction,
      ChartOfAccounts,
      FinancialPeriod,
      InventoryLog,
      Item,
      Warehouse,
      CostLayer,
      SavedReport,
    ]),
  ],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
