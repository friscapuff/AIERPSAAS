import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportDefinition } from '@libs/database/entities/report-definition.entity';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dynamic-builder/reports')
export class ReportsController {
  constructor(
    @InjectRepository(ReportDefinition)
    private readonly repo: Repository<ReportDefinition>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all report definitions' })
  async list(@CurrentTenant() tenantId: string) {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report definition by ID' })
  async get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new report definition' })
  async create(@CurrentTenant() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    const entity = this.repo.create({
      tenantId,
      reportName: dto.reportName,
      displayName: dto.displayName,
      description: dto.description || null,
      config: dto,
      status: 'PUBLISHED',
      createdBy: userId,
    });
    return this.repo.save(entity);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a report definition' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    await this.repo.update({ id, tenantId }, { config: dto, displayName: dto.displayName, description: dto.description });
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a report definition' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.repo.delete({ id, tenantId });
  }
}
