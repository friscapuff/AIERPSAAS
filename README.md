# AiERP SaaS Platform

A modern, multi-tenant ERP system built with NestJS, React, and PostgreSQL.

## Features

- Multi-tenant architecture with tenant isolation via Row-Level Security (RLS)
- Authentication & Authorization (JWT, OAuth, RBAC)
- Comprehensive RBAC system with roles and permissions
- Inventory management
- Audit logging
- Workflow engine
- Real-time notifications
- Advanced reporting
- Multi-currency support

## Tech Stack

**Backend:**
- NestJS (Node.js framework)
- TypeScript
- PostgreSQL (Database)
- Redis (Caching & sessions)
- TypeORM (ORM)

**Frontend:**
- React
- TypeScript
- Redux/Zustand (State management)
- Material-UI or Tailwind (Styling)

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 7
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/friscapuff/AIERPSAAS.git
   cd AIERPSAAS
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Run database migrations
   ```bash
   npm run migration:run
   ```

5. Start the development server
   ```bash
   npm run start:dev
   ```

## Project Structure

```
src/
├── config/              # Configuration files
├── common/              # Shared utilities, decorators, filters
├── modules/             # Feature modules
│   ├── auth/            # Authentication & Authorization
│   ├── users/           # User management
│   ├── tenants/         # Tenant management
│   ├── inventory/       # Inventory management
│   ├── audit/           # Audit logging
│   └── workflow/        # Workflow engine
├── database/            # Migrations, seeders
└── main.ts              # Application entry point
```

## API Documentation

Swagger API documentation is available at `/api/docs` when running in development mode.

## Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## License

MIT
