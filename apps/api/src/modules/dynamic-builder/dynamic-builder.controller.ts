import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DynamicBuilderService } from './dynamic-builder.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateTableDto,
  UpdateTableDto,
  CreateRecordDto,
  UpdateRecordDto,
  QueryRecordsDto,
} from './dto';

@ApiTags('Dynamic Builder')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dynamic-builder')
export class DynamicBuilderController {
  constructor(private readonly dynamicBuilderService: DynamicBuilderService) {}

  @Post('tables')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new custom table definition' })
  @ApiBody({ type: CreateTableDto })
  @ApiResponse({ status: 201, description: 'Table definition created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid table or field definition' })
  @ApiResponse({ status: 409, description: 'Table already exists' })
  async createTable(
    @Body() createTableDto: CreateTableDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dynamicBuilderService.createTable(tenantId, createTableDto, userId);
  }

  @Get('tables')
  @ApiOperation({ summary: 'List all custom table definitions for the tenant' })
  @ApiResponse({ status: 200, description: 'List of table definitions' })
  async getTables(@CurrentTenant() tenantId: string) {
    return this.dynamicBuilderService.listTables(tenantId);
  }

  @Get('tables/:name')
  @ApiOperation({ summary: 'Get a specific table definition' })
  @ApiParam({ name: 'name', description: 'Table name' })
  @ApiResponse({ status: 200, description: 'Table definition' })
  @ApiResponse({ status: 404, description: 'Table not found' })
  async getTable(
    @Param('name') tableName: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.dynamicBuilderService.getTableSchema(tenantId, tableName);
  }

  @Put('tables/:name')
  @ApiOperation({ summary: 'Update a table definition (add/modify/remove fields)' })
  @ApiParam({ name: 'name', description: 'Table name' })
  @ApiBody({ type: UpdateTableDto })
  @ApiResponse({ status: 200, description: 'Table definition updated' })
  @ApiResponse({ status: 404, description: 'Table not found' })
  async updateTable(
    @Param('name') tableName: string,
    @Body() updateTableDto: UpdateTableDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dynamicBuilderService.updateTable(tenantId, tableName, updateTableDto, userId);
  }

  @Delete('tables/:name')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a table (data is preserved)' })
  @ApiParam({ name: 'name', description: 'Table name' })
  @ApiResponse({ status: 204, description: 'Table deleted' })
  @ApiResponse({ status: 404, description: 'Table not found' })
  async deleteTable(
    @Param('name') tableName: string,
    @CurrentTenant() tenantId: string,
  ): Promise<void> {
    await this.dynamicBuilderService.deleteTable(tenantId, tableName);
  }

  @Post('tables/:name/records')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new record in a table' })
  @ApiParam({ name: 'name', description: 'Table name' })
  @ApiBody({ type: CreateRecordDto })
  @ApiResponse({ status: 201, description: 'Record created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Table not found' })
  async createRecord(
    @Param('name') tableName: string,
    @Body() createRecordDto: CreateRecordDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dynamicBuilderService.createRecord(tenantId, tableName, createRecordDto, userId);
  }

  @Get('tables/:name/records')
  @ApiOperation({ summary: 'Query records from a table with filters, sorting, and pagination' })
  @ApiParam({ name: 'name', description: 'Table name' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of records with pagination metadata' })
  @ApiResponse({ status: 404, description: 'Table not found' })
  async queryRecords(
    @Param('name') tableName: string,
    @Query() queryDto: QueryRecordsDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.dynamicBuilderService.queryRecords(tenantId, tableName, queryDto);
  }

  @Post('tables/:name/records/query')
  @ApiOperation({ summary: 'Query records with POST body (for complex filters)' })
  @ApiParam({ name: 'name', description: 'Table name' })
  @ApiBody({ type: QueryRecordsDto })
  @ApiResponse({ status: 200, description: 'List of records with pagination metadata' })
  @ApiResponse({ status: 404, description: 'Table not found' })
  async queryRecordsPost(
    @Param('name') tableName: string,
    @Body() queryDto: QueryRecordsDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.dynamicBuilderService.queryRecords(tenantId, tableName, queryDto);
  }

  @Get('tables/:name/records/:id')
  @ApiOperation({ summary: 'Get a single record by ID' })
  @ApiParam({ name: 'name', description: 'Table name' })
  @ApiParam({ name: 'id', description: 'Record ID' })
  @ApiResponse({ status: 200, description: 'Record data' })
  @ApiResponse({ status: 404, description: 'Record or table not found' })
  async getRecord(
    @Param('name') tableName: string,
    @Param('id') recordId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.dynamicBuilderService.getRecord(tenantId, tableName, recordId);
  }

  @Put('tables/:name/records/:id')
  @ApiOperation({ summary: 'Update a record (partial update supported)' })
  @ApiParam({ name: 'name', description: 'Table name' })
  @ApiParam({ name: 'id', description: 'Record ID' })
  @ApiBody({ type: UpdateRecordDto })
  @ApiResponse({ status: 200, description: 'Record updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Record or table not found' })
  async updateRecord(
    @Param('name') tableName: string,
    @Param('id') recordId: string,
    @Body() updateRecordDto: UpdateRecordDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dynamicBuilderService.updateRecord(tenantId, tableName, recordId, updateRecordDto, userId);
  }

  @Delete('tables/:name/records/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a record' })
  @ApiParam({ name: 'name', description: 'Table name' })
  @ApiParam({ name: 'id', description: 'Record ID' })
  @ApiResponse({ status: 204, description: 'Record deleted' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async deleteRecord(
    @Param('name') tableName: string,
    @Param('id') recordId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<void> {
    await this.dynamicBuilderService.deleteRecord(tenantId, tableName, recordId);
  }

  @Post('tables/:name/records/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create records (atomic transaction)' })
  @ApiParam({ name: 'name', description: 'Table name' })
  @ApiResponse({ status: 201, description: 'Bulk operation result with success/failure counts' })
  @ApiResponse({ status: 404, description: 'Table not found' })
  async bulkCreateRecords(
    @Param('name') tableName: string,
    @Body() records: CreateRecordDto[],
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dynamicBuilderService.bulkCreate(tenantId, tableName, records, userId);
  }
}
