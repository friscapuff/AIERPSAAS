import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SeedDefaultData1712793600000
 *
 * Seeds template data that will be cloned into every new tenant at onboarding
 * time. The rows are NOT inserted directly into production tenant data - they
 * are stored under a sentinel "template" tenant ID (all-zeros UUID) and copied
 * to real tenants by the TenantProvisioning service during signup.
 *
 * Convention: TEMPLATE_TENANT_ID = '00000000-0000-0000-0000-000000000000'
 */
export class SeedDefaultData1712793600000 implements MigrationInterface {
  // Sentinel tenant used exclusively as a template source.
  // Never used in runtime queries - RLS will block it for real sessions.
  private readonly TEMPLATE_TENANT_ID = '00000000-0000-0000-0000-000000000000';
  private readonly SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ------------------------------------------------------------------ //
    //  Temporarily bypass RLS for the seeding session so we can write
    //  template rows without a real tenant context.
    // ------------------------------------------------------------------ //
    await queryRunner.query(`SET LOCAL app.current_tenant_id = '00000000-0000-0000-0000-000000000000'`);
    await queryRunner.query(`SET LOCAL row_security = OFF`);

    // ================================================================== //
    //  1. INSERT TEMPLATE TENANT (sentinel row)
    // ================================================================== //
    await queryRunner.query(`
      INSERT INTO "tenants" ("id", "name", "subdomain", "subscription_plan", "status")
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        '__SYSTEM_TEMPLATE__',
        '__template__',
        'enterprise',
        'active'
      )
      ON CONFLICT ("id") DO NOTHING
    `);

    // ================================================================== //
    //  2. DEFAULT SYSTEM ROLES
    // ================================================================== //

    // ---------- Admin: all permissions on all modules ----------
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "tenant_id", "name", "description", "permissions", "is_system")
      VALUES (
        '00000000-0000-0000-0000-000000000010',
        '${this.TEMPLATE_TENANT_ID}',
        'Admin',
        'Full system access - all modules, all operations',
        '{
          "users":                  {"create":true,"read":true,"update":true,"delete":true},
          "roles":                  {"create":true,"read":true,"update":true,"delete":true},
          "chart_of_accounts":      {"create":true,"read":true,"update":true,"delete":true},
          "gl_transactions":        {"create":true,"read":true,"update":true,"delete":true,"post":true,"void":true},
          "financial_periods":      {"create":true,"read":true,"update":true,"delete":true},
          "inventory":              {"create":true,"read":true,"update":true,"delete":true},
          "items":                  {"create":true,"read":true,"update":true,"delete":true},
          "warehouses":             {"create":true,"read":true,"update":true,"delete":true},
          "workflows":              {"create":true,"read":true,"update":true,"delete":true},
          "webhooks":               {"create":true,"read":true,"update":true,"delete":true},
          "saved_reports":          {"create":true,"read":true,"update":true,"delete":true},
          "intercompany":           {"create":true,"read":true,"update":true,"delete":true,"post":true},
          "dynamic_data":           {"create":true,"read":true,"update":true,"delete":true},
          "metadata_registry":      {"create":true,"read":true,"update":true,"delete":true},
          "audit_logs":             {"read":true}
        }',
        true
      )
      ON CONFLICT ("id") DO NOTHING
    `);

    // ---------- Manager: read + create + update (no delete, no post) ----------
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "tenant_id", "name", "description", "permissions", "is_system")
      VALUES (
        '00000000-0000-0000-0000-000000000011',
        '${this.TEMPLATE_TENANT_ID}',
        'Manager',
        'Operational manager - can create and update records but cannot delete or configure the system',
        '{
          "users":                  {"read":true},
          "roles":                  {"read":true},
          "chart_of_accounts":      {"create":true,"read":true,"update":true},
          "gl_transactions":        {"create":true,"read":true,"update":true,"post":true},
          "financial_periods":      {"read":true},
          "inventory":              {"create":true,"read":true,"update":true},
          "items":                  {"create":true,"read":true,"update":true},
          "warehouses":             {"create":true,"read":true,"update":true},
          "workflows":              {"create":true,"read":true,"update":true},
          "webhooks":               {"read":true},
          "saved_reports":          {"create":true,"read":true,"update":true},
          "intercompany":           {"create":true,"read":true,"update":true},
          "dynamic_data":           {"create":true,"read":true,"update":true},
          "metadata_registry":      {"read":true},
          "audit_logs":             {"read":true}
        }',
        true
      )
      ON CONFLICT ("id") DO NOTHING
    `);

    // ---------- Accountant: finance full access + read-only on other modules ----------
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "tenant_id", "name", "description", "permissions", "is_system")
      VALUES (
        '00000000-0000-0000-0000-000000000012',
        '${this.TEMPLATE_TENANT_ID}',
        'Accountant',
        'Finance professional - full access to accounting modules, read-only elsewhere',
        '{
          "users":                  {"read":true},
          "roles":                  {"read":true},
          "chart_of_accounts":      {"create":true,"read":true,"update":true,"delete":true},
          "gl_transactions":        {"create":true,"read":true,"update":true,"post":true,"void":true},
          "financial_periods":      {"create":true,"read":true,"update":true},
          "inventory":              {"read":true},
          "items":                  {"read":true},
          "warehouses":             {"read":true},
          "workflows":              {"read":true},
          "webhooks":               {"read":true},
          "saved_reports":          {"create":true,"read":true,"update":true,"delete":true},
          "intercompany":           {"create":true,"read":true,"update":true,"post":true},
          "dynamic_data":           {"read":true},
          "metadata_registry":      {"read":true},
          "audit_logs":             {"read":true}
        }',
        true
      )
      ON CONFLICT ("id") DO NOTHING
    `);

    // ---------- Viewer: read-only across all modules ----------
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "tenant_id", "name", "description", "permissions", "is_system")
      VALUES (
        '00000000-0000-0000-0000-000000000013',
        '${this.TEMPLATE_TENANT_ID}',
        'Viewer',
        'Read-only access - can view all records but cannot create, update, or delete',
        '{
          "users":                  {"read":true},
          "roles":                  {"read":true},
          "chart_of_accounts":      {"read":true},
          "gl_transactions":        {"read":true},
          "financial_periods":      {"read":true},
          "inventory":              {"read":true},
          "items":                  {"read":true},
          "warehouses":             {"read":true},
          "workflows":              {"read":true},
          "webhooks":               {"read":true},
          "saved_reports":          {"read":true},
          "intercompany":           {"read":true},
          "dynamic_data":           {"read":true},
          "metadata_registry":      {"read":true},
          "audit_logs":             {"read":true}
        }',
        true
      )
      ON CONFLICT ("id") DO NOTHING
    `);

    // ================================================================== //
    //  3. DEFAULT CHART OF ACCOUNTS (IFRS-compliant template)
    // ================================================================== //

    const coa: Array<{
      id: string;
      code: string;
      name: string;
      account_type: string;
      parent_id: string | null;
      level: number;
      is_system: boolean;
    }> = [
      { id: '00000000-0000-0000-0001-000000001000', code: '1000', name: 'Cash and Cash Equivalents', account_type: 'Asset', parent_id: null, level: 0, is_system: true },
      { id: '00000000-0000-0000-0001-000000001100', code: '1100', name: 'Accounts Receivable', account_type: 'Asset', parent_id: null, level: 0, is_system: true },
      { id: '00000000-0000-0000-0001-000000001200', code: '1200', name: 'Inventory', account_type: 'Asset', parent_id: null, level: 0, is_system: true },
      { id: '00000000-0000-0000-0001-000000001300', code: '1300', name: 'Prepaid Expenses', account_type: 'Asset', parent_id: null, level: 0, is_system: false },
      { id: '00000000-0000-0000-0001-000000001500', code: '1500', name: 'Property, Plant and Equipment', account_type: 'Asset', parent_id: null, level: 0, is_system: false },
      { id: '00000000-0000-0000-0001-000000001600', code: '1600', name: 'Accumulated Depreciation', account_type: 'Asset', parent_id: null, level: 0, is_system: false },
      { id: '00000000-0000-0000-0001-000000001800', code: '1800', name: 'Due From Intercompany', account_type: 'Asset', parent_id: null, level: 0, is_system: true },
      { id: '00000000-0000-0000-0001-000000002000', code: '2000', name: 'Accounts Payable', account_type: 'Liability', parent_id: null, level: 0, is_system: true },
      { id: '00000000-0000-0000-0001-000000002100', code: '2100', name: 'Accrued Liabilities', account_type: 'Liability', parent_id: null, level: 0, is_system: false },
      { id: '00000000-0000-0000-0001-000000002200', code: '2200', name: 'Due To Intercompany', account_type: 'Liability', parent_id: null, level: 0, is_system: true },
      { id: '00000000-0000-0000-0001-000000002500', code: '2500', name: 'Long-Term Debt', account_type: 'Liability', parent_id: null, level: 0, is_system: false },
      { id: '00000000-0000-0000-0001-000000003000', code: '3000', name: 'Share Capital', account_type: 'Equity', parent_id: null, level: 0, is_system: true },
      { id: '00000000-0000-0000-0001-000000003100', code: '3100', name: 'Retained Earnings', account_type: 'Equity', parent_id: null, level: 0, is_system: true },
      { id: '00000000-0000-0000-0001-000000004000', code: '4000', name: 'Sales Revenue', account_type: 'Revenue', parent_id: null, level: 0, is_system: false },
      { id: '00000000-0000-0000-0001-000000004100', code: '4100', name: 'Service Revenue', account_type: 'Revenue', parent_id: null, level: 0, is_system: false },
      { id: '00000000-0000-0000-0001-000000004200', code: '4200', name: 'Other Income', account_type: 'Revenue', parent_id: null, level: 0, is_system: false },
      { id: '00000000-0000-0000-0001-000000005000', code: '5000', name: 'Cost of Goods Sold', account_type: 'Expense', parent_id: null, level: 0, is_system: true },
      { id: '00000000-0000-0000-0001-000000005100', code: '5100', name: 'Salaries and Wages', account_type: 'Expense', parent_id: null, level: 0, is_system: false },
      { id: '00000000-0000-0000-0001-000000005200', code: '5200', name: 'Rent Expense', account_type: 'Expense', parent_id: null, level: 0, is_system: false },
      { id: '00000000-0000-0000-0001-000000005300', code: '5300', name: 'Utilities Expense', account_type: 'Expense', parent_id: null, level: 0, is_system: false },
      { id: '00000000-0000-0000-0001-000000005400', code: '5400', name: 'Depreciation Expense', account_type: 'Expense', parent_id: null, level: 0, is_system: false },
      { id: '00000000-0000-0000-0001-000000005500', code: '5500', name: 'Other Operating Expenses', account_type: 'Expense', parent_id: null, level: 0, is_system: false },
    ];

    for (const account of coa) {
      await queryRunner.query(
        `
        INSERT INTO "chart_of_accounts" (
          "id", "tenant_id", "code", "name", "account_type",
          "parent_id", "level", "is_active", "is_system", "currency"
        ) VALUES (
          $1, $2, $3, $4, $5::chart_of_accounts_type_enum,
          $6, $7, true, $8, 'USD'
        )
        ON CONFLICT ("id") DO NOTHING
        `,
        [
          account.id,
          this.TEMPLATE_TENANT_ID,
          account.code,
          account.name,
          account.account_type,
          account.parent_id,
          account.level,
          account.is_system,
        ],
      );
    }

    // ================================================================== //
    //  4. COMMENT - document intent for future engineers
    // ================================================================== //
    await queryRunner.query(`
      COMMENT ON TABLE "roles" IS
        'System and custom roles with RBAC permissions. Rows with tenant_id = 00000000-0000-0000-0000-000000000000 are templates cloned during tenant onboarding.'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE "chart_of_accounts" IS
        'Chart of accounts. Rows with tenant_id = 00000000-0000-0000-0000-000000000000 are the IFRS template cloned during tenant onboarding.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET LOCAL row_security = OFF`);

    await queryRunner.query(`
      DELETE FROM "chart_of_accounts"
      WHERE "tenant_id" = '00000000-0000-0000-0000-000000000000'
    `);

    await queryRunner.query(`
      DELETE FROM "roles"
      WHERE "tenant_id" = '00000000-0000-0000-0000-000000000000'
    `);

    await queryRunner.query(`
      DELETE FROM "tenants"
      WHERE "id" = '00000000-0000-0000-0000-000000000000'
    `);
  }
}
