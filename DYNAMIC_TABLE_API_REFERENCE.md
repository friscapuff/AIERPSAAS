# Dynamic Table Builder API Reference

## Quick Start

### 1. Create a Custom Table

```bash
POST /dynamic/tables
Authorization: Bearer {token}

{
  "tableName": "products",
  "displayName": "Products",
  "description": "Product catalog",
  "fields": [
    {
      "name": "sku",
      "type": "STRING",
      "required": true,
      "maxLength": 50
    },
    {
      "name": "name",
      "type": "STRING",
      "required": true,
      "maxLength": 255
    },
    {
      "name": "price",
      "type": "DECIMAL",
      "required": true,
      "precision": 10,
      "scale": 2
    },
    {
      "name": "quantity",
      "type": "INTEGER",
      "required": true
    },
    {
      "name": "description",
      "type": "TEXT"
    },
    {
      "name": "category_id",
      "type": "LOOKUP",
      "lookupTable": "categories",
      "lookupField": "id",
      "displayField": "name"
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "table_name": "products",
  "display_name": "Products",
  "description": "Product catalog",
  "fields": [...],
  "created_by": "uuid",
  "created_at": "2026-04-03T10:00:00Z",
  "updated_at": "2026-04-03T10:00:00Z"
}
```

### 2. Insert a Record

```bash
POST /dynamic/tables/products/records
Authorization: Bearer {token}

{
  "data": {
    "sku": "PROD-001",
    "name": "Widget A",
    "price": 29.99,
    "quantity": 100,
    "description": "High-quality widget",
    "category_id": "category-uuid-here"
  }
}
```

**Response (201):**
```json
{
  "id": "record-uuid",
  "tenant_id": "uuid",
  "table_name": "products",
  "data": {
    "sku": "PROD-001",
    "name": "Widget A",
    "price": 29.99,
    "quantity": 100,
    "description": "High-quality widget",
    "category_id": "category-uuid-here"
  },
  "created_by": "uuid",
  "created_at": "2026-04-03T10:05:00Z",
  "updated_at": "2026-04-03T10:05:00Z"
}
```

### 3. Query Records with Filters

```bash
POST /dynamic/tables/products/records/query
Authorization: Bearer {token}

{
  "filters": [
    {
      "field": "price",
      "operator": "gte",
      "value": 20
    },
    {
      "field": "quantity",
      "operator": "gt",
      "value": 0
    },
    {
      "field": "name",
      "operator": "like",
      "value": "Widget"
    }
  ],
  "sort": [
    {
      "field": "price",
      "order": "DESC"
    }
  ],
  "page": 1,
  "limit": 20
}
```

**Response (200):**
```json
{
  "records": [
    {
      "id": "uuid",
      "data": { ... },
      "created_at": "2026-04-03T10:05:00Z",
      "updated_at": "2026-04-03T10:05:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### 4. Update a Record

```bash
PUT /dynamic/tables/products/records/{recordId}
Authorization: Bearer {token}

{
  "data": {
    "quantity": 95,
    "description": "Updated description"
  }
}
```

**Response (200):** Updated record

### 5. Get All Tables

```bash
GET /dynamic/tables
Authorization: Bearer {token}
```

**Response (200):** Array of table definitions

### 6. Get Table Schema

```bash
GET /dynamic/tables/products
Authorization: Bearer {token}
```

**Response (200):** Table definition with all fields

## Field Types Reference

### STRING
Text field with optional length constraints.

```json
{
  "name": "email",
  "type": "STRING",
  "required": true,
  "minLength": 5,
  "maxLength": 255
}
```

### TEXT
Long text field (no length constraints in schema).

```json
{
  "name": "description",
  "type": "TEXT",
  "required": false
}
```

### EMAIL
Email address with validation.

```json
{
  "name": "contact_email",
  "type": "EMAIL",
  "required": true
}
```

### PHONE
Phone number with minimum 10 digit validation.

```json
{
  "name": "phone",
  "type": "PHONE",
  "required": false
}
```

### URL
Web URL with format validation.

```json
{
  "name": "website",
  "type": "URL"
}
```

### INTEGER
Integer number type.

```json
{
  "name": "count",
  "type": "INTEGER",
  "required": true,
  "defaultValue": 0
}
```

### DECIMAL
Decimal number with precision and scale.

```json
{
  "name": "price",
  "type": "DECIMAL",
  "required": true,
  "precision": 10,
  "scale": 2
}
```

### DATE
ISO 8601 date format.

```json
{
  "name": "birth_date",
  "type": "DATE",
  "required": false
}
```

### BOOLEAN
True/false value.

```json
{
  "name": "is_active",
  "type": "BOOLEAN",
  "defaultValue": true
}
```

### LOOKUP
Reference to another table's record.

```json
{
  "name": "category_id",
  "type": "LOOKUP",
  "lookupTable": "categories",
  "lookupField": "id",
  "displayField": "name",
  "required": true
}
```

## Filter Operators

### eq (Equal)
```json
{ "field": "status", "operator": "eq", "value": "active" }
```

### ne (Not Equal)
```json
{ "field": "status", "operator": "ne", "value": "deleted" }
```

### gt (Greater Than)
```json
{ "field": "price", "operator": "gt", "value": 100 }
```

### lt (Less Than)
```json
{ "field": "quantity", "operator": "lt", "value": 10 }
```

### gte (Greater Than or Equal)
```json
{ "field": "price", "operator": "gte", "value": 50 }
```

### lte (Less Than or Equal)
```json
{ "field": "quantity", "operator": "lte", "value": 1000 }
```

### like (Case-Insensitive Contains)
```json
{ "field": "name", "operator": "like", "value": "widget" }
```

### in (In Array)
```json
{ "field": "status", "operator": "in", "value": ["active", "pending", "review"] }
```

### isNull
```json
{ "field": "deleted_at", "operator": "isNull" }
```

### isNotNull
```json
{ "field": "email", "operator": "isNotNull" }
```

## Bulk Operations

### Bulk Create Records

```bash
POST /dynamic/tables/products/records/bulk
Authorization: Bearer {token}

[
  {
    "data": {
      "sku": "PROD-001",
      "name": "Widget A",
      "price": 29.99,
      "quantity": 100
    }
  },
  {
    "data": {
      "sku": "PROD-002",
      "name": "Widget B",
      "price": 39.99,
      "quantity": 50
    }
  }
]
```

**Response (201):**
```json
{
  "created": 2,
  "failed": 0,
  "errors": []
}
```

If validation fails on any record, the entire transaction is rolled back:
```json
{
  "created": 0,
  "failed": 2,
  "errors": [
    { "index": 0, "message": "price: Must be a number" },
    { "index": 1, "message": "quantity: Must be an integer" }
  ]
}
```

## Table Management

### Update Table (Add/Modify Fields)

```bash
PUT /dynamic/tables/products
Authorization: Bearer {token}

{
  "displayName": "Product Catalog",
  "fields": [
    {
      "name": "sku",
      "type": "STRING",
      "required": true,
      "maxLength": 50
    },
    {
      "name": "name",
      "type": "STRING",
      "required": true,
      "maxLength": 255
    },
    {
      "name": "price",
      "type": "DECIMAL",
      "precision": 12,
      "scale": 2
    },
    {
      "name": "cost",
      "type": "DECIMAL",
      "precision": 12,
      "scale": 2
    }
  ]
}
```

Note: Field additions are free, removals warn if data exists.

### Delete Table

```bash
DELETE /dynamic/tables/products
Authorization: Bearer {token}
```

**Response (204):** No content

Note: Soft delete - data is preserved, table removed from metadata.

## Error Responses

### Validation Error (400)
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Must be a valid email address"
    },
    {
      "field": "price",
      "message": "Must be a number"
    }
  ]
}
```

### Table Not Found (404)
```json
{
  "statusCode": 404,
  "message": "Table \"products\" not found"
}
```

### Conflict (409)
```json
{
  "statusCode": 409,
  "message": "Table \"products\" already exists for this tenant"
}
```

### Referential Integrity (400)
```json
{
  "statusCode": 400,
  "message": "Cannot delete record: 5 record(s) in table \"orders\" reference this record"
}
```

## Pagination Examples

### Get Page 1 (First 20 Records)
```bash
GET /dynamic/tables/products/records?page=1&limit=20
```

### Get Page 3 (Records 41-60)
```bash
GET /dynamic/tables/products/records?page=3&limit=20
```

### Get All (Large Limit)
```bash
GET /dynamic/tables/products/records?page=1&limit=10000
```

## Complex Filtering Examples

### Find Products in Price Range with Low Stock
```bash
POST /dynamic/tables/products/records/query
Authorization: Bearer {token}

{
  "filters": [
    { "field": "price", "operator": "gte", "value": 20 },
    { "field": "price", "operator": "lte", "value": 100 },
    { "field": "quantity", "operator": "lt", "value": 10 }
  ],
  "sort": [
    { "field": "quantity", "order": "ASC" }
  ],
  "limit": 50
}
```

### Find Records with Missing Optional Field
```bash
{
  "filters": [
    { "field": "notes", "operator": "isNull" }
  ]
}
```

### Multi-Sort Example
```bash
{
  "sort": [
    { "field": "status", "order": "ASC" },
    { "field": "created_at", "order": "DESC" }
  ]
}
```

## Performance Tips

1. **Use Limits**: Always set reasonable `limit` values (20-100)
2. **Index Friendly Filters**: Filter on fields you query frequently
3. **Pagination**: Use `page`/`limit` instead of `OFFSET/LIMIT` for large datasets
4. **Bulk Operations**: Insert multiple records at once instead of individual requests
5. **Selective Fields**: Use specific field names in filters instead of full text search
6. **Sort Optimization**: Sort by indexed fields (tenant_id, table_name, created_at)

## Rate Limiting Notes

No explicit rate limits implemented. Consider adding:
- Per-tenant limits (e.g., 1000 requests/hour)
- Per-endpoint limits (e.g., 100 bulk creates/hour)
- Exponential backoff on 429 responses

## Authentication

All endpoints require:
- Bearer token in `Authorization` header
- Valid JWT issued by the system
- Token must include tenant_id claim

## Audit Trail

All operations are automatically tracked:
- `created_by`: User ID who created the record
- `updated_by`: User ID who last updated the record
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

Query audit trail via filters:
```bash
{
  "filters": [
    { "field": "updated_at", "operator": "gte", "value": "2026-04-01T00:00:00Z" }
  ]
}
```
