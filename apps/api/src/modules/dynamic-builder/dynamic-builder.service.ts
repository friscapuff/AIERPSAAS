import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MetadataRegistry, MetadataField, DynamicData } from '@libs/database';
import {
  CreateTableDto,
  UpdateTableDto,
  CreateRecordDto,
  UpdateRecordDto,
  QueryRecordsDto,
  FieldType,
  FilterOperator,
  FilterCondition,
} from './dto';

interface ValidationError {
  field: string;
  message: string;
}

@Injectable()
export class DynamicBuilderService {
  constructor(
    @InjectRepository(MetadataRegistry)
    private metadataRegistry: Repository<MetadataRegistry>,
    @InjectRepository(DynamicData)
    private dynamicDataRepository: Repository<DynamicData>,
    private dataSource: DataSource,
  ) {}

  async createTable(tenantId: string, dto: CreateTableDto, userId: string): Promise<MetadataRegistry> {
    const existingTable = await this.metadataRegistry.findOne({
      where: { tenant_id: tenantId, table_name: dto.tableName },
    });

    if (existingTable) {
      throw new ConflictException(`Table "${dto.tableName}" already exists for this tenant`);
    }

    const fieldNames = new Set<string>();
    for (const field of dto.fields) {
      if (fieldNames.has(field.name)) {
        throw new BadRequestException(`Duplicate field name: "${field.name}"`);
      }
      fieldNames.add(field.name);
    }

    for (const field of dto.fields) {
      if (field.type === FieldType.LOOKUP) {
        if (!field.lookupTable || !field.lookupField) {
          throw new BadRequestException(`Field "${field.name}": LOOKUP type requires lookupTable and lookupField`);
        }
        const lookupTable = await this.metadataRegistry.findOne({
          where: { tenant_id: tenantId, table_name: field.lookupTable },
        });
        if (!lookupTable) {
          throw new BadRequestException(`Field "${field.name}": Referenced lookup table "${field.lookupTable}" does not exist`);
        }
        const lookupFieldExists = lookupTable.fields.some((f) => f.name === field.lookupField);
        if (!lookupFieldExists) {
          throw new BadRequestException(`Field "${field.name}": Lookup field "${field.lookupField}" does not exist in table "${field.lookupTable}"`);
        }
      }
    }

    const metadataFields: MetadataField[] = dto.fields.map((field) => ({
      name: field.name,
      type: field.type,
      required: field.required ?? false,
      default: field.defaultValue,
      lookup_table: field.lookupTable,
      lookup_field: field.lookupField,
    }));

    const metadata = this.metadataRegistry.create({
      tenant_id: tenantId,
      table_name: dto.tableName,
      display_name: dto.displayName,
      description: dto.description,
      fields: metadataFields,
      created_by: userId,
    });

    return this.metadataRegistry.save(metadata);
  }

  async updateTable(tenantId: string, tableName: string, dto: UpdateTableDto, userId: string): Promise<MetadataRegistry> {
    const table = await this.metadataRegistry.findOne({
      where: { tenant_id: tenantId, table_name: tableName },
    });

    if (!table) throw new NotFoundException(`Table "${tableName}" not found`);

    if (dto.displayName) table.display_name = dto.displayName;
    if (dto.description !== undefined) table.description = dto.description;

    if (dto.fields) {
      const fieldNames = new Set<string>();
      for (const field of dto.fields) {
        if (fieldNames.has(field.name)) throw new BadRequestException(`Duplicate field name: "${field.name}"`);
        fieldNames.add(field.name);
      }

      const metadataFields: MetadataField[] = dto.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required ?? false,
        default: field.defaultValue,
        lookup_table: field.lookupTable,
        lookup_field: field.lookupField,
      }));

      table.fields = metadataFields;
    }

    table.updated_at = new Date();
    return this.metadataRegistry.save(table);
  }

  async deleteTable(tenantId: string, tableName: string): Promise<void> {
    const table = await this.metadataRegistry.findOne({
      where: { tenant_id: tenantId, table_name: tableName },
    });

    if (!table) throw new NotFoundException(`Table "${tableName}" not found`);

    await this.metadataRegistry.remove(table);
  }

  async getTableSchema(tenantId: string, tableName: string): Promise<MetadataRegistry> {
    const table = await this.metadataRegistry.findOne({
      where: { tenant_id: tenantId, table_name: tableName },
    });

    if (!table) throw new NotFoundException(`Table "${tableName}" not found`);
    return table;
  }

  async listTables(tenantId: string): Promise<MetadataRegistry[]> {
    return this.metadataRegistry.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async createRecord(tenantId: string, tableName: string, dto: CreateRecordDto, userId: string): Promise<DynamicData> {
    const schema = await this.getTableSchema(tenantId, tableName);
    const validationErrors = await this.validateRecordData(tenantId, schema, dto.data, false);
    if (validationErrors.length > 0) {
      throw new BadRequestException({ message: 'Validation failed', errors: validationErrors });
    }

    const dataWithDefaults = { ...dto.data };
    for (const field of schema.fields) {
      if (!(field.name in dataWithDefaults) && field.default !== undefined) {
        dataWithDefaults[field.name] = field.default;
      }
    }

    const record = this.dynamicDataRepository.create({
      id: uuidv4(),
      tenant_id: tenantId,
      table_name: tableName,
      data: dataWithDefaults,
      created_by: userId,
    });

    return this.dynamicDataRepository.save(record);
  }

  async updateRecord(tenantId: string, tableName: string, recordId: string, dto: UpdateRecordDto, userId: string): Promise<DynamicData> {
    const record = await this.dynamicDataRepository.findOne({
      where: { id: recordId, tenant_id: tenantId, table_name: tableName },
    });

    if (!record) throw new NotFoundException(`Record not found`);

    const schema = await this.getTableSchema(tenantId, tableName);
    const validationErrors = await this.validateRecordData(tenantId, schema, dto.data, true);
    if (validationErrors.length > 0) {
      throw new BadRequestException({ message: 'Validation failed', errors: validationErrors });
    }

    record.data = { ...record.data, ...dto.data };
    record.updated_by = userId;
    record.updated_at = new Date();

    return this.dynamicDataRepository.save(record);
  }

  async deleteRecord(tenantId: string, tableName: string, recordId: string): Promise<void> {
    const record = await this.dynamicDataRepository.findOne({
      where: { id: recordId, tenant_id: tenantId, table_name: tableName },
    });

    if (!record) throw new NotFoundException(`Record not found`);
    await this.dynamicDataRepository.remove(record);
  }

  async queryRecords(tenantId: string, tableName: string, queryDto: QueryRecordsDto): Promise<{ records: DynamicData[]; total: number; page: number; limit: number }> {
    await this.getTableSchema(tenantId, tableName);

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const offset = (page - 1) * limit;

    let query = this.dynamicDataRepository
      .createQueryBuilder('d')
      .where('d.tenant_id = :tenantId', { tenantId })
      .andWhere('d.table_name = :tableName', { tableName });

    if (queryDto.filters && queryDto.filters.length > 0) {
      for (let i = 0; i < queryDto.filters.length; i++) {
        query = this.applyFilter(query, queryDto.filters[i], `filter_${i}`);
      }
    }

    if (queryDto.sort && queryDto.sort.length > 0) {
      for (const sortCondition of queryDto.sort) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sortCondition.field)) {
          throw new BadRequestException(`Invalid field name: "${sortCondition.field}"`);
        }
        query = query.orderBy(`(d.data->>'${sortCondition.field}')`, sortCondition.order);
      }
    } else {
      query = query.orderBy('d.created_at', 'DESC');
    }

    query = query.skip(offset).take(limit);
    const [records, total] = await query.getManyAndCount();

    return { records, total, page, limit };
  }

  async getRecord(tenantId: string, tableName: string, recordId: string): Promise<DynamicData> {
    const record = await this.dynamicDataRepository.findOne({
      where: { id: recordId, tenant_id: tenantId, table_name: tableName },
    });

    if (!record) throw new NotFoundException(`Record not found`);
    return record;
  }

  async bulkCreate(tenantId: string, tableName: string, records: CreateRecordDto[], userId: string): Promise<{ created: number; failed: number; errors: Array<{ index: number; message: string }> }> {
    const schema = await this.getTableSchema(tenantId, tableName);
    const results = { created: 0, failed: 0, errors: [] as Array<{ index: number; message: string }> };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < records.length; i++) {
        try {
          const dto = records[i];
          const validationErrors = await this.validateRecordData(tenantId, schema, dto.data, false);
          if (validationErrors.length > 0) {
            results.failed++;
            results.errors.push({ index: i, message: validationErrors.map((e) => `${e.field}: ${e.message}`).join('; ') });
            continue;
          }

          const dataWithDefaults = { ...dto.data };
          for (const field of schema.fields) {
            if (!(field.name in dataWithDefaults) && field.default !== undefined) {
              dataWithDefaults[field.name] = field.default;
            }
          }

          await queryRunner.manager.insert(DynamicData, {
            id: uuidv4(),
            tenant_id: tenantId,
            table_name: tableName,
            data: dataWithDefaults,
            created_by: userId,
            created_at: new Date(),
            updated_at: new Date(),
          });

          results.created++;
        } catch (error) {
          results.failed++;
          results.errors.push({ index: i, message: error.message || 'Unknown error' });
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Bulk create transaction failed');
    } finally {
      await queryRunner.release();
    }

    return results;
  }

  private async validateRecordData(tenantId: string, schema: MetadataRegistry, data: Record<string, any>, isPartialUpdate: boolean): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const fieldDef of schema.fields) {
      const fieldValue = data[fieldDef.name];
      const isPresent = fieldDef.name in data;

      if (fieldDef.required && !isPresent && !isPartialUpdate) {
        errors.push({ field: fieldDef.name, message: 'This field is required' });
        continue;
      }

      if (!isPresent) continue;

      switch (fieldDef.type) {
        case FieldType.STRING:
        case FieldType.TEXT:
          if (typeof fieldValue !== 'string') errors.push({ field: fieldDef.name, message: 'Must be a string' });
          break;
        case FieldType.INTEGER:
          if (!Number.isInteger(fieldValue)) errors.push({ field: fieldDef.name, message: 'Must be an integer' });
          break;
        case FieldType.DECIMAL:
          if (typeof fieldValue !== 'number') errors.push({ field: fieldDef.name, message: 'Must be a number' });
          break;
        case FieldType.BOOLEAN:
          if (typeof fieldValue !== 'boolean') errors.push({ field: fieldDef.name, message: 'Must be a boolean' });
          break;
        case FieldType.EMAIL:
          if (typeof fieldValue !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue))
            errors.push({ field: fieldDef.name, message: 'Must be a valid email address' });
          break;
        case FieldType.LOOKUP:
          if (fieldDef.lookup_table) {
            const refRecord = await this.dynamicDataRepository.findOne({
              where: { id: fieldValue, tenant_id: tenantId, table_name: fieldDef.lookup_table },
            });
            if (!refRecord) errors.push({ field: fieldDef.name, message: `Referenced record does not exist in table "${fieldDef.lookup_table}"` });
          }
          break;
      }
    }

    return errors;
  }

  private applyFilter(query: any, filter: FilterCondition, paramKey: string): any {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(filter.field)) {
      throw new BadRequestException(`Invalid field name: "${filter.field}"`);
    }

    switch (filter.operator) {
      case FilterOperator.EQ:
        return query.andWhere(`d.data->>'${filter.field}' = :${paramKey}`, { [paramKey]: filter.value });
      case FilterOperator.NE:
        return query.andWhere(`d.data->>'${filter.field}' != :${paramKey}`, { [paramKey]: filter.value });
      case FilterOperator.GT:
        return query.andWhere(`(d.data->>'${filter.field}')::numeric > :${paramKey}`, { [paramKey]: filter.value });
      case FilterOperator.LT:
        return query.andWhere(`(d.data->>'${filter.field}')::numeric < :${paramKey}`, { [paramKey]: filter.value });
      case FilterOperator.GTE:
        return query.andWhere(`(d.data->>'${filter.field}')::numeric >= :${paramKey}`, { [paramKey]: filter.value });
      case FilterOperator.LTE:
        return query.andWhere(`(d.data->>'${filter.field}')::numeric <= :${paramKey}`, { [paramKey]: filter.value });
      case FilterOperator.LIKE:
        return query.andWhere(`d.data->>'${filter.field}' ILIKE :${paramKey}`, { [paramKey]: `%${filter.value}%` });
      case FilterOperator.IN:
        const inValues = Array.isArray(filter.value) ? filter.value : [filter.value];
        return query.andWhere(`d.data->>'${filter.field}' IN (:...${paramKey})`, { [paramKey]: inValues });
      case FilterOperator.IS_NULL:
        return query.andWhere(`d.data->>'${filter.field}' IS NULL`);
      case FilterOperator.IS_NOT_NULL:
        return query.andWhere(`d.data->>'${filter.field}' IS NOT NULL`);
      default:
        throw new BadRequestException(`Unknown filter operator: ${filter.operator}`);
    }
  }
}
