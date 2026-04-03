# Dynamic Table API Reference

## Overview

The Dynamic Table API enables CRUD operations on tenant-specific tables through a unified RESTful interface.

## Endpoints

### Create Record

```
POST /api/v1/dynamic-tables/:tableName
```

**Request Body:**
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

**Response:**
```json
{
  "id": "uuid",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "field1": "value1",
  "field2": "value2"
}
```

### Read Records

```
GET /api/v1/dynamic-tables/:tableName
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 20)
- `search`: Search across text fields
- `sort`: Sort field and direction (e.g., `createdAt:desc`)
- `filter`: JSON filter object

### Read Single Record

```
GET /api/v1/dynamic-tables/:tableName/:id
```

### Update Record

```
PATCH /api/v1/dynamic-tables/:tableName/:id
```

### Delete Record

```
DELETE /api/v1/dynamic-tables/:tableName/:id
```

## Filtering

Filters support standard operators:

```json
{
  "field": {
    "$eq": "value",
    "$ne": "value",
    "$gt": "value",
    "$lt": "value",
    "$gte": "value",
    "$lte": "value",
    "$in": ["value1", "value2"],
    "$nin": ["value1", "value2"],
    "$contains": "substring"
  }
}
```

## Authentication

All requests require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```
