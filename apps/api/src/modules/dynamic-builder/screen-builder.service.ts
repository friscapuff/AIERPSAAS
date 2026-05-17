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
    // Check if the referenced table exists in metadata registry
    let table = await this.metadataRepo.findOne({
      where: { tenant_id: tenantId, table_name: dto.tableName },
    });

    // If table doesn't exist, auto-register it from provided fields
    if (!table) {
      if (dto.tableFields && dto.tableFields[dto.tableName]) {
        // Auto-register the table in MetadataRegistry
        table = await this.autoRegisterTable(tenantId, dto.tableName, dto.tableFields[dto.tableName], userId, dto.displayName);
      } else {
        // Try to auto-register with minimal fields (just an id and status)
        table = await this.autoRegisterTable(tenantId, dto.tableName, [
          { name: 'id', label: 'ID', type: 'NUMBER', required: true, order: 0 },
          { name: 'status', label: 'Status', type: 'SELECT', required: false, order: 1 },
        ], userId, dto.displayName || dto.tableName);
      }
    }

    // Also auto-register any detail tables that don't exist yet
    if (dto.tableFields) {
      for (const [tblName, fields] of Object.entries(dto.tableFields)) {
        if (tblName === dto.tableName) continue; // Already handled above
        const existing = await this.metadataRepo.findOne({
          where: { tenant_id: tenantId, table_name: tblName },
        });
        if (!existing) {
          await this.autoRegisterTable(tenantId, tblName, fields as any[], userId);
        }
      }
    }

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

  /**
   * Auto-register a table in MetadataRegistry when it doesn't exist yet.
   * This enables the Screen Wizard to create screens for system tables
   * or new tables without requiring a separate table creation step.
   */
  private async autoRegisterTable(
    tenantId: string,
    tableName: string,
    fields: any[],
    userId: string,
    displayName?: string,
  ): Promise<MetadataRegistry> {
    const metadataFields = fields.map((f: any, idx: number) => ({
      name: f.name,
      label: f.label || f.name,
      type: this.normalizeFieldType(f.type || 'TEXT'),
      required: f.required ?? false,
      unique: f.unique ?? false,
      indexed: f.indexed ?? false,
      order: f.order ?? idx,
      default: f.defaultValue || f.default,
      lookup_table: f.lookupTable || f.lookup_table,
      lookup_field: f.lookupField || f.lookup_field,
    }));

    const metadata = this.metadataRepo.create({
      tenant_id: tenantId,
      table_name: tableName,
      display_name: displayName || tableName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: `Auto-registered table for screen "${tableName}"`,
      fields: metadataFields,
      created_by: userId,
    });

    return this.metadataRepo.save(metadata);
  }

  private normalizeFieldType(type: string): string {
    const normalized = (type || 'TEXT').toUpperCase();
    const validTypes = [
      'STRING', 'TEXT', 'TEXTAREA', 'INTEGER', 'NUMBER', 'DECIMAL',
      'DATE', 'DATETIME', 'BOOLEAN', 'EMAIL', 'PHONE', 'URL',
      'SELECT', 'MULTI_SELECT', 'LOOKUP', 'FILE',
    ];
    return validTypes.includes(normalized) ? normalized : 'TEXT';
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
