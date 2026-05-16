import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '@aierp/database';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { OrganizationController } from './organization.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [TenantsController, OrganizationController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
