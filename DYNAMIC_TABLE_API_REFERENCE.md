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
  "created_at": "2026-04-03T10:05:00Z",
  "created_by": "user-uuid"
}
```

### 3. Query Records

```bash
GET /dynamic/tables/products/records?page=1&limit=10&sort=-created_at
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "data": [...],
  "total": 50,
  "page": 1,
  "limit": 10,
  "pages": 5
}
```

## Field Types

- `STRING`: Text up to specified maxLength
- `INTEGER`: Whole numbers
- `DECIMAL`: Decimal numbers with precision/scale
- `BOOLEAN`: True/false
- `DATE`: ISO date format
- `DATETIME`: ISO datetime format
- `TEXT`: Long text content
- `JSON`: JSON object/array
- `LOOKUP`: Foreign key reference
- `COMPUTED`: Formula-based field (read-only)

## Error Handling

All errors follow standard HTTP status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Unprocessable Entity (validation)
- 500: Server Error

Error response format:
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```
