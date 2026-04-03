# Dynamic Table Builder - Implementation Guide

## Overview

The Dynamic Table Builder allows users to create custom tables with flexible field types, validation, and relationships without code.

## Architecture

### Controller Layer
`apps/api/src/modules/dynamic-builder/dynamic-builder.controller.ts`

- Handles HTTP requests for table and record operations
- Validates incoming DTOs
- Returns formatted responses

### Service Layer
`apps/api/src/modules/dynamic-builder/dynamic-builder.service.ts`

- Business logic for table CRUD operations
- Record creation, update, delete, query
- Dynamic schema generation
- Relationship handling

### Database Integration

- Uses TypeORM for database operations
- Creates tables dynamically in PostgreSQL
- Maintains metadata in `metadata_registry` table

## Supported Field Types

```typescript
enum FieldType {
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  DECIMAL = 'DECIMAL',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  TEXT = 'TEXT',
  JSON = 'JSON',
  LOOKUP = 'LOOKUP',      // Foreign key
  COMPUTED = 'COMPUTED',  // Formula-based
}
```

## Multi-tenancy

All dynamic tables are tenant-aware:
- Tenant ID is automatically included in all queries
- Uses PostgreSQL Row-Level Security (RLS)
- Each tenant's data is logically separated

## API Endpoints

### Tables
- `POST /dynamic/tables` - Create table
- `GET /dynamic/tables` - List tables
- `GET /dynamic/tables/:id` - Get table details
- `PATCH /dynamic/tables/:id` - Update table
- `DELETE /dynamic/tables/:id` - Delete table

### Records
- `POST /dynamic/tables/:tableName/records` - Create record
- `GET /dynamic/tables/:tableName/records` - Query records
- `GET /dynamic/tables/:tableName/records/:id` - Get record
- `PATCH /dynamic/tables/:tableName/records/:id` - Update record
- `DELETE /dynamic/tables/:tableName/records/:id` - Delete record

## Data Validation

Validation occurs at multiple levels:

1. **DTO Validation**: Using class-validator
2. **Type Checking**: Field types are enforced
3. **Required Fields**: Checked before insert/update
4. **Relationships**: Lookup fields validated against target tables
5. **Custom Rules**: Support for regex patterns, min/max values

## Performance Considerations

- Metadata caching for frequently accessed table definitions
- Indexed lookups on common query fields
- Pagination support for large record sets
- Batch operations for bulk inserts
