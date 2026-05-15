-- AiERP PostgreSQL Initialization Script
-- Multi-tenant SaaS setup with Row-Level Security (RLS)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create aierp schema
CREATE SCHEMA IF NOT EXISTS aierp;

-- Set schema search path
ALTER DATABASE postgres SET search_path TO aierp, public;

-- Create function to set current tenant context
CREATE OR REPLACE FUNCTION aierp.set_current_tenant(tenant_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION aierp.set_current_tenant(uuid) TO postgres;

CREATE OR REPLACE FUNCTION aierp.get_current_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN (current_setting('app.current_tenant_id', true))::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION aierp.get_current_tenant_id() TO postgres;

CREATE TABLE IF NOT EXISTS aierp.tenants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

COMMENT ON TABLE aierp.tenants IS 'Root tenant table - represents each SaaS customer';
COMMENT ON COLUMN aierp.tenants.id IS 'Unique tenant identifier';
COMMENT ON COLUMN aierp.tenants.name IS 'Display name of the tenant';
COMMENT ON COLUMN aierp.tenants.slug IS 'URL-safe identifier for the tenant';

CREATE INDEX idx_tenants_slug ON aierp.tenants(slug);
CREATE INDEX idx_tenants_created_at ON aierp.tenants(created_at DESC);

SELECT aierp.set_current_tenant('00000000-0000-0000-0000-000000000000'::uuid);
