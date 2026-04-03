-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;

-- Enable Row Level Security
ALTER SCHEMA public OWNER TO aierp;

-- Grant privileges
GRANT ALL PRIVILEGES ON SCHEMA public TO aierp;
GRANT USAGE ON SCHEMA public TO aierp;
