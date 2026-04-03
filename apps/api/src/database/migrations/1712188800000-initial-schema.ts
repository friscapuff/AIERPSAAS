import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712188800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create uuid extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create tenants table
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "slug" varchar(255) UNIQUE NOT NULL,
        "description" text,
        "logo_url" varchar(255),
        "status" varchar(50) DEFAULT 'active',
        "subscription_tier" varchar(50) DEFAULT 'free',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255),
        "first_name" varchar(100),
        "last_name" varchar(100),
        "status" varchar(50) DEFAULT 'active',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("tenant_id", "email")
      )
    `);

    // Create roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
        "role_name" varchar(100) NOT NULL,
        "permissions" jsonb,
        "is_system_role" boolean DEFAULT false,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("tenant_id", "role_name")
      )
    `);

    // Create chart_of_accounts table
    await queryRunner.query(`
      CREATE TABLE "chart_of_accounts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
        "account_number" varchar(50) NOT NULL,
        "account_name" varchar(255) NOT NULL,
        "account_type" varchar(50),
        "normal_balance" varchar(50),
        "is_active" boolean DEFAULT true,
        "parent_account_id" uuid,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("tenant_id", "account_number")
      )
    `);

    // Create gl_transactions table
    await queryRunner.query(`
      CREATE TABLE "gl_transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
        "transaction_date" DATE NOT NULL,
        "description" text,
        "debit_amount" numeric(15,2),
        "credit_amount" numeric(15,2),
        "account_id" uuid REFERENCES "chart_of_accounts"("id"),
        "reference_number" varchar(100),
        "created_by" uuid REFERENCES "users"("id"),
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create financial_periods table
    await queryRunner.query(`
      CREATE TABLE "financial_periods" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
        "period_name" varchar(100) NOT NULL,
        "start_date" DATE NOT NULL,
        "end_date" DATE NOT NULL,
        "status" varchar(50) DEFAULT 'open',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("tenant_id", "start_date", "end_date")
      )
    `);

    // Create accounting_templates table
    await queryRunner.query(`
      CREATE TABLE "accounting_templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
        "template_name" varchar(255) NOT NULL,
        "template_type" varchar(100),
        "definition" jsonb,
        "is_active" boolean DEFAULT true,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create inventory_logs table
    await queryRunner.query(`
      CREATE TABLE "inventory_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
        "product_id" uuid,
        "warehouse_id" uuid,
        "quantity" integer,
        "movement_type" varchar(50),
        "reference_id" varchar(100),
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
        "user_id" uuid REFERENCES "users"("id"),
        "entity_type" varchar(100),
        "entity_id" varchar(100),
        "action" varchar(50),
        "old_values" jsonb,
        "new_values" jsonb,
        "ip_address" varchar(45),
        "user_agent" text,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create workflows table
    await queryRunner.query(`
      CREATE TABLE "workflows" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
        "workflow_name" varchar(255) NOT NULL,
        "description" text,
        "definition" jsonb,
        "is_active" boolean DEFAULT true,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create webhooks table
    await queryRunner.query(`
      CREATE TABLE "webhooks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
        "event_type" varchar(100) NOT NULL,
        "url" varchar(2048) NOT NULL,
        "headers" jsonb,
        "is_active" boolean DEFAULT true,
        "retry_count" integer DEFAULT 3,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create metadata_registry table
    await queryRunner.query(`
      CREATE TABLE "metadata_registry" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
        "entity_type" varchar(100),
        "metadata" jsonb,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX idx_tenants_slug ON "tenants"("slug")`);
    await queryRunner.query(`CREATE INDEX idx_users_tenant_id ON "users"("tenant_id")`);
    await queryRunner.query(`CREATE INDEX idx_users_email ON "users"("tenant_id", "email")`);
    await queryRunner.query(`CREATE INDEX idx_gl_transactions_account ON "gl_transactions"("account_id")`);
    await queryRunner.query(`CREATE INDEX idx_gl_transactions_date ON "gl_transactions"("transaction_date")`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_tenant_date ON "audit_logs"("tenant_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_user ON "audit_logs"("user_id")`);
    await queryRunner.query(`CREATE INDEX idx_inventory_logs_tenant ON "inventory_logs"("tenant_id")`);
    await queryRunner.query(`CREATE INDEX idx_inventory_logs_date ON "inventory_logs"("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "metadata_registry"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "webhooks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflows"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "accounting_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "financial_periods"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "gl_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chart_of_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
  }
}
