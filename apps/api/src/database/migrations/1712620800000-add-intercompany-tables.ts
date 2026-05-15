import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIntercompanyTables1712620800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "intercompany_transactions_status_enum" AS ENUM (
        'DRAFT',
        'POSTED',
        'SETTLED',
        'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "intercompany_agreements" (
        "id"                   uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "parent_tenant_id"     uuid         NOT NULL,
        "child_tenant_ids"     uuid[]       NOT NULL DEFAULT '{}',
        "due_from_account_id"  uuid         NOT NULL,
        "due_to_account_id"    uuid         NOT NULL,
        "settlement_currency"  varchar(3)   NOT NULL DEFAULT 'USD',
        "auto_post"            boolean      NOT NULL DEFAULT true,
        "is_active"            boolean      NOT NULL DEFAULT true,
        "created_by"           uuid         NOT NULL,
        "created_at"           TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_ica_parent_tenant_id" FOREIGN KEY ("parent_tenant_id")
          REFERENCES "tenants" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_ica_due_from_account_id" FOREIGN KEY ("due_from_account_id")
          REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_ica_due_to_account_id" FOREIGN KEY ("due_to_account_id")
          REFERENCES "chart_of_accounts" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ica_parent_tenant_active"
        ON "intercompany_agreements" ("parent_tenant_id", "is_active")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "intercompany_transactions" (
        "id"                uuid           PRIMARY KEY DEFAULT uuid_generate_v4(),
        "source_tenant_id"  uuid           NOT NULL,
        "target_tenant_id"  uuid           NOT NULL,
        "agreement_id"      uuid           NOT NULL,
        "amount"            numeric(18,4)  NOT NULL,
        "currency"          varchar(3)     NOT NULL,
        "exchange_rate"     numeric(18,6)  NOT NULL DEFAULT 1,
        "description"       text,
        "source_doc_type"   varchar(50),
        "source_doc_id"     uuid,
        "source_journal_id" uuid,
        "target_journal_id" uuid,
        "status"            "intercompany_transactions_status_enum" NOT NULL DEFAULT 'DRAFT',
        "settlement_date"   date,
        "settlement_notes"  text,
        "created_by"        uuid           NOT NULL,
        "created_at"        TIMESTAMP      NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP      NOT NULL DEFAULT now(),
        CONSTRAINT "fk_ict_source_tenant_id" FOREIGN KEY ("source_tenant_id")
          REFERENCES "tenants" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_ict_target_tenant_id" FOREIGN KEY ("target_tenant_id")
          REFERENCES "tenants" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_ict_agreement_id" FOREIGN KEY ("agreement_id")
          REFERENCES "intercompany_agreements" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ict_source_target_status"
        ON "intercompany_transactions" ("source_tenant_id", "target_tenant_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ict_source_tenant_created"
        ON "intercompany_transactions" ("source_tenant_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ict_target_tenant_created"
        ON "intercompany_transactions" ("target_tenant_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ict_agreement_status"
        ON "intercompany_transactions" ("agreement_id", "status")
    `);

    await queryRunner.query(`ALTER TABLE "intercompany_agreements" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "intercompany_agreements" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_policy" ON "intercompany_agreements"
        FOR ALL
        USING (parent_tenant_id = current_setting('app.current_tenant_id')::uuid)
        WITH CHECK (parent_tenant_id = current_setting('app.current_tenant_id')::uuid)
    `);

    await queryRunner.query(`ALTER TABLE "intercompany_transactions" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "intercompany_transactions" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_policy" ON "intercompany_transactions"
        FOR ALL
        USING (
          source_tenant_id = current_setting('app.current_tenant_id')::uuid
          OR target_tenant_id = current_setting('app.current_tenant_id')::uuid
        )
        WITH CHECK (
          source_tenant_id = current_setting('app.current_tenant_id')::uuid
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP POLICY IF EXISTS "tenant_isolation_policy" ON "intercompany_transactions"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS "tenant_isolation_policy" ON "intercompany_agreements"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "intercompany_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "intercompany_agreements"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "intercompany_transactions_status_enum"`,
    );
  }
}
