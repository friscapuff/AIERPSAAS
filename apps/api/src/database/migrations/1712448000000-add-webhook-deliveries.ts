import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhookDeliveries1712448000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "webhooks"
        ADD COLUMN IF NOT EXISTS "secret" varchar(255)
    `);

    await queryRunner.query(`
      CREATE TYPE "webhook_deliveries_status_enum" AS ENUM (
        'PENDING',
        'SUCCESS',
        'FAILED',
        'RETRYING'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
        "id"                   uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id"            uuid         NOT NULL,
        "webhook_id"           uuid         NOT NULL,
        "event_type"           varchar(100) NOT NULL,
        "payload"              jsonb        NOT NULL,
        "status"               "webhook_deliveries_status_enum" NOT NULL DEFAULT 'PENDING',
        "response_status_code" integer,
        "response_body"        text,
        "attempt_number"       integer      NOT NULL DEFAULT 0,
        "next_retry_at"        TIMESTAMP,
        "error_message"        text,
        "duration_ms"          integer,
        "created_at"           TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_webhook_deliveries_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_webhook_deliveries_webhook_id" FOREIGN KEY ("webhook_id")
          REFERENCES "webhooks" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_tenant_webhook_created"
        ON "webhook_deliveries" ("tenant_id", "webhook_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_tenant_status"
        ON "webhook_deliveries" ("tenant_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_next_retry_status"
        ON "webhook_deliveries" ("next_retry_at", "status")
    `);

    await queryRunner.query(`ALTER TABLE "webhook_deliveries" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "webhook_deliveries" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_policy" ON "webhook_deliveries"
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP POLICY IF EXISTS "tenant_isolation_policy" ON "webhook_deliveries"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_deliveries"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "webhook_deliveries_status_enum"`);
    await queryRunner.query(`
      ALTER TABLE "webhooks" DROP COLUMN IF EXISTS "secret"
    `);
  }
}
