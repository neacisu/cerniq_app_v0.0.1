-- ============================================================================
-- Cerniq.app PostgreSQL Initialization Script (CT107 SAFE)
-- ============================================================================
-- Purpose:
-- - Safe to run on shared CT107 PostgreSQL (idempotent, additive).
-- - MUST NOT overwrite role passwords (passwords managed outside this file).
-- - Creates extensions, schemas, base functions, base table.
--
-- NOTE:
-- - Run this as a superuser (postgres) on each database:
--   - cerniq
--   - cerniq_staging
-- ============================================================================

-- ====================
-- EXTENSIONS (required)
-- ====================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ====================
-- VERIFY EXTENSIONS
-- ====================
DO $$
DECLARE
  ext_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO ext_count
  FROM pg_extension
  WHERE extname IN ('vector', 'postgis', 'pg_trgm', 'pg_stat_statements');

  IF ext_count < 4 THEN
    RAISE EXCEPTION 'Required extensions not loaded. Found only % of 4', ext_count;
  END IF;
END $$;

-- ====================
-- MEDALLION SCHEMAS
-- ====================
CREATE SCHEMA IF NOT EXISTS bronze;
CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS gold;
CREATE SCHEMA IF NOT EXISTS approval;
CREATE SCHEMA IF NOT EXISTS audit;

-- ====================
-- ROLES (create only if missing, WITHOUT passwords)
-- ====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'c3rn1q') THEN
    CREATE ROLE c3rn1q WITH LOGIN;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cerniq_vault') THEN
    -- Used by OpenBao database secrets engine. Password is set/rotated by OpenBao.
    CREATE ROLE cerniq_vault WITH LOGIN CREATEROLE NOCREATEDB;
  END IF;
END $$;

-- Allow OpenBao role to manage app role (for dynamic creds workflows)
GRANT c3rn1q TO cerniq_vault WITH ADMIN OPTION;

-- ====================
-- BASE PRIVILEGES
-- ====================
GRANT USAGE ON SCHEMA public, bronze, silver, gold, approval, audit TO c3rn1q;

-- Existing objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public, bronze, silver, gold, approval, audit TO c3rn1q;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public, bronze, silver, gold, approval, audit TO c3rn1q;

-- Future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES IN SCHEMA bronze GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES IN SCHEMA bronze GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES IN SCHEMA silver GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES IN SCHEMA silver GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES IN SCHEMA gold GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES IN SCHEMA gold GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES IN SCHEMA approval GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES IN SCHEMA approval GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;

-- ====================
-- HELPER FUNCTIONS
-- ====================
CREATE OR REPLACE FUNCTION set_current_tenant(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_current_tenant(uuid) TO c3rn1q;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- FOUNDATION TABLES
-- ====================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deleted')),
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

