import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetadataRegistry, DynamicData } from '@libs/database';
import { ScreenDefinition } from '@libs/database/entities/screen-definition.entity';
import { ApprovalRule } from '@libs/database/entities/approval-rule.entity';
import { ValidationRule } from '@libs/database/entities/validation-rule.entity';
import { ImpactRule } from '@libs/database/entities/impact-rule.entity';
import { ReportDefinition } from '@libs/database/entities/report-definition.entity';
import { InquiryDefinition } from '@libs/database/entities/inquiry-definition.entity';
import { DashboardDefinition } from '@libs/database/entities/dashboard-definition.entity';
import { DynamicBuilderController } from './dynamic-builder.controller';
import { DynamicBuilderService } from './dynamic-builder.service';
import { ScreenBuilderController } from './screen-builder.controller';
import { ScreenBuilderService } from './screen-builder.service';
import { ApprovalRulesController } from './approval-rules.controller';
import { ApprovalRulesService } from './approval-rules.service';
import { ValidationRulesController } from './validation-rules.controller';
import { ValidationRulesService } from './validation-rules.service';
import { ImpactRulesController } from './impact-rules.controller';
import { ImpactRulesService } from './impact-rules.service';
import { ReportsController } from './reports.controller';
import { InquiriesController } from './inquiries.controller';
import { DashboardsController } from './dashboards.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MetadataRegistry,
      DynamicData,
      ScreenDefinition,
      ApprovalRule,
      ValidationRule,
      ImpactRule,
      ReportDefinition,
      InquiryDefinition,
      DashboardDefinition,
    ]),
  ],
  controllers: [
    DynamicBuilderController,
    ScreenBuilderController,
    ApprovalRulesController,
    ValidationRulesController,
    ImpactRulesController,
    ReportsController,
    InquiriesController,
    DashboardsController,
  ],
  providers: [
    DynamicBuilderService,
    ScreenBuilderService,
    ApprovalRulesService,
    ValidationRulesService,
    ImpactRulesService,
  ],
  exports: [
    DynamicBuilderService,
    ScreenBuilderService,
    ApprovalRulesService,
    ValidationRulesService,
    ImpactRulesService,
  ],
})
export class DynamicBuilderModule {}
