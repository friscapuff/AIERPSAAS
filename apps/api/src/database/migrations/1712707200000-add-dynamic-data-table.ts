import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDynamicDataTable1712707200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dynamic_data" (
        "id"          uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id"   uuid         NOT NULL,
        "table_name"  varchar(255) NOT NULL,
        "data"        jsonb        NOT NULL,
        "created_by"  uuid         NOT NULL,
        "updated_by"  uuid,
        "created_at"  TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_dynamic_data_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dynamic_data_tenant_table"
        ON "dynamic_data" ("tenant_id", "table_name")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dynamic_data_tenant_table_id"
        ON "dynamic_data" ("tenant_id", "table_name", "id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dynamic_data_gin"
        ON "dynamic_data" USING gin ("data")
    `);

    await queryRunner.query(`ALTER TABLE "dynamic_data" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "dynamic_data" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_policy" ON "dynamic_data"
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP POLICY IF EXISTS "tenant_isolation_policy" ON "dynamic_data"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "dynamic_data"`);
  }
}
