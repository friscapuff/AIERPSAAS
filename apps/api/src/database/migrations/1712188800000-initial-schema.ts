import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712188800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable RLS extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ============ TENANTS TABLE ============
    await queryRunner.query(`
      CREATE TYPE "tenants_subscription_plan_enum" AS ENUM ('free', 'starter', 'professional', 'enterprise')
    `);
    await queryRunner.query(`
      CREATE TYPE "tenants_status_enum" AS ENUM ('active', 'suspended', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "subdomain" varchar(100) NOT NULL UNIQUE,
        "subscription_plan" "tenants_subscription_plan_enum" NOT NULL DEFAULT 'free',
        "status" "tenants_status_enum" NOT NULL DEFAULT 'active',
        "settings" jsonb,
        "max_users" integer NOT NULL DEFAULT 5,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // ============ ROLES TABLE ============
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" varchar(500),
        "permissions" jsonb NOT NULL,
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_roles_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_roles_tenant_id" ON "roles" ("tenant_id")`);

    // ============ USERS TABLE ============
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "first_name" varchar(100) NOT NULL,
        "last_name" varchar(100) NOT NULL,
        "role_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_login" TIMESTAMP,
        "mfa_enabled" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_users_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_users_role_id" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE SET NULL,
        CONSTRAINT "uq_users_tenant_email" UNIQUE ("tenant_id", "email")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_tenant_id" ON "users" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "idx_users_email" ON "users" ("email")`);

    // ============ FINANCIAL PERIODS TABLE ============
    await queryRunner.query(`
      CREATE TYPE "financial_periods_status_enum" AS ENUM ('Open', 'Closed', 'Locked')
    `);
    await queryRunner.query(`
      CREATE TABLE "financial_periods" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "fiscal_year" integer NOT NULL,
        "period_number" integer NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" "financial_periods_status_enum" NOT NULL DEFAULT 'Open',
        "closed_by" uuid,
        "closed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_financial_periods_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_financial_periods_tenant_year_period" ON "financial_periods" ("tenant_id", "fiscal_year", "period_number")
    `);

    // ============ CHART OF ACCOUNTS TABLE ============
    await queryRunner.query(`
      CREATE TYPE "chart_of_accounts_type_enum" AS ENUM ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')
    `);
    await queryRunner.query(`
      CREATE TABLE "chart_of_accounts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "code" varchar(20) NOT NULL,
        "name" varchar(255) NOT NULL,
        "account_type" "chart_of_accounts_type_enum" NOT NULL,
        "parent_id" uuid,
        "level" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_system" boolean NOT NULL DEFAULT false,
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_coa_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_coa_parent_id" FOREIGN KEY ("parent_id") REFERENCES "chart_of_accounts" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_coa_tenant_code" ON "chart_of_accounts" ("tenant_id", "code")`);
    await queryRunner.query(`CREATE INDEX "idx_coa_tenant_type" ON "chart_of_accounts" ("tenant_id", "account_type")`);
    await queryRunner.query(`CREATE INDEX "idx_coa_tenant_parent" ON "chart_of_accounts" ("tenant_id", "parent_id")`);

    // ============ GL TRANSACTIONS TABLE ============
    await queryRunner.query(`
      CREATE TABLE "gl_transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "journal_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        "debit" numeric(18, 4) NOT NULL DEFAULT 0,
        "credit" numeric(18, 4) NOT NULL DEFAULT 0,
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "exchange_rate" numeric(10, 6) NOT NULL DEFAULT 1,
        "posting_date" TIMESTAMP NOT NULL,
        "period_id" uuid,
        "source_doc_type" varchar(50) NOT NULL,
        "source_doc_id" uuid NOT NULL,
        "description" text,
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_gl_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_gl_account_id" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_gl_period_id" FOREIGN KEY ("period_id") REFERENCES "financial_periods" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_gl_tenant_account_date" ON "gl_transactions" ("tenant_id", "account_id", "posting_date")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_gl_tenant_journal" ON "gl_transactions" ("tenant_id", "journal_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_gl_tenant_date" ON "gl_transactions" ("tenant_id", "posting_date")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_gl_source_doc" ON "gl_transactions" ("source_doc_type", "source_doc_id")
    `);

    // ============ ACCOUNTING TEMPLATES TABLE ============
    await queryRunner.query(`
      CREATE TABLE "accounting_templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "trigger_doc_type" varchar(100) NOT NULL,
        "entries" jsonb NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_at_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_at_tenant_doc_type" ON "accounting_templates" ("tenant_id", "trigger_doc_type")
    `);

    // ============ METADATA REGISTRY TABLE ============
    await queryRunner.query(`
      CREATE TABLE "metadata_registry" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "table_name" varchar(255) NOT NULL,
        "display_name" varchar(255) NOT NULL,
        "description" text,
        "fields" jsonb NOT NULL,
        "indexes" jsonb,
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_mr_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_mr_tenant_table" ON "metadata_registry" ("tenant_id", "table_name")
    `);

    // ============ INVENTORY LOGS TABLE ============
    await queryRunner.query(`
      CREATE TYPE "inventory_logs_movement_type_enum" AS ENUM ('IN', 'OUT', 'ADJUST', 'TRANSFER')
    `);
    await queryRunner.query(`
      CREATE TYPE "inventory_logs_costing_method_enum" AS ENUM ('FIFO', 'WEIGHTED_AVG')
    `);
    await queryRunner.query(`
      CREATE TABLE "inventory_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "quantity" numeric(12, 4) NOT NULL,
        "unit_cost" numeric(18, 4) NOT NULL,
        "total_cost" numeric(18, 4) NOT NULL,
        "movement_type" "inventory_logs_movement_type_enum" NOT NULL,
        "costing_method" "inventory_logs_costing_method_enum" NOT NULL,
        "reference_doc_type" varchar(50) NOT NULL,
        "reference_doc_id" uuid NOT NULL,
        "posting_date" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_il_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_il_tenant_item" ON "inventory_logs" ("tenant_id", "item_id")`);
    await queryRunner.query(`CREATE INDEX "idx_il_tenant_warehouse" ON "inventory_logs" ("tenant_id", "warehouse_id")`);
    await queryRunner.query(`CREATE INDEX "idx_il_tenant_date" ON "inventory_logs" ("tenant_id", "posting_date")`);
    await queryRunner.query(`
      CREATE INDEX "idx_il_source_doc" ON "inventory_logs" ("reference_doc_type", "reference_doc_id")
    `);

    // ============ AUDIT LOGS TABLE ============
    await queryRunner.query(`
      CREATE TYPE "audit_logs_action_enum" AS ENUM ('INSERT', 'UPDATE', 'DELETE')
    `);
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "table_name" varchar(100) NOT NULL,
        "record_id" uuid NOT NULL,
        "action" "audit_logs_action_enum" NOT NULL,
        "user_id" uuid NOT NULL,
        "old_value" jsonb,
        "new_value" jsonb,
        "ip_address" varchar(45),
        "user_agent" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_al_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_al_tenant_table_record" ON "audit_logs" ("tenant_id", "table_name", "record_id")
    `);
    await queryRunner.query(`CREATE INDEX "idx_al_tenant_user" ON "audit_logs" ("tenant_id", "user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_al_created_at" ON "audit_logs" ("created_at")`);

    // ============ WORKFLOWS TABLE ============
    await queryRunner.query(`
      CREATE TABLE "workflows" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "trigger_doc_type" varchar(100) NOT NULL,
        "conditions" jsonb,
        "approval_levels" jsonb NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_wf_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_wf_tenant_doc_type" ON "workflows" ("tenant_id", "trigger_doc_type")
    `);

    // ============ WEBHOOKS TABLE ============
    await queryRunner.query(`
      CREATE TABLE "webhooks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "event_type" varchar(100) NOT NULL,
        "target_url" varchar(500) NOT NULL,
        "headers" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "retry_policy" jsonb,
        "last_triggered_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_wh_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_wh_tenant_event" ON "webhooks" ("tenant_id", "event_type")`);
    await queryRunner.query(`CREATE INDEX "idx_wh_tenant_active" ON "webhooks" ("tenant_id", "is_active")`);

    // ============ ROW LEVEL SECURITY (RLS) POLICIES ============
    // Enable RLS on all tenant-scoped tables
    const tablesToSecure = [
      'tenants',
      'users',
      'roles',
      'chart_of_accounts',
      'gl_transactions',
      'financial_periods',
      'accounting_templates',
      'metadata_registry',
      'inventory_logs',
      'audit_logs',
      'workflows',
      'webhooks',
    ];

    await queryRunner.query(`ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY`);

    for (const table of tablesToSecure) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);

      // Create tenant isolation policy
      await queryRunner.query(`
        CREATE POLICY "tenant_isolation_policy" ON "${table}"
          FOR ALL
          USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
          WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid)
      `);
    }

    // Special policy for tenants table - allow reading own tenant
    await queryRunner.query(`
      CREATE POLICY "tenants_isolation_policy" ON "tenants"
        FOR ALL
        USING (id = current_setting('app.current_tenant_id')::uuid)
        WITH CHECK (id = current_setting('app.current_tenant_id')::uuid)
    `);

    // Audit logs should be append-only (no update/delete for regular users)
    await queryRunner.query(`
      CREATE POLICY "audit_logs_append_only" ON "audit_logs"
        FOR DELETE
        USING (false)
    `);

    // ============ SEED DEFAULT ROLES ============
    // Insert default roles for each tenant (to be called during tenant creation)
    // This is a placeholder - actual seeding happens at tenant creation time
    await queryRunner.query(`
      COMMENT ON TABLE roles IS 'System and custom roles with RBAC permissions'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop policies
    const tablesToSecure = [
      'tenants',
      'users',
      'roles',
      'chart_of_accounts',
      'gl_transactions',
      'financial_periods',
      'accounting_templates',
      'metadata_registry',
      'inventory_logs',
      'audit_logs',
      'workflows',
      'webhooks',
    ];

    for (const table of tablesToSecure) {
      await queryRunner.query(
        `DROP POLICY IF EXISTS "tenant_isolation_policy" ON "${table}"`,
      );
    }

    await queryRunner.query(
      `DROP POLICY IF EXISTS "tenants_isolation_policy" ON "tenants"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "audit_logs_append_only" ON "audit_logs"`,
    );

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "webhooks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflows"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "metadata_registry"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "accounting_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "gl_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chart_of_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "financial_periods"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "tenants_subscription_plan_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tenants_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "financial_periods_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "chart_of_accounts_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "inventory_logs_movement_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "inventory_logs_costing_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_logs_action_enum"`);
  }
}
