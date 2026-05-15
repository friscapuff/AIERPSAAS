# AiERP — Claude Code Agent Team Prompts

> **Pre-requisite**: Enable agent teams in Claude Code:
> ```bash
> export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
> ```

---

## PHASE 0: Foundation Hardening (Week 1-2)

```
Goal: Harden the NestJS monorepo scaffold — ensure npm install works, TypeScript compiles cleanly, Docker containers start, and all module imports resolve. Fix any type errors, missing dependencies, or broken imports across the 79-file codebase.
Team: foundation-hardening | Size: 3 | Model: sonnet

Teammate 1: Build Engineer
- Responsibilities: Fix package.json dependencies and workspace config, ensure `npm install` succeeds, fix tsconfig paths, ensure `npm run build` compiles with zero errors, fix all import paths across the monorepo
- File ownership: package.json, tsconfig.json, tsconfig.*.json, nest-cli.json, apps/api/tsconfig.*.json, libs/*/tsconfig.*.json, libs/*/package.json
- Deliverables:
  - Clean `npm install` with zero errors
  - Clean `npm run build` with zero TypeScript errors
  - All path aliases (@app/*, @libs/*) resolving correctly
  - Working NestJS CLI commands (nest build, nest start)
- Dependencies: None
- When done: message DevOps Engineer with confirmation that build succeeds

Teammate 2: DevOps Engineer
- Responsibilities: Validate and fix Docker configs, ensure docker-compose up starts all services (PostgreSQL, Redis, API), verify PostgreSQL init.sql runs and creates RLS functions, verify health checks pass
- File ownership: docker/, docker-compose.yml, docker-compose.dev.yml, .github/workflows/, scripts/
- Deliverables:
  - `docker-compose up` starts PostgreSQL 16, Redis 7, and API container
  - PostgreSQL init.sql executes: extensions, RLS functions, aierp schema
  - Health checks passing for all services
  - CI workflow validates on push
- Dependencies: Needs Build Engineer to confirm npm build works
- When done: message QA Validator with running service URLs

Teammate 3: QA Validator
- Responsibilities: Verify all 9 NestJS modules load without errors, test that the API starts and Swagger UI is accessible at /api/docs, verify tenant middleware activates, run any existing tests, create a smoke test
- File ownership: tests/, apps/api/src/main.ts (read-only)
- Deliverables:
  - API starts on port 3000 without errors
  - Swagger UI accessible at /api/v1/docs
  - All 9 modules registered in NestJS dependency injection
  - Basic smoke test: GET /api/v1/health returns 200
  - Test report documenting any remaining issues
- Dependencies: Needs DevOps Engineer services running
- When done: provide final status report with pass/fail for each check

Final deliverables:
- Zero build errors, zero TypeScript errors
- Docker environment fully operational
- API serving Swagger docs
- All modules loading cleanly
- Smoke test passing
```

---

## PHASE 1A: Financial Engine — Core Implementation (Week 3-6)

```
Goal: Implement the complete double-entry accounting engine: Chart of Accounts CRUD with hierarchy, Journal Entry creation with strict debit=credit validation, GL posting with accounting templates, Financial Period management with open/close/lock, and Trial Balance report. Every financial calculation must have 100% test coverage.
Team: financial-engine | Size: 4 | Model: sonnet

Teammate 1: Database & Schema Engineer
- Responsibilities: Refine and finalize the financial database schema, create production-ready TypeORM migrations, implement database-level constraints (CHECK debit >= 0, CHECK credit >= 0), create stored procedures for trial balance calculation, add database triggers to prevent GL modification after posting
- File ownership: libs/database/src/entities/chart-of-accounts.entity.ts, libs/database/src/entities/gl-transaction.entity.ts, libs/database/src/entities/financial-period.entity.ts, libs/database/src/entities/accounting-template.entity.ts, apps/api/src/database/migrations/
- Deliverables:
  - Finalized entity definitions with all constraints and indexes
  - Migration: financial_constraints (CHECK constraints, triggers, stored procs)
  - Database-level immutability: GL rows cannot be UPDATEd or DELETEd after posting
  - Stored procedure: sp_trial_balance(tenant_id, period_id) returning account balances
  - Seed data: Default COA template (IFRS-compliant), default financial periods for current year
- Dependencies: None (starts immediately)
- When done: message Business Logic Developer with entity definitions and constraint details

Teammate 2: Business Logic Developer
- Responsibilities: Implement the core financial services — this is the HEART of the ERP. Build ChartOfAccountsService (CRUD + hierarchy traversal), JournalEntryService (create with STRICT debit=credit validation), PostingService (apply accounting templates, create GL entries), PeriodService (open/close/lock periods, prevent posting to closed periods)
- File ownership: apps/api/src/modules/finance/finance.service.ts, apps/api/src/modules/finance/services/ (new subdirectory for each service), apps/api/src/modules/finance/dto/
- Deliverables:
  - ChartOfAccountsService: create, update, delete (soft), getTree, getByCode, validateAccountType
  - JournalEntryService: createEntry(lines[]) — MUST throw if SUM(debits) !== SUM(credits), supports multi-currency with exchange rates
  - PostingService: postDocument(docType, docId) — looks up accounting template, generates balanced GL entries, writes to gl_transactions in a single DB transaction (ACID)
  - PeriodService: openPeriod, closePeriod (prevents new postings), lockPeriod (prevents any changes), getCurrentPeriod
  - All DTOs with class-validator decorators
  - CRITICAL RULE: Use decimal.js or similar for ALL financial calculations — NEVER use JavaScript floating point
- Dependencies: Needs Database Engineer's finalized entities
- When done: message API Developer with service method signatures

Teammate 3: API Developer
- Responsibilities: Build the Finance REST API endpoints with full Swagger documentation, request validation, and proper error handling. Wire controllers to services.
- File ownership: apps/api/src/modules/finance/finance.controller.ts, apps/api/src/modules/finance/finance.module.ts, apps/api/src/modules/finance/controllers/ (subdirectory if splitting)
- Deliverables:
  - COA endpoints: GET /finance/accounts (tree), POST /finance/accounts, PUT /finance/accounts/:id, DELETE /finance/accounts/:id
  - Journal endpoints: POST /finance/journals (create entry), GET /finance/journals (list with filters), GET /finance/journals/:id
  - Posting endpoint: POST /finance/documents/:type/:id/post (trigger accounting template)
  - Period endpoints: GET /finance/periods, POST /finance/periods/:id/close, POST /finance/periods/:id/lock
  - Reports: GET /finance/trial-balance?periodId=X, GET /finance/account-balance/:accountId
  - Full OpenAPI documentation with examples for every endpoint
  - Proper HTTP status codes (201 for creation, 422 for validation errors, 409 for period conflicts)
- Dependencies: Needs Business Logic Developer's service interfaces
- When done: message QA Engineer with endpoint list and example payloads

Teammate 4: QA Engineer
- Responsibilities: Write comprehensive tests for ALL financial logic. The financial engine requires 100% test coverage on business logic — rounding errors, edge cases, and race conditions can cause real monetary losses.
- File ownership: tests/unit/finance/, tests/integration/finance/, tests/e2e/finance/
- Deliverables:
  - Unit tests for JournalEntryService: balanced entries pass, unbalanced throw, zero amounts rejected, negative amounts rejected, multi-currency conversion
  - Unit tests for PostingService: template lookup works, GL entries created correctly, ACID rollback on partial failure
  - Unit tests for PeriodService: posting to closed period rejected, closing with unposted entries warned
  - Unit tests for COA: hierarchy validation, circular reference prevention, type consistency
  - Integration tests: full posting cycle (create journal → post → verify GL → check trial balance)
  - Edge cases: 0.01 rounding differences, very large amounts (10+ digits), concurrent postings to same period
  - Coverage report: must be 100% on services, 90%+ on controllers
- Dependencies: Needs all services and controllers implemented
- When done: provide test coverage report and list of any failing edge cases

Final deliverables:
- Complete Chart of Accounts CRUD with hierarchy
- Journal entry creation with bulletproof debit=credit validation
- Document posting via accounting templates
- Financial period management (open/close/lock)
- Trial balance report
- 100% test coverage on financial calculations
- All endpoints documented in Swagger
```

---

## PHASE 1B: Dynamic Table Builder — No-Code Engine (Week 3-6, parallel with 1A)

```
Goal: Build the metadata-driven dynamic table engine that allows users to create custom tables and fields via the API/UI. Support field types (String, Integer, Decimal, Date, Lookup/FK), JSONB storage with GIN indexes, and CRUD operations on dynamic data. Include a basic React UI for table definition.
Team: dynamic-builder | Size: 3 | Model: sonnet

Teammate 1: Metadata Engine Developer
- Responsibilities: Implement the core dynamic schema engine — MetadataRegistryService for creating/updating table definitions, DynamicDataService for CRUD operations on user-defined tables using JSONB, dynamic GIN index creation, field validation based on metadata, lookup/foreign-key resolution between dynamic tables
- File ownership: apps/api/src/modules/dynamic-builder/dynamic-builder.service.ts, apps/api/src/modules/dynamic-builder/services/, apps/api/src/modules/dynamic-builder/dto/, libs/database/src/entities/metadata-registry.entity.ts
- Deliverables:
  - MetadataRegistryService: createTable(definition), updateTable, deleteTable, getTableSchema, listTables
  - DynamicDataService: insertRecord(tableName, data), updateRecord, deleteRecord, queryRecords(tableName, filters, pagination, sorting)
  - Field type validation: String (min/max length), Integer, Decimal (precision), Date (format), Boolean, Lookup (validates FK exists)
  - Dynamic GIN index creation when new fields are added
  - Query builder that translates filter objects into PostgreSQL JSONB queries (e.g., data->>'field_name' = 'value')
  - Support for computed fields and default values
- Dependencies: None
- When done: message API & Controller Developer with service interfaces and supported field types

Teammate 2: API & Controller Developer
- Responsibilities: Build REST endpoints for table management and dynamic data CRUD. Full Swagger docs. Include bulk operations.
- File ownership: apps/api/src/modules/dynamic-builder/dynamic-builder.controller.ts, apps/api/src/modules/dynamic-builder/dynamic-builder.module.ts
- Deliverables:
  - Schema endpoints: POST /dynamic/tables (create definition), GET /dynamic/tables (list), GET /dynamic/tables/:name (get schema), PUT /dynamic/tables/:name, DELETE /dynamic/tables/:name
  - Data endpoints: POST /dynamic/tables/:name/records, GET /dynamic/tables/:name/records (with ?filter, ?sort, ?page, ?limit), GET /dynamic/tables/:name/records/:id, PUT /dynamic/tables/:name/records/:id, DELETE /dynamic/tables/:name/records/:id
  - Bulk: POST /dynamic/tables/:name/records/bulk (insert many), DELETE /dynamic/tables/:name/records/bulk
  - Import: POST /dynamic/tables/:name/import (CSV/JSON upload)
  - Full Swagger documentation with request/response examples
- Dependencies: Needs Metadata Engine Developer's services
- When done: message QA & Performance Tester with API docs

Teammate 3: QA & Performance Tester
- Responsibilities: Test dynamic engine correctness AND performance. JSONB queries can be slow without proper indexing — validate that GIN indexes are effective and queries perform well with 10K+ records.
- File ownership: tests/unit/dynamic-builder/, tests/integration/dynamic-builder/, tests/performance/
- Deliverables:
  - Unit tests: table creation with all field types, validation rules enforced, lookup resolution
  - Integration tests: full lifecycle (create table → add fields → insert records → query → update → delete)
  - Performance benchmarks: insert 10,000 records, query with filters (must be <100ms), test GIN index effectiveness
  - Edge cases: very long field names, special characters, null handling, empty JSONB, deeply nested lookups
  - Test that tenant isolation works — Tenant A cannot see Tenant B's dynamic tables or data
  - Coverage: 90%+ on services
- Dependencies: Needs API endpoints working
- When done: provide test report with performance benchmark results

Final deliverables:
- Dynamic table creation via API (define tables and fields at runtime)
- Full CRUD on dynamic data stored in JSONB
- Field validation for all supported types
- GIN indexing for query performance
- Lookup/FK relationships between dynamic tables
- Performance validated with 10K+ records
- Tenant isolation verified
```

---

## PHASE 2: Auth & Multi-Tenancy Hardening (Week 4-5)

```
Goal: Implement production-ready authentication (OAuth 2.0 + JWT), complete RBAC with field-level permissions, tenant onboarding flow, and verify RLS isolation with penetration-style tests.
Team: auth-tenancy | Size: 3 | Model: sonnet

Teammate 1: Auth Developer
- Responsibilities: Implement complete auth flow — registration, login (email+password), JWT issuance (access + refresh tokens), token refresh, logout (token blacklist via Redis), password hashing (bcrypt), MFA support (TOTP), OAuth 2.0 provider integration scaffold
- File ownership: apps/api/src/modules/auth/
- Deliverables:
  - Registration: create tenant + admin user in single transaction
  - Login: validate credentials, return JWT (access_token + refresh_token)
  - JWT payload: { sub: userId, tenantId, roles: [...], permissions: {...} }
  - Token refresh: validate refresh token, issue new pair, rotate refresh token
  - Logout: blacklist tokens in Redis with TTL matching token expiry
  - Password: bcrypt with 12 rounds, password strength validation
  - MFA: TOTP secret generation, QR code endpoint, verification
- Dependencies: None
- When done: message RBAC Developer with JWT payload structure

Teammate 2: RBAC & Tenant Developer
- Responsibilities: Implement granular RBAC — role CRUD, permission matrix (module × action × field), tenant management (onboard, suspend, activate, settings), enforce permissions in guards
- File ownership: apps/api/src/modules/tenants/, apps/api/src/common/guards/roles.guard.ts, libs/database/src/entities/role.entity.ts
- Deliverables:
  - Role CRUD with permission matrix: { finance: { create: true, read: true, post: true }, inventory: { read: true } }
  - Field-level restrictions: { cost_field: 'hidden', margin_field: 'readonly' }
  - Tenant onboarding: create tenant → create schema → seed defaults (COA, roles, periods)
  - Tenant settings: JSONB config (currency, date format, fiscal year start, timezone)
  - RolesGuard enhanced: check module + action + field permissions from JWT
  - Middleware: strip restricted fields from API responses based on user role
- Dependencies: Needs Auth Developer's JWT payload structure
- When done: message Security Tester with role definitions

Teammate 3: Security Tester
- Responsibilities: Verify tenant isolation is bulletproof, test auth edge cases, attempt cross-tenant data access
- File ownership: tests/unit/auth/, tests/integration/auth/, tests/security/
- Deliverables:
  - Auth tests: registration, login, token refresh, logout, expired token, invalid token
  - RBAC tests: admin can do everything, viewer is read-only, field restrictions enforced
  - CRITICAL — Tenant isolation tests: create 2 tenants, verify Tenant A CANNOT access Tenant B's data through any endpoint, even with SQL injection attempts
  - RLS verification: directly query DB with wrong tenant context, verify zero rows returned
  - Rate limiting test: brute force login protection
  - Test report with security findings
- Dependencies: Needs Auth and RBAC implementations
- When done: provide security audit report

Final deliverables:
- Complete auth flow (register, login, refresh, logout, MFA)
- Granular RBAC (module/action/field level)
- Tenant onboarding with default seeding
- Verified tenant isolation (RLS + middleware)
- Security test suite passing
```

---

## How to Run These Teams

### In Claude Code:
```bash
# Enable agent teams
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# Clone the repo
git clone https://github.com/friscapuff/aierp.git
cd aierp

# Start a team (copy-paste one of the prompts above)
claude

# Then paste the team prompt when Claude starts
```

### Recommended Execution Order:
1. **Run Phase 0 FIRST** (1-2 days) — get the build working
2. **Run Phase 1A + 1B in PARALLEL** (2-4 weeks) — financial engine + dynamic builder simultaneously
3. **Run Phase 2 after Phase 0** (1-2 weeks) — can overlap with Phase 1

### Monitor Progress:
- Use `Shift+Down` to cycle between teammates
- Check task list with `/tasks`
- Send messages between teammates with `SendMessage`

### Cost Estimate:
| Phase | Agents | Est. Sessions | Est. Cost |
|-------|--------|---------------|-----------|
| Phase 0 | 3 Sonnet | 8-10 | $120-150 |
| Phase 1A | 4 Sonnet | 15-20 | $225-300 |
| Phase 1B | 3 Sonnet | 10-15 | $150-225 |
| Phase 2 | 3 Sonnet | 8-12 | $120-180 |
| **Total** | | **41-57** | **$615-855** |
