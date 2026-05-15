import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSavedReports1712361600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============ ENUMS ============
    await queryRunner.query(`
      CREATE TYPE "saved_reports_report_type_enum" AS ENUM (
        'TRIAL_BALANCE',
        'INCOME_STATEMENT',
        'BALANCE_SHEET',
        'CASH_FLOW',
        'GL_DETAIL',
        'INVENTORY_VALUATION',
        'CUSTOM'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "saved_reports_output_format_enum" AS ENUM (
        'JSON',
        'EXCEL',
        'PDF'
      )
    `);

    // ============ SAVED REPORTS TABLE ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_reports" (
        "id"            uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id"     uuid         NOT NULL,
        "name"          varchar(255) NOT NULL,
        "description"   text,
        "report_type"   "saved_reports_report_type_enum" NOT NULL,
        "query_config"  jsonb        NOT NULL DEFAULT '{}',
        "output_format" "saved_reports_output_format_enum" NOT NULL DEFAULT 'JSON',
        "schedule"      jsonb,
        "created_by"    uuid         NOT NULL,
        "last_run_at"   TIMESTAMP,
        "created_at"    TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_saved_reports_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_saved_reports_tenant_type"
        ON "saved_reports" ("tenant_id", "report_type")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_saved_reports_tenant_created_by"
        ON "saved_reports" ("tenant_id", "created_by")
    `);

    // ============ ROW LEVEL SECURITY ============
    await queryRunner.query(`ALTER TABLE "saved_reports" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "saved_reports" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_policy" ON "saved_reports"
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP POLICY IF EXISTS "tenant_isolation_policy" ON "saved_reports"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_reports"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "saved_reports_output_format_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "saved_reports_report_type_enum"`);
  }
}
