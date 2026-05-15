# AiERP Core API Application Structure

## Overview
Complete NestJS bootstrap with multi-tenant support, PostgreSQL RLS integration, RBAC, and production-quality middleware/interceptors.

## Key Features

### Tenant Isolation
- Extracts tenant_id from `X-Tenant-ID` header or JWT token
- Sets PostgreSQL session variable: `SET LOCAL app.current_tenant_id = 'xxx'`
- Enforces tenant context on all protected routes

### Authentication and Authorization
- JWT token validation via `JwtAuthGuard`
- Role-based access control via `RolesGuard`
- Module-level and action-level permissions

### Auditing
- Automatic logging of all Create, Update, Delete operations
- Records: user_id, action, old_values, new_values, timestamp, IP, user agent
