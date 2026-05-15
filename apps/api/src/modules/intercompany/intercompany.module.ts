import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  IntercompanyAgreement,
  IntercompanyTransaction,
  Tenant,
  ChartOfAccounts,
  GLTransaction,
} from '@libs/database';

import { IntercompanyController } from './intercompany.controller';
import { IntercompanyService } from './intercompany.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntercompanyAgreement,
      IntercompanyTransaction,
      Tenant,
      ChartOfAccounts,
      GLTransaction,
    ]),
  ],
  controllers: [IntercompanyController],
  providers: [IntercompanyService],
  exports: [IntercompanyService],
})
export class IntercompanyModule {}
