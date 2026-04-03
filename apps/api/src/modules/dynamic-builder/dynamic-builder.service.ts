import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MetadataRegistry } from 'libs/database/src/entities/metadata-registry.entity';
import { CreateTableDto, CreateRecordDto, UpdateRecordDto, QueryRecordsDto } from './dto';

interface FieldDefinition {
  name: string;
  type: string;
  required?: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  defaultValue?: any;
  lookupTable?: string;
  lookupField?: string;
  displayField?: string;
}

@Injectable()
export class DynamicBuilderService {
  private readonly logger = new Logger(DynamicBuilderService.name);

  constructor(
    @InjectRepository(MetadataRegistry)
    private metadataRepository: Repository<MetadataRegistry>,
    private dataSource: DataSource,
  ) {}

  async createTable(tenantId: string, userId: string, dto: CreateTableDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create metadata record
      const metadata = this.metadataRepository.create({
        tenant_id: tenantId,
        table_name: dto.tableName,
        display_name: dto.displayName,
        description: dto.description,
        fields: dto.fields,
        created_by: userId,
        created_at: new Date(),
      });

      const savedMetadata = await this.metadataRepository.save(metadata);

      // Create actual database table
      const createTableSql = this.generateCreateTableSQL(tenantId, dto.tableName, dto.fields);
      await queryRunner.query(createTableSql);

      // Add RLS policies
      await this.addRLSPolicies(queryRunner, tenantId, dto.tableName);

      await queryRunner.commitTransaction();
      return savedMetadata;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create table: ${error.message}`);
      throw new BadRequestException(`Failed to create table: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async insertRecord(tenantId: string, tableName: string, userId: string, dto: CreateRecordDto) {
    const metadata = await this.getTableMetadata(tenantId, tableName);
    if (!metadata) {
      throw new NotFoundException(`Table ${tableName} not found`);
    }

    // Validate data against field definitions
    this.validateRecordData(dto.data, metadata.fields);

    const values = Object.values(dto.data).map((v) => v);
    const columns = Object.keys(dto.data).join(', ');
    const placeholders = Object.keys(dto.data)
      .map((_, i) => `$${i + 3}`)
      .join(', ');

    const sql = `INSERT INTO "${tableName}" (tenant_id, created_by, ${columns}) VALUES ($1, $2, ${placeholders}) RETURNING *`;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const result = await queryRunner.query(sql, [tenantId, userId, ...values]);
      return result[0];
    } catch (error) {
      this.logger.error(`Failed to insert record: ${error.message}`);
      throw new BadRequestException(`Failed to insert record: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async queryRecords(tenantId: string, tableName: string, dto: QueryRecordsDto) {
    const metadata = await this.getTableMetadata(tenantId, tableName);
    if (!metadata) {
      throw new NotFoundException(`Table ${tableName} not found`);
    }

    const skip = (dto.page - 1) * dto.limit;
    const orderBy = dto.sort ? `ORDER BY ${dto.sort}` : 'ORDER BY created_at DESC';

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const sql = `SELECT * FROM "${tableName}" WHERE tenant_id = $1 ${orderBy} LIMIT $2 OFFSET $3`;
      const data = await queryRunner.query(sql, [tenantId, dto.limit, skip]);

      const countSql = `SELECT COUNT(*) as count FROM "${tableName}" WHERE tenant_id = $1`;
      const countResult = await queryRunner.query(countSql, [tenantId]);
      const total = parseInt(countResult[0].count);

      return {
        data,
        pagination: {
          page: dto.page,
          limit: dto.limit,
          total,
          pages: Math.ceil(total / dto.limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to query records: ${error.message}`);
      throw new BadRequestException(`Failed to query records: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  private generateCreateTableSQL(tenantId: string, tableName: string, fields: FieldDefinition[]): string {
    let sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL DEFAULT '${tenantId}',
      created_by UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP`;

    for (const field of fields) {
      sql += `,
      "${field.name}" ${this.mapFieldTypeToSQL(field)}`;
    }

    sql += `
    )`;
    return sql;
  }

  private mapFieldTypeToSQL(field: FieldDefinition): string {
    const typeMap: { [key: string]: string } = {
      STRING: `VARCHAR(${field.maxLength || 255})`,
      INTEGER: 'INTEGER',
      DECIMAL: `NUMERIC(${field.precision || 10},${field.scale || 2})`,
      BOOLEAN: 'BOOLEAN',
      DATE: 'DATE',
      DATETIME: 'TIMESTAMP',
      TEXT: 'TEXT',
      JSON: 'JSONB',
      LOOKUP: 'UUID',
    };

    let sql = typeMap[field.type] || 'TEXT';
    if (field.required) {
      sql += ' NOT NULL';
    }
    if (field.defaultValue !== undefined) {
      sql += ` DEFAULT '${field.defaultValue}'`;
    }
    return sql;
  }

  private validateRecordData(data: any, fields: FieldDefinition[]) {
    for (const field of fields) {
      if (field.required && (data[field.name] === undefined || data[field.name] === null)) {
        throw new BadRequestException(`Field ${field.name} is required`);
      }

      if (data[field.name] !== undefined && field.maxLength && data[field.name].length > field.maxLength) {
        throw new BadRequestException(`Field ${field.name} exceeds max length of ${field.maxLength}`);
      }
    }
  }

  private async getTableMetadata(tenantId: string, tableName: string) {
    return this.metadataRepository.findOne({
      where: { tenant_id: tenantId, table_name: tableName },
    });
  }

  private async addRLSPolicies(queryRunner: any, tenantId: string, tableName: string) {
    // Enable RLS on table
    await queryRunner.query(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY`);

    // Create policy for tenant isolation
    await queryRunner.query(`
      CREATE POLICY ${tableName}_tenant_isolation ON "${tableName}"
      USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid)
    `);
  }
}
