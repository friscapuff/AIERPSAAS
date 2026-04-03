# AiERP Setup & Deployment Summary

## Project Overview

**AiERP** is a comprehensive, multi-tenant ERP SaaS platform built with modern technologies.

### Core Architecture
- **Monorepo**: NestJS with multiple apps and libraries
- **Backend**: API server + Background worker
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Cache**: Redis for sessions and caching
- **Container**: Docker & Docker Compose

## Tech Stack

### Runtime & Framework
- Node.js 18+
- TypeScript 5.1
- NestJS 10

### Databases
- PostgreSQL 15 (primary database)
- Redis 7 (cache & sessions)

### Key Libraries
- TypeORM (database ORM)
- Passport.js (authentication)
- JWT (token-based auth)
- Class Validator (DTO validation)
- Swagger (API documentation)

## Project Structure

```
project/
├── apps/
│   ├── api/                 # Main API server
│   │   └── src/
│   │       ├── common/      # Guards, filters, interceptors
│   │       └── modules/     # Feature modules
│   └── worker/              # Background job processor
├── libs/
│   ├── database/            # Database entities & migrations
│   ├── auth/                # Authentication library
│   ├── logger/              # Logging utilities
│   ├── shared/              # Shared utilities
│   └── validation/          # Validation schemas
├── docker/                  # Docker configurations
└── test/                    # E2E tests
```

## Key Features Implemented

### 1. Multi-Tenant Architecture
- Tenant isolation via Row-Level Security (RLS)
- Per-tenant data segregation
- Tenant-aware service layer
- Tenant configuration management

### 2. Authentication & Authorization
- JWT-based token authentication
- Refresh token rotation
- Password hashing with bcrypt
- OAuth2 integration ready
- Role-Based Access Control (RBAC)

### 3. Inventory Management
- Product master data
- Warehouse management
- Stock tracking and movements
- Reorder level automation
- Stock valuation (FIFO, LIFO, Weighted Average)

### 4. Financial Management
- Chart of Accounts
- GL Posting
- Multi-currency support
- Cost layer tracking
- Financial reporting

### 5. Audit & Compliance
- Comprehensive audit logging
- Change tracking
- User activity monitoring
- Compliance reporting
- Data export capabilities

### 6. Workflow Engine
- Workflow definition and execution
- Step-based processing
- Conditional logic and branching
- Event-driven architecture
- Integration with inventory and finance modules

### 7. Dynamic Table Builder
- Create custom tables via API
- Dynamic CRUD operations
- Schema validation
- Real-time table queries
- Field type support (string, number, date, etc.)

## Database Schema

### Core Tables
- `users` - User accounts
- `roles` - Role definitions
- `permissions` - Permission definitions
- `tenants` - Tenant organizations
- `tenant_settings` - Tenant configuration

### Inventory Tables
- `products` - Product master
- `warehouses` - Warehouse locations
- `stock` - Current stock levels
- `stock_movements` - Stock transaction history

### Finance Tables
- `chart_of_accounts` - GL accounts
- `journal_entries` - GL transactions
- `cost_layers` - Inventory costing

### System Tables
- `audit_logs` - Audit trail
- `workflows` - Workflow definitions
- `workflow_instances` - Workflow executions
- `dynamic_tables` - Custom table definitions

## Installation & Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7

### Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/friscapuff/AIERPSAAS.git
   cd AIERPSAAS
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start containers**
   ```bash
   docker-compose up -d
   ```

4. **Run migrations**
   ```bash
   npm run migration:run
   ```

5. **Start development server**
   ```bash
   npm run start:dev
   ```

6. **Access API**
   - API: http://localhost:3000
   - Swagger Docs: http://localhost:3000/api/docs
   - Health Check: http://localhost:3000/health

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - User logout

### Inventory
- `GET/POST /api/v1/inventory/products` - Product management
- `GET/POST /api/v1/inventory/warehouses` - Warehouse management
- `GET/POST /api/v1/inventory/stock` - Stock operations
- `POST /api/v1/inventory/stock/adjust` - Stock adjustment
- `POST /api/v1/inventory/stock/transfer` - Stock transfer

### Finance
- `GET/POST /api/v1/finance/accounts` - Chart of accounts
- `GET/POST /api/v1/finance/entries` - Journal entries
- `GET /api/v1/finance/reports` - Financial reports

### Audit
- `GET /api/v1/audit/logs` - Audit logs
- `GET /api/v1/audit/user-activity` - User activity
- `GET /api/v1/audit/reports` - Audit reports

### Workflow
- `GET/POST /api/v1/workflow/definitions` - Workflow management
- `POST /api/v1/workflow/execute` - Execute workflow
- `GET /api/v1/workflow/instances` - Workflow instances

### Dynamic Tables
- `GET/POST /api/v1/dynamic-tables` - Table management
- `GET/POST /api/v1/dynamic/:tableName` - CRUD operations

## Deployment

### Docker Deployment

1. **Build image**
   ```bash
   docker build -t aierp:latest .
   ```

2. **Run container**
   ```bash
   docker run -p 3000:3000 --env-file .env aierp:latest
   ```

### Kubernetes Deployment

Kubernetes manifests available in `k8s/` directory for scalable cloud deployments.

## Testing

```bash
# Unit tests
npm test

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

## Development Workflows

### Adding a New Feature
1. Create module in `apps/api/src/modules/`
2. Define entities in `libs/database/src/entities/`
3. Create migrations if needed
4. Implement services and controllers
5. Add DTOs and validation
6. Create tests
7. Document in Swagger

### Database Migrations
```bash
# Generate migration
npm run typeorm migration:generate -- src/database/migrations/MyMigration

# Run migrations
npm run typeorm migration:run

# Revert migration
npm run typeorm migration:revert
```

## Performance Optimization

- Database connection pooling
- Redis caching for frequent queries
- Query optimization and indexing
- Pagination for large result sets
- Lazy loading of relationships

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Row-Level Security (RLS) for multi-tenancy
- Input validation and sanitization
- CORS configuration
- Rate limiting ready
- SQL injection prevention (TypeORM)

## Monitoring & Logging

- Structured JSON logging
- Request/response logging
- Error tracking integration ready
- Health check endpoint
- Metrics collection ready

## Support & Documentation

- Full Swagger API documentation
- Implementation guides
- Architecture documentation
- Database schema documentation
- Integration examples

## Next Steps

1. Customize environment configuration
2. Configure tenant data
3. Set up user roles and permissions
4. Configure workflow definitions
5. Deploy to production environment
6. Set up monitoring and alerts
7. Configure backup and disaster recovery
