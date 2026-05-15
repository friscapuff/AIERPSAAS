import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { appConfig } from './config/app.config';
import { CommonModule } from './common/common.module';
import { HealthModule } from './modules/health/health.module';

import { IntercompanyModule } from './modules/intercompany/intercompany.module';
// Feature modules (to be created)
// import { AuthModule } from './modules/auth/auth.module';
// import { TenantsModule } from './modules/tenants/tenants.module';
// import { FinanceModule } from './modules/finance/finance.module';
// import { InventoryModule } from './modules/inventory/inventory.module';
// import { WorkflowModule } from './modules/workflow/workflow.module';
// import { AuditModule } from './modules/audit/audit.module';
// import { ReportingModule } from './modules/reporting/reporting.module';
// import { WebhooksModule } from './modules/webhooks/webhooks.module';
// import { DynamicBuilderModule } from './modules/dynamic-builder/dynamic-builder.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const dbConfig = configService.get('database');
        return {
          ...dbConfig,
          autoLoadEntities: true,
        } as TypeOrmModuleOptions;
      },
    }),
    CommonModule,
    HealthModule,
    IntercompanyModule,
    // Feature modules
    // AuthModule,
    // TenantsModule,
    // FinanceModule,
    // InventoryModule,
    // WorkflowModule,
    // AuditModule,
    // ReportingModule,
    // WebhooksModule,
    // DynamicBuilderModule,
  ],
})
export class AppModule {}
