# AiERP SaaS Platform

AI-driven Enterprise Resource Planning (ERP) SaaS platform built with NestJS, React, and PostgreSQL.

## Architecture Overview

- **Backend**: NestJS (Node.js)
- **Frontend**: React
- **Database**: PostgreSQL
- **Cache**: Redis
- **Multi-tenancy**: Row-Level Security (RLS)

## Project Structure

```
aierp/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── tenants/
│   │   ├── general-ledger/
│   │   ├── accounts-payable/
│   │   ├── accounts-receivable/
│   │   ├── inventory/
│   │   ├── fixed-assets/
│   │   ├── payroll/
│   │   ├── dynamic-builder/
│   │   └── reporting/
│   ├── database/
│   ├── common/
│   └── main.ts
├── test/
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/mohWatheq/AIERPSAAS.git
   cd aierp
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
  cp .env.example .env
   ```

4. Start PostgreSQL and Redis
   ```bash
   docker-compose up -d
   ```

5. Run database migrations
   ```bash
   npm run migration:run
   ```

6. Start the development server
   ```bash
   npm run start:dev
   ```

## Development

### Running Tests

```bash
npm test
```

### Code Quality

```bash
npm run lint
npm run format
```

## API Documentation

Once the server is running, visit `http://localhost:3000/api/docs` for Swagger documentation.

## License

MIT
