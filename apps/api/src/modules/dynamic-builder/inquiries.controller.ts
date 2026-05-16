import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InquiryDefinition } from '@libs/database/entities/inquiry-definition.entity';

@ApiTags('Inquiries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dynamic-builder/inquiries')
export class InquiriesController {
  constructor(
    @InjectRepository(InquiryDefinition)
    private readonly repo: Repository<InquiryDefinition>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all inquiry definitions' })
  async list(@CurrentTenant() tenantId: string) {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inquiry definition by ID' })
  async get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new inquiry definition' })
  async create(@CurrentTenant() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    const entity = this.repo.create({
      tenantId,
      inquiryName: dto.inquiryName,
      displayName: dto.displayName,
      description: dto.description || null,
      config: dto,
      status: 'PUBLISHED',
      createdBy: userId,
    });
    return this.repo.save(entity);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an inquiry definition' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    await this.repo.update({ id, tenantId }, { config: dto, displayName: dto.displayName, description: dto.description });
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an inquiry definition' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    await this.repo.delete({ id, tenantId });
  }
}
