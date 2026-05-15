/**
 * AiERP Database Seed Script
 * Run with: npx ts-node apps/api/src/database/seeds/seed.ts
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'aierp',
  synchronize: false,
});

async function seed() {
  console.log('Starting AiERP database seed...\n');

  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Create Default Tenant
    console.log('1/4  Creating default tenant...');
    const tenantResult = await queryRunner.query(`
      INSERT INTO tenants (id, name, slug, subdomain, subscription_plan, status, is_active, settings)
      VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'BSTC Group',
        'bstc',
        'bstc',
        'FREE',
        'trial',
        true,
        '{"currency": "JOD", "timezone": "Asia/Amman", "fiscal_year_start": 1}'::jsonb
      )
      ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const tenantId = tenantResult[0].id;
    console.log('   Done - Tenant: ' + tenantId);

    // 2. Create Admin Role
    console.log('2/4  Creating admin role...');
    const roleResult = await queryRunner.query(`
      INSERT INTO roles (id, tenant_id, name, description, is_active, permissions, field_restrictions)
      VALUES (
        'b0000000-0000-0000-0000-000000000001',
        '${tenantId}',
        'Super Admin',
        'Full access to all modules and operations',
        true,
        '{
          "finance": {"create": true, "read": true, "update": true, "delete": true, "post": true, "void": true},
          "inventory": {"create": true, "read": true, "update": true, "delete": true, "post": true, "void": true},
          "tenants": {"create": true, "read": true, "update": true, "delete": true},
          "users": {"create": true, "read": true, "update": true, "delete": true},
          "audit": {"read": true},
          "reporting": {"create": true, "read": true},
          "webhooks": {"create": true, "read": true, "update": true, "delete": true},
          "workflow": {"create": true, "read": true, "update": true, "delete": true},
          "dynamic_builder": {"create": true, "read": true, "update": true, "delete": true}
        }'::jsonb,
        '[]'::jsonb
      )
      ON CONFLICT (tenant_id, name) DO NOTHING
      RETURNING id;
    `);
    const roleId = roleResult[0]?.id || 'b0000000-0000-0000-0000-000000000001';
    console.log('   Done - Role: ' + roleId);

    // 3. Create Admin User
    console.log('3/4  Creating admin user...');
    const passwordHash = await bcrypt.hash('Admin123!', 12);
    await queryRunner.query(`
      INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role_id, is_active)
      VALUES (
        'c0000000-0000-0000-0000-000000000001',
        '${tenantId}',
        'admin@aierp.local',
        '${passwordHash}',
        'Abu',
        'Wathiq',
        '${roleId}',
        true
      )
      ON CONFLICT (tenant_id, email) DO NOTHING;
    `);
    console.log('   Done - User: admin@aierp.local / Admin123!');

    // 4. Create Chart of Accounts (IFRS-based)
    console.log('4/4  Creating chart of accounts...');
    const accounts = [
      { code: '1000', name: 'Assets', type: 'ASSET', level: 0, parent: null },
      { code: '1100', name: 'Current Assets', type: 'ASSET', level: 1, parent: '1000' },
      { code: '1110', name: 'Cash and Cash Equivalents', type: 'ASSET', level: 2, parent: '1100' },
      { code: '1111', name: 'Petty Cash', type: 'ASSET', level: 3, parent: '1110' },
      { code: '1112', name: 'Bank - JOD', type: 'ASSET', level: 3, parent: '1110' },
      { code: '1113', name: 'Bank - USD', type: 'ASSET', level: 3, parent: '1110' },
      { code: '1120', name: 'Accounts Receivable', type: 'ASSET', level: 2, parent: '1100' },
      { code: '1130', name: 'Inventory', type: 'ASSET', level: 2, parent: '1100' },
      { code: '1140', name: 'Prepaid Expenses', type: 'ASSET', level: 2, parent: '1100' },
      { code: '1200', name: 'Non-Current Assets', type: 'ASSET', level: 1, parent: '1000' },
      { code: '1210', name: 'Property Plant and Equipment', type: 'ASSET', level: 2, parent: '1200' },
      { code: '1220', name: 'Accumulated Depreciation', type: 'CONTRA_ASSET', level: 2, parent: '1200' },
      { code: '1230', name: 'Intangible Assets', type: 'ASSET', level: 2, parent: '1200' },
      { code: '2000', name: 'Liabilities', type: 'LIABILITY', level: 0, parent: null },
      { code: '2100', name: 'Current Liabilities', type: 'LIABILITY', level: 1, parent: '2000' },
      { code: '2110', name: 'Accounts Payable', type: 'LIABILITY', level: 2, parent: '2100' },
      { code: '2120', name: 'Accrued Expenses', type: 'LIABILITY', level: 2, parent: '2100' },
      { code: '2130', name: 'VAT Payable', type: 'LIABILITY', level: 2, parent: '2100' },
      { code: '2140', name: 'Short-term Loans', type: 'LIABILITY', level: 2, parent: '2100' },
      { code: '2200', name: 'Non-Current Liabilities', type: 'LIABILITY', level: 1, parent: '2000' },
      { code: '2210', name: 'Long-term Loans', type: 'LIABILITY', level: 2, parent: '2200' },
      { code: '2220', name: 'End of Service Benefits', type: 'LIABILITY', level: 2, parent: '2200' },
      { code: '3000', name: 'Equity', type: 'EQUITY', level: 0, parent: null },
      { code: '3100', name: 'Share Capital', type: 'EQUITY', level: 1, parent: '3000' },
      { code: '3200', name: 'Retained Earnings', type: 'EQUITY', level: 1, parent: '3000' },
      { code: '3300', name: 'Reserves', type: 'EQUITY', level: 1, parent: '3000' },
      { code: '4000', name: 'Revenue', type: 'REVENUE', level: 0, parent: null },
      { code: '4100', name: 'Sales Revenue', type: 'REVENUE', level: 1, parent: '4000' },
      { code: '4200', name: 'Service Revenue', type: 'REVENUE', level: 1, parent: '4000' },
      { code: '4300', name: 'Other Income', type: 'REVENUE', level: 1, parent: '4000' },
      { code: '5000', name: 'Expenses', type: 'EXPENSE', level: 0, parent: null },
      { code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE', level: 1, parent: '5000' },
      { code: '5200', name: 'Salaries and Wages', type: 'EXPENSE', level: 1, parent: '5000' },
      { code: '5300', name: 'Rent Expense', type: 'EXPENSE', level: 1, parent: '5000' },
      { code: '5400', name: 'Utilities Expense', type: 'EXPENSE', level: 1, parent: '5000' },
      { code: '5500', name: 'Depreciation Expense', type: 'EXPENSE', level: 1, parent: '5000' },
      { code: '5600', name: 'Marketing and Advertising', type: 'EXPENSE', level: 1, parent: '5000' },
      { code: '5700', name: 'Office Supplies', type: 'EXPENSE', level: 1, parent: '5000' },
      { code: '5800', name: 'Professional Fees', type: 'EXPENSE', level: 1, parent: '5000' },
      { code: '5900', name: 'Miscellaneous Expenses', type: 'EXPENSE', level: 1, parent: '5000' },
      { code: '6000', name: 'Intercompany', type: 'ASSET', level: 0, parent: null },
      { code: '6100', name: 'Due From Related Parties', type: 'ASSET', level: 1, parent: '6000' },
      { code: '6200', name: 'Due To Related Parties', type: 'LIABILITY', level: 1, parent: '6000' },
    ];

    const codeToId: Record<string, string> = {};
    for (const acct of accounts) {
      const result = await queryRunner.query(`
        INSERT INTO chart_of_accounts (tenant_id, code, name, account_type, level, is_active)
        VALUES ('${tenantId}', '${acct.code}', '${acct.name}', '${acct.type}', ${acct.level}, true)
        ON CONFLICT (tenant_id, code) DO NOTHING
        RETURNING id;
      `);
      if (result[0]) {
        codeToId[acct.code] = result[0].id;
      }
    }

    for (const acct of accounts) {
      if (acct.parent && codeToId[acct.code] && codeToId[acct.parent]) {
        await queryRunner.query(`
          UPDATE chart_of_accounts SET parent_id = '${codeToId[acct.parent]}'
          WHERE id = '${codeToId[acct.code]}';
        `);
      }
    }
    console.log('   Done - ' + Object.keys(codeToId).length + ' accounts created');

    await queryRunner.commitTransaction();
    console.log('\nSeed completed successfully!\n');
    console.log('  Login credentials:');
    console.log('  Email:    admin@aierp.local');
    console.log('  Password: Admin123!');
    console.log('  Tenant:   bstc (ID: ' + tenantId + ')\n');

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Seed failed:', error.message);
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

seed().catch(() => process.exit(1));
