import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ScreenBuilderService } from './screen-builder.service';

@ApiTags('Screen Builder')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dynamic-builder/screens')
export class ScreenBuilderController {
  constructor(private readonly service: ScreenBuilderService) {}

  @Get()
  @ApiOperation({ summary: 'List all screens, optionally filtered by table' })
  async list(@CurrentTenant() tenantId: string, @Query('tableName') tableName?: string) {
    return this.service.listScreens(tenantId, tableName);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get screen definition by ID' })
  async get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.getScreen(tenantId, id);
  }

  @Get('by-name/:screenName')
  @ApiOperation({ summary: 'Get screen definition by name' })
  async getByName(@CurrentTenant() tenantId: string, @Param('screenName') name: string) {
    return this.service.getScreenByName(tenantId, name);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new screen definition' })
  async create(@CurrentTenant() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.service.createScreen(tenantId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a screen definition' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateScreen(tenantId, id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a screen (makes it available to users)' })
  async publish(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.publishScreen(tenantId, id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a screen' })
  async archive(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.archiveScreen(tenantId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a screen definition' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.deleteScreen(tenantId, id);
  }

  @Post('auto-generate/:tableName')
  @ApiOperation({ summary: 'Auto-generate a default screen from table metadata' })
  async autoGenerate(@CurrentTenant() tenantId: string, @CurrentUser('id') userId: string, @Param('tableName') tableName: string) {
    return this.service.autoGenerateScreen(tenantId, tableName, userId);
  }
}
