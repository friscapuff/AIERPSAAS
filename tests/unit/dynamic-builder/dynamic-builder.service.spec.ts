/**
 * DynamicBuilder Service — unit test suite.
 *
 * Coverage:
 *  - createTable: success, duplicate name, duplicate field names, LOOKUP validation
 *  - validateRecordData: STRING/INTEGER/DECIMAL/DATE/EMAIL/BOOLEAN types
 *  - createRecord: required field validation, type enforcement, default values
 *  - queryRecords: filter operator logic (EQ, NE, GT, LT, LIKE, IN, IS_NULL)
 *  - Tenant isolation: Tenant A tables not visible to Tenant B
 */

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DynamicBuilderService } from '../../../apps/api/src/modules/dynamic-builder/dynamic-builder.service';
import {
  createMockRepository,
  createMockDataSource,
  mockTenantId,
  mockUserId,
} from '../../setup/test-utils';

// ---------------------------------------------------------------------------
// Enum mirrors
// ---------------------------------------------------------------------------

const FieldType = {
  STRING: 'STRING',
  TEXT: 'TEXT',
  INTEGER: 'INTEGER',
  DECIMAL: 'DECIMAL',
  DATE: 'DATE',
  BOOLEAN: 'BOOLEAN',
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  URL: 'URL',
  LOOKUP: 'LOOKUP',
} as const;

const FilterOperator = {
  EQ: 'EQ',
  NE: 'NE',
  GT: 'GT',
  LT: 'LT',
  GTE: 'GTE',
  LTE: 'LTE',
  LIKE: 'LIKE',
  IN: 'IN',
  IS_NULL: 'IS_NULL',
  IS_NOT_NULL: 'IS_NOT_NULL',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSchema(fields: any[]) {
  return {
    id: 'schema-1111',
    tenant_id: mockTenantId,
    table_name: 'test_table',
    display_name: 'Test Table',
    description: null,
    fields,
    created_by: mockUserId,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

// ---------------------------------------------------------------------------

describe('DynamicBuilderService', () => {
  let service: DynamicBuilderService;
  let metadataRegistry: ReturnType<typeof createMockRepository>;
  let dynamicDataRepository: ReturnType<typeof createMockRepository>;
  let dataSource: ReturnType<typeof createMockDataSource>;

  beforeEach(() => {
    metadataRegistry = createMockRepository();
    dynamicDataRepository = createMockRepository();
    dataSource = createMockDataSource();

    service = new DynamicBuilderService(
      metadataRegistry as any,
      dynamicDataRepository as any,
      dataSource as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // createTable
  // =========================================================================

  describe('createTable', () => {
    const createDto = {
      tableName: 'customers',
      displayName: 'Customers',
      description: 'Customer master data',
      fields: [
        { name: 'name',  type: FieldType.STRING,  required: true },
        { name: 'email', type: FieldType.EMAIL,   required: true },
        { name: 'age',   type: FieldType.INTEGER, required: false },
      ],
    };

    it('should create and return a new table schema', async () => {
      metadataRegistry.findOne.mockResolvedValue(null);
      const saved = buildSchema(createDto.fields as any);
      metadataRegistry.create.mockReturnValue(saved);
      metadataRegistry.save.mockResolvedValue(saved);
      dataSource.query.mockResolvedValue(undefined);

      const result = await service.createTable(mockTenantId, createDto as any, mockUserId);

      expect(metadataRegistry.findOne).toHaveBeenCalledWith({
        where: { tenant_id: mockTenantId, table_name: 'customers' },
      });
      expect(result.table_name).toBe('test_table');
    });

    it('should throw ConflictException when table name already exists for tenant', async () => {
      metadataRegistry.findOne.mockResolvedValue(buildSchema([]));

      await expect(
        service.createTable(mockTenantId, createDto as any, mockUserId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when duplicate field names are provided', async () => {
      metadataRegistry.findOne.mockResolvedValue(null);

      const dtoWithDuplicates = {
        ...createDto,
        fields: [
          { name: 'name', type: FieldType.STRING, required: true },
          { name: 'name', type: FieldType.TEXT,   required: false }, // duplicate
        ],
      };

      await expect(
        service.createTable(mockTenantId, dtoWithDuplicates as any, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when LOOKUP field is missing lookupTable', async () => {
      metadataRegistry.findOne.mockResolvedValue(null);

      const dtoWithBadLookup = {
        ...createDto,
        fields: [
          { name: 'customer_id', type: FieldType.LOOKUP }, // missing lookupTable/lookupField
        ],
      };

      await expect(
        service.createTable(mockTenantId, dtoWithBadLookup as any, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when LOOKUP references non-existent table', async () => {
      metadataRegistry.findOne
        .mockResolvedValueOnce(null)   // table does not exist yet — ok to create
        .mockResolvedValueOnce(null);  // referenced lookup table not found

      const dtoWithLookup = {
        ...createDto,
        fields: [
          {
            name: 'account_id',
            type: FieldType.LOOKUP,
            lookupTable: 'accounts',
            lookupField: 'id',
          },
        ],
      };

      await expect(
        service.createTable(mockTenantId, dtoWithLookup as any, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // createRecord — field validation
  // =========================================================================

  describe('createRecord', () => {
    it('should throw BadRequestException when required string field is missing', async () => {
      const schema = buildSchema([
        { name: 'full_name', type: FieldType.STRING, required: true },
      ]);
      metadataRegistry.findOne.mockResolvedValue(schema);

      await expect(
        service.createRecord(mockTenantId, 'customers', { data: {} }, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when INTEGER field receives a float', async () => {
      const schema = buildSchema([
        { name: 'quantity', type: FieldType.INTEGER, required: true },
      ]);
      metadataRegistry.findOne.mockResolvedValue(schema);

      await expect(
        service.createRecord(
          mockTenantId,
          'customers',
          { data: { quantity: 3.5 } },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when INTEGER field receives a string', async () => {
      const schema = buildSchema([
        { name: 'quantity', type: FieldType.INTEGER, required: true },
      ]);
      metadataRegistry.findOne.mockResolvedValue(schema);

      await expect(
        service.createRecord(
          mockTenantId,
          'customers',
          { data: { quantity: 'not-a-number' } },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when EMAIL field has invalid format', async () => {
      const schema = buildSchema([
        { name: 'email', type: FieldType.EMAIL, required: true },
      ]);
      metadataRegistry.findOne.mockResolvedValue(schema);

      await expect(
        service.createRecord(
          mockTenantId,
          'customers',
          { data: { email: 'not-an-email' } },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when DATE field is invalid', async () => {
      const schema = buildSchema([
        { name: 'birth_date', type: FieldType.DATE, required: true },
      ]);
      metadataRegistry.findOne.mockResolvedValue(schema);

      await expect(
        service.createRecord(
          mockTenantId,
          'customers',
          { data: { birth_date: 'not-a-date' } },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when BOOLEAN field receives a string "true"', async () => {
      const schema = buildSchema([
        { name: 'is_active', type: FieldType.BOOLEAN, required: true },
      ]);
      metadataRegistry.findOne.mockResolvedValue(schema);

      await expect(
        service.createRecord(
          mockTenantId,
          'customers',
          { data: { is_active: 'true' } }, // string, not boolean
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when DECIMAL field receives a string', async () => {
      const schema = buildSchema([
        { name: 'price', type: FieldType.DECIMAL, required: true },
      ]);
      metadataRegistry.findOne.mockResolvedValue(schema);

      await expect(
        service.createRecord(
          mockTenantId,
          'customers',
          { data: { price: '9.99' } }, // string, not number
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid data and save the record', async () => {
      const schema = buildSchema([
        { name: 'full_name', type: FieldType.STRING,  required: true },
        { name: 'age',       type: FieldType.INTEGER, required: false },
        { name: 'email',     type: FieldType.EMAIL,   required: false },
      ]);
      metadataRegistry.findOne.mockResolvedValue(schema);

      const saved = {
        id: 'record-1111',
        tenant_id: mockTenantId,
        table_name: 'customers',
        data: { full_name: 'John Doe', age: 30, email: 'john@example.com' },
        created_by: mockUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      dynamicDataRepository.create.mockReturnValue(saved);
      dynamicDataRepository.save.mockResolvedValue(saved);

      const result = await service.createRecord(
        mockTenantId,
        'customers',
        { data: { full_name: 'John Doe', age: 30, email: 'john@example.com' } },
        mockUserId,
      );

      expect(result.data.full_name).toBe('John Doe');
      expect(dynamicDataRepository.save).toHaveBeenCalled();
    });

    it('should apply default field values when field is absent in input', async () => {
      const schema = buildSchema([
        { name: 'status', type: FieldType.STRING, required: false, default: 'ACTIVE' },
      ]);
      metadataRegistry.findOne.mockResolvedValue(schema);

      let capturedData: any;
      dynamicDataRepository.create.mockImplementation((data: any) => {
        capturedData = data;
        return data;
      });
      dynamicDataRepository.save.mockResolvedValue({ id: 'rec-1', ...capturedData });

      await service.createRecord(
        mockTenantId,
        'customers',
        { data: {} },
        mockUserId,
      );

      expect(capturedData?.data?.status).toBe('ACTIVE');
    });
  });

  // =========================================================================
  // queryRecords — filter operators
  // =========================================================================

  describe('queryRecords', () => {
    let mockQb: any;

    beforeEach(() => {
      const schema = buildSchema([
        { name: 'name',  type: FieldType.STRING,  required: true },
        { name: 'score', type: FieldType.INTEGER, required: false },
      ]);
      metadataRegistry.findOne.mockResolvedValue(schema);

      mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      dynamicDataRepository.createQueryBuilder.mockReturnValue(mockQb);
    });

    it('should apply EQ filter using = operator on data field', async () => {
      await service.queryRecords(mockTenantId, 'customers', {
        filters: [{ field: 'name', operator: FilterOperator.EQ, value: 'John' }],
      } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("d.data->>'name' ="),
        expect.any(Object),
      );
    });

    it('should apply NE filter using != operator', async () => {
      await service.queryRecords(mockTenantId, 'customers', {
        filters: [{ field: 'name', operator: FilterOperator.NE, value: 'Jane' }],
      } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("!="),
        expect.any(Object),
      );
    });

    it('should apply GT filter using numeric cast', async () => {
      await service.queryRecords(mockTenantId, 'customers', {
        filters: [{ field: 'score', operator: FilterOperator.GT, value: 100 }],
      } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('> :'),
        expect.any(Object),
      );
    });

    it('should apply LT filter using numeric cast', async () => {
      await service.queryRecords(mockTenantId, 'customers', {
        filters: [{ field: 'score', operator: FilterOperator.LT, value: 50 }],
      } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('< :'),
        expect.any(Object),
      );
    });

    it('should apply LIKE filter using ILIKE with % wildcards', async () => {
      await service.queryRecords(mockTenantId, 'customers', {
        filters: [{ field: 'name', operator: FilterOperator.LIKE, value: 'Jo' }],
      } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ filter_0: '%Jo%' }),
      );
    });

    it('should apply IN filter with multiple values', async () => {
      await service.queryRecords(mockTenantId, 'customers', {
        filters: [{ field: 'name', operator: FilterOperator.IN, value: ['John', 'Jane'] }],
      } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('IN'),
        expect.objectContaining({ filter_0: ['John', 'Jane'] }),
      );
    });

    it('should apply IS_NULL filter without a value parameter', async () => {
      await service.queryRecords(mockTenantId, 'customers', {
        filters: [{ field: 'name', operator: FilterOperator.IS_NULL }],
      } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('IS NULL'),
      );
    });

    it('should throw BadRequestException for invalid field name (SQL injection guard)', async () => {
      await expect(
        service.queryRecords(mockTenantId, 'customers', {
          filters: [{ field: "name'; DROP TABLE users--", operator: FilterOperator.EQ, value: 'x' }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // Tenant isolation
  // =========================================================================

  describe('tenant isolation', () => {
    it('should not return tables belonging to a different tenant', async () => {
      const tenantAId = 'aaaa-aaaa-aaaa';
      const tenantBId = 'bbbb-bbbb-bbbb';

      // Tenant B's repository returns only Tenant B's tables
      metadataRegistry.find.mockResolvedValue([
        buildSchema([{ name: 'id', type: FieldType.STRING, required: true }]),
      ]);

      const tenantBTables = await service.listTables(tenantBId);

      expect(metadataRegistry.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenant_id: tenantBId }),
        }),
      );
      // Tenant A's tables should not appear in Tenant B's results
      for (const table of tenantBTables) {
        expect((table as any).tenant_id).not.toBe(tenantAId);
      }
    });

    it('should throw NotFoundException when accessing another tenant\'s table schema', async () => {
      // Tenant B tries to get Tenant A's table — findOne returns null (different tenant_id in WHERE)
      metadataRegistry.findOne.mockResolvedValue(null);

      await expect(
        service.getTableSchema('tenant-b', 'tenant_a_secret_table'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should scope createRecord query to the requesting tenant', async () => {
      const schema = buildSchema([
        { name: 'name', type: FieldType.STRING, required: true },
      ]);
      metadataRegistry.findOne.mockResolvedValue(schema);

      const saved = {
        id: 'rec-1111',
        tenant_id: 'tenant-b',
        table_name: 'customers',
        data: { name: 'Bob' },
        created_by: mockUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      dynamicDataRepository.create.mockReturnValue(saved);
      dynamicDataRepository.save.mockResolvedValue(saved);

      await service.createRecord('tenant-b', 'customers', { data: { name: 'Bob' } }, mockUserId);

      expect(dynamicDataRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_id: 'tenant-b' }),
      );
    });
  });

  // =========================================================================
  // getTableSchema / listTables
  // =========================================================================

  describe('getTableSchema', () => {
    it('should return the schema when table exists', async () => {
      const schema = buildSchema([]);
      metadataRegistry.findOne.mockResolvedValue(schema);

      const result = await service.getTableSchema(mockTenantId, 'test_table');
      expect(result).toEqual(schema);
    });

    it('should throw NotFoundException when table does not exist', async () => {
      metadataRegistry.findOne.mockResolvedValue(null);

      await expect(
        service.getTableSchema(mockTenantId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listTables', () => {
    it('should return all tables for the tenant', async () => {
      const tables = [buildSchema([]), buildSchema([])];
      metadataRegistry.find.mockResolvedValue(tables);

      const result = await service.listTables(mockTenantId);

      expect(result).toHaveLength(2);
      expect(metadataRegistry.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenant_id: mockTenantId } }),
      );
    });

    it('should return empty array when tenant has no tables', async () => {
      metadataRegistry.find.mockResolvedValue([]);
      const result = await service.listTables(mockTenantId);
      expect(result).toEqual([]);
    });
  });
});
