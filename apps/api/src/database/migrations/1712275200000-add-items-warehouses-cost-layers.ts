import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddItemsWarehousesCostLayers1712275200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============ ITEMS TABLE ============
    await queryRunner.query(`
      CREATE TYPE "items_costing_method_enum" AS ENUM ('FIFO', 'WEIGHTED_AVG')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "items" (
        "id"               uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id"        uuid         NOT NULL,
        "code"             varchar(50)  NOT NULL,
        "name"             varchar(255) NOT NULL,
        "description"      text,
        "category"         varchar(100),
        "unit_of_measure"  varchar(20)  NOT NULL DEFAULT 'PC',
        "costing_method"   "items_costing_method_enum" NOT NULL DEFAULT 'FIFO',
        "is_active"        boolean      NOT NULL DEFAULT true,
        "min_stock_level"  numeric(12,4) NOT NULL DEFAULT 0,
        "max_stock_level"  numeric(12,4) NOT NULL DEFAULT 0,
        "created_at"       TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_items_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_items_tenant_code"
        ON "items" ("tenant_id", "code")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_items_tenant_active"
        ON "items" ("tenant_id", "is_active")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_items_category"
        ON "items" ("category")
    `);

    // ============ WAREHOUSES TABLE ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "warehouses" (
        "id"          uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id"   uuid         NOT NULL,
        "code"        varchar(50)  NOT NULL,
        "name"        varchar(255) NOT NULL,
        "address"     text,
        "is_active"   boolean      NOT NULL DEFAULT true,
        "is_default"  boolean      NOT NULL DEFAULT false,
        "created_at"  TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "fk_warehouses_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_warehouses_tenant_code"
        ON "warehouses" ("tenant_id", "code")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_warehouses_tenant_active"
        ON "warehouses" ("tenant_id", "is_active")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_warehouses_is_default"
        ON "warehouses" ("is_default")
    `);

    // ============ COST LAYERS TABLE ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cost_layers" (
        "id"                 uuid           PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id"          uuid           NOT NULL,
        "item_id"            uuid           NOT NULL,
        "warehouse_id"       uuid           NOT NULL,
        "remaining_quantity" numeric(12,4)  NOT NULL,
        "unit_cost"          numeric(18,4)  NOT NULL,
        "layer_date"         TIMESTAMP      NOT NULL,
        "reference_log_id"   uuid           NOT NULL,
        "created_at"         TIMESTAMP      NOT NULL DEFAULT now(),
        CONSTRAINT "fk_cost_layers_tenant_id" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_cost_layers_item_id" FOREIGN KEY ("item_id")
          REFERENCES "items" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_cost_layers_warehouse_id" FOREIGN KEY ("warehouse_id")
          REFERENCES "warehouses" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cost_layers_tenant_item_warehouse"
        ON "cost_layers" ("tenant_id", "item_id", "warehouse_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cost_layers_tenant_item_warehouse_date"
        ON "cost_layers" ("tenant_id", "item_id", "warehouse_id", "layer_date")
    `);

    // ============ ROW LEVEL SECURITY ============
    for (const table of ['items', 'warehouses', 'cost_layers']) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        CREATE POLICY "tenant_isolation_policy" ON "${table}"
          FOR ALL
          USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
          WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['cost_layers', 'warehouses', 'items']) {
      await queryRunner.query(
        `DROP POLICY IF EXISTS "tenant_isolation_policy" ON "${table}"`,
      );
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "cost_layers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "warehouses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "items"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "items_costing_method_enum"`);
  }
}
