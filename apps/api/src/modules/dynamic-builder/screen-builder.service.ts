import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScreenDefinition, ScreenStatus } from '@libs/database/entities/screen-definition.entity';
import { MetadataRegistry } from '@libs/database';

@Injectable()
export class ScreenBuilderService {
  constructor(
    @InjectRepository(ScreenDefinition)
    private readonly screenRepo: Repository<ScreenDefinition>,
    @InjectRepository(MetadataRegistry)
    private readonly metadataRepo: Repository<MetadataRegistry>,
  ) {}

  async listScreens(tenantId: string, tableName?: string) {
    const where: any = { tenantId };
    if (tableName) where.tableName = tableName;
    return this.screenRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async getScreen(tenantId: string, id: string) {
    const screen = await this.screenRepo.findOne({ where: { id, tenantId } });
    if (!screen) throw new NotFoundException('Screen not found');
    return screen;
  }

  async getScreenByName(tenantId: string, screenName: string) {
    const screen = await this.screenRepo.findOne({ where: { screenName, tenantId } });
    if (!screen) throw new NotFoundException('Screen not found');
    return screen;
  }

  async createScreen(tenantId: string, userId: string, dto: any) {
    // Validate the referenced table exists
    const table = await this.metadataRepo.findOne({
      where: { tenant_id: tenantId, table_name: dto.tableName },
    });
    if (!table) throw new BadRequestException(`Table "${dto.tableName}" does not exist`);

    // Check screen name uniqueness
    const existing = await this.screenRepo.findOne({
      where: { tenantId, screenName: dto.screenName },
    });
    if (existing) throw new ConflictException(`Screen "${dto.screenName}" already exists`);

    const screen = this.screenRepo.create({
      tenantId,
      tableName: dto.tableName,
      screenName: dto.screenName,
      displayName: dto.displayName,
      description: dto.description || null,
      screenType: dto.screenType,
      layout: dto.layout || { columns: [], formSections: [], actions: [], headerFields: [], defaultSort: { field: 'created_at', direction: 'DESC' }, pageSize: 20 },
      status: ScreenStatus.DRAFT,
      icon: dto.icon || null,
      isDefault: dto.isDefault ?? false,
      createdBy: userId,
    });

    return this.screenRepo.save(screen);
  }

  async updateScreen(tenantId: string, id: string, dto: any) {
    const screen = await this.getScreen(tenantId, id);
    if (dto.displayName !== undefined) screen.displayName = dto.displayName;
    if (dto.description !== undefined) screen.description = dto.description;
    if (dto.screenType !== undefined) screen.screenType = dto.screenType;
    if (dto.layout !== undefined) screen.layout = dto.layout;
    if (dto.icon !== undefined) screen.icon = dto.icon;
    if (dto.isDefault !== undefined) screen.isDefault = dto.isDefault;
    return this.screenRepo.save(screen);
  }

  async publishScreen(tenantId: string, id: string) {
    const screen = await this.getScreen(tenantId, id);
    screen.status = ScreenStatus.PUBLISHED;
    return this.screenRepo.save(screen);
  }

  async archiveScreen(tenantId: string, id: string) {
    const screen = await this.getScreen(tenantId, id);
    screen.status = ScreenStatus.ARCHIVED;
    return this.screenRepo.save(screen);
  }

  async deleteScreen(tenantId: string, id: string) {
    const screen = await this.getScreen(tenantId, id);
    await this.screenRepo.remove(screen);
  }

  // Auto-generate a default screen from table metadata
  async autoGenerateScreen(tenantId: string, tableName: string, userId: string) {
    const table = await this.metadataRepo.findOne({
      where: { tenant_id: tenantId, table_name: tableName },
    });
    if (!table) throw new BadRequestException(`Table "${tableName}" does not exist`);

    const columns = (table.fields || []).map((f: any, i: number) => ({
      fieldName: f.name,
      label: f.label || f.display_name || f.name,
      width: 150,
      sortable: true,
      filterable: true,
      visible: true,
    }));

    const formFields = (table.fields || []).map((f: any) => ({
      fieldName: f.name,
      label: f.label || f.display_name || f.name,
      inputType: this.fieldTypeToInputType(f.type || f.data_type || 'STRING'),
      span: 6,
      readOnly: false,
      placeholder: `Enter ${f.label || f.name}`,
    }));

    const layout = {
      columns,
      formSections: [{ title: 'Details', fields: formFields }],
      actions: [
        { label: 'Create', action: 'create', icon: 'PlusIcon', variant: 'primary' },
        { label: 'Edit', action: 'edit', icon: 'PencilIcon', variant: 'secondary' },
        { label: 'Delete', action: 'delete', icon: 'TrashIcon', variant: 'danger' },
      ],
      headerFields: columns.slice(0, 3).map((c: any) => c.fieldName),
      defaultSort: { field: 'created_at', direction: 'DESC' },
      pageSize: 20,
    };

    return this.createScreen(tenantId, userId, {
      tableName,
      screenName: `${tableName}_default`,
      displayName: table.display_name || tableName,
      description: `Auto-generated screen for ${table.display_name || tableName}`,
      screenType: 'FORM_LIST',
      layout,
      isDefault: true,
    });
  }

  private fieldTypeToInputType(fieldType: string): string {
    const map: Record<string, string> = {
      STRING: 'text', TEXT: 'text', TEXTAREA: 'textarea', INTEGER: 'number', NUMBER: 'number',
      DECIMAL: 'number', DATE: 'date', DATETIME: 'datetime-local', BOOLEAN: 'checkbox',
      EMAIL: 'email', PHONE: 'tel', URL: 'url', SELECT: 'select', MULTI_SELECT: 'multiselect',
      LOOKUP: 'lookup', FILE: 'file',
    };
    return map[fieldType] || 'text';
  }
}
