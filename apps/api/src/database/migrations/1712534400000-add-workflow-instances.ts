import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowInstances1712534400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "workflow_instances_current_status_enum" AS ENUM (
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_instances" (
        "id"              uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id"       uuid         NOT NULL,
        "workflow_id"     uuid,
        "document_type"   varchar(100) NOT NULL,
        "document_id"     uuid         NOT NULL,
        "current_status"  "workflow_instances_current_status_enum" NOT NULL DEFAULT 'DRAFT',
        "current_level"   integer      NOT NULL DEFAULT 1,
        "initiated_by"    uuid         NOT NULL,
        "initiated_at"    TIMESTAMP    NOT NULL DEFAULT now(),
        "completed_at"    TIMESTAMP,
        "comments"        jsonb        NOT NULL DEFAULT '[]',
        "created_at"      TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_wfi_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_wfi_workflow_id" FOREIGN KEY ("workflow_id")
          REFERENCES "workflows" ("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_wfi_tenant_workflow"
        ON "workflow_instances" ("tenant_id", "workflow_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_wfi_tenant_doc_type_doc_id"
        ON "workflow_instances" ("tenant_id", "document_type", "document_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_wfi_tenant_status"
        ON "workflow_instances" ("tenant_id", "current_status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_wfi_tenant_initiated_by"
        ON "workflow_instances" ("tenant_id", "initiated_by")
    `);

    await queryRunner.query(`ALTER TABLE "workflow_instances" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "workflow_instances" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_policy" ON "workflow_instances"
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP POLICY IF EXISTS "tenant_isolation_policy" ON "workflow_instances"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_instances"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "workflow_instances_current_status_enum"`,
    );
  }
}
