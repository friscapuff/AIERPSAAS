-- Create UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create initial schema
CREATE SCHEMA IF NOT EXISTS public;

-- Set default search path
SET search_path TO public;

-- Create application role if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'aierp_user') THEN
    CREATE USER aierp_user WITH PASSWORD 'aierp_password';
  END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON SCHEMA public TO aierp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aierp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aierp_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO aierp_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO aierp_user;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_uuid_ossp ON pg_extension(extname) WHERE extname = 'uuid-ossp';
