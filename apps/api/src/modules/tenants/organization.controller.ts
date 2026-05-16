import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// We'll import from the shared entities
import { Tenant } from '@aierp/database';

// For now we use raw queries since Company/Branch entities are new
@ApiTags('Organization')
@Controller('api/v1/organization')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class OrganizationController {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  // ─── TENANTS (System Admin) ─────────────────────────────────────────────────

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants (system admin)' })
  async listTenants() {
    return this.tenantRepo.find({ order: { created_at: 'DESC' } });
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Create a new tenant' })
  async createTenant(@Body() data: any) {
    const tenant = this.tenantRepo.create(data);
    return this.tenantRepo.save(tenant);
  }

  @Put('tenants/:id')
  @ApiOperation({ summary: 'Update a tenant' })
  async updateTenant(@Param('id') id: string, @Body() data: any) {
    await this.tenantRepo.update(id, data);
    return this.tenantRepo.findOneBy({ id });
  }

  // ─── COMPANIES ──────────────────────────────────────────────────────────────

  @Get('companies')
  @ApiOperation({ summary: 'List companies for current tenant' })
  async listCompanies(@CurrentTenant() tenantId: string, @Query('tenant_id') queryTenantId?: string) {
    const tid = queryTenantId || tenantId;
    const result = await this.tenantRepo.manager.query(
      `SELECT * FROM companies WHERE tenant_id = $1 ORDER BY name ASC`,
      [tid],
    );
    return result;
  }

  @Post('companies')
  @ApiOperation({ summary: 'Create a company' })
  async createCompany(@CurrentTenant() tenantId: string, @Body() data: any) {
    const tid = data.tenant_id || tenantId;
    const result = await this.tenantRepo.manager.query(
      `INSERT INTO companies (tenant_id, code, name, legal_name, tax_id, registration_number, currency, address, phone, email, website, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [tid, data.code, data.name, data.legal_name, data.tax_id, data.registration_number, data.currency || 'JOD', data.address, data.phone, data.email, data.website, data.is_active ?? true],
    );
    return result[0];
  }

  @Put('companies/:id')
  @ApiOperation({ summary: 'Update a company' })
  async updateCompany(@Param('id') id: string, @Body() data: any) {
    await this.tenantRepo.manager.query(
      `UPDATE companies SET name=$1, legal_name=$2, tax_id=$3, registration_number=$4, currency=$5, address=$6, phone=$7, email=$8, website=$9, is_active=$10, updated_at=NOW() WHERE id=$11`,
      [data.name, data.legal_name, data.tax_id, data.registration_number, data.currency, data.address, data.phone, data.email, data.website, data.is_active ?? true, id],
    );
    const result = await this.tenantRepo.manager.query(`SELECT * FROM companies WHERE id=$1`, [id]);
    return result[0];
  }

  @Delete('companies/:id')
  @ApiOperation({ summary: 'Delete a company' })
  async deleteCompany(@Param('id') id: string) {
    await this.tenantRepo.manager.query(`DELETE FROM companies WHERE id=$1`, [id]);
    return { deleted: true };
  }

  // ─── BRANCHES ───────────────────────────────────────────────────────────────

  @Get('branches')
  @ApiOperation({ summary: 'List branches for a company' })
  async listBranches(@CurrentTenant() tenantId: string, @Query('company_id') companyId?: string) {
    if (companyId) {
      return this.tenantRepo.manager.query(
        `SELECT * FROM branches WHERE tenant_id=$1 AND company_id=$2 ORDER BY name ASC`,
        [tenantId, companyId],
      );
    }
    return this.tenantRepo.manager.query(
      `SELECT * FROM branches WHERE tenant_id=$1 ORDER BY name ASC`,
      [tenantId],
    );
  }

  @Post('branches')
  @ApiOperation({ summary: 'Create a branch' })
  async createBranch(@CurrentTenant() tenantId: string, @Body() data: any) {
    const result = await this.tenantRepo.manager.query(
      `INSERT INTO branches (tenant_id, company_id, code, name, type, address, city, country, phone, manager, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [tenantId, data.company_id, data.code, data.name, data.type || 'branch', data.address, data.city, data.country, data.phone, data.manager, data.is_active ?? true],
    );
    return result[0];
  }

  @Put('branches/:id')
  @ApiOperation({ summary: 'Update a branch' })
  async updateBranch(@Param('id') id: string, @Body() data: any) {
    await this.tenantRepo.manager.query(
      `UPDATE branches SET name=$1, type=$2, address=$3, city=$4, country=$5, phone=$6, manager=$7, is_active=$8, updated_at=NOW() WHERE id=$9`,
      [data.name, data.type, data.address, data.city, data.country, data.phone, data.manager, data.is_active ?? true, id],
    );
    const result = await this.tenantRepo.manager.query(`SELECT * FROM branches WHERE id=$1`, [id]);
    return result[0];
  }

  @Delete('branches/:id')
  @ApiOperation({ summary: 'Delete a branch' })
  async deleteBranch(@Param('id') id: string) {
    await this.tenantRepo.manager.query(`DELETE FROM branches WHERE id=$1`, [id]);
    return { deleted: true };
  }

  // ─── WAREHOUSE ASSIGNMENT ───────────────────────────────────────────────────

  @Get('warehouses')
  @ApiOperation({ summary: 'List warehouses for a branch or tenant' })
  async listWarehouses(@CurrentTenant() tenantId: string, @Query('branch_id') branchId?: string) {
    if (branchId) {
      return this.tenantRepo.manager.query(
        `SELECT * FROM warehouses WHERE tenant_id=$1 ORDER BY name ASC`,
        [tenantId],
      );
    }
    return this.tenantRepo.manager.query(
      `SELECT * FROM warehouses WHERE tenant_id=$1 ORDER BY name ASC`,
      [tenantId],
    );
  }
}
