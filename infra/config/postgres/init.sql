-- ============================================================================
-- Cerniq.app PostgreSQL Initialization Script
-- ============================================================================
-- Reference: ADR-0004, schema-database.md
-- Extensions: pgvector 0.8.1, PostGIS 3.6.1, pg_trgm
-- Executed on first container start
-- Last Updated: 2026-02-03
-- ============================================================================

-- Create WAL archive directory
\! mkdir -p /var/lib/postgresql/wal_archive && chown postgres:postgres /var/lib/postgresql/wal_archive || true

-- ====================
-- EXTENSII OBLIGATORII (conform ADR-0004)
-- ====================
CREATE EXTENSION IF NOT EXISTS vector;             -- pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS postgis;            -- Geospatial functions
CREATE EXTENSION IF NOT EXISTS postgis_topology;   -- Topology support
CREATE EXTENSION IF NOT EXISTS pg_trgm;            -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";        -- UUID generation (backup)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; -- Performance monitoring

-- ====================
-- VERIFICARE EXTENSII
-- ====================
DO $$
DECLARE
    ext_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ext_count 
    FROM pg_extension 
    WHERE extname IN ('vector', 'postgis', 'pg_trgm', 'pg_stat_statements');
    
    IF ext_count < 4 THEN
        RAISE EXCEPTION 'Required extensions not loaded. Found only % of 4', ext_count;
    END IF;
    
    RAISE NOTICE 'All required extensions loaded successfully (% extensions)', ext_count;
END $$;

-- ====================
-- SCHEMA-URI MEDALLION ARCHITECTURE
-- Reference: schema-database.md
-- ====================
CREATE SCHEMA IF NOT EXISTS bronze;   -- Raw data ingestion
CREATE SCHEMA IF NOT EXISTS silver;   -- Cleaned and validated
CREATE SCHEMA IF NOT EXISTS gold;     -- Ready for outreach
CREATE SCHEMA IF NOT EXISTS approval; -- HITL approval workflows
CREATE SCHEMA IF NOT EXISTS audit;    -- Audit logging

-- ====================
-- APPLICATION ROLE
-- ====================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cerniq_app') THEN
        CREATE ROLE cerniq_app WITH LOGIN PASSWORD 'app_password_via_pgbouncer';
    END IF;
END $$;

-- ====================
-- OPENBAO VAULT ROLE (for dynamic credential generation)
-- Reference: ADR-0033 OpenBao Secrets Management
-- ====================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cerniq_vault') THEN
        -- This user is used by OpenBao to create dynamic database credentials
        -- Password is rotated by OpenBao after initial setup
        CREATE ROLE cerniq_vault WITH 
            LOGIN 
            PASSWORD 'vault_initial_password_change_me'
            CREATEROLE
            NOCREATEDB;
        
        RAISE NOTICE 'cerniq_vault role created for OpenBao dynamic credentials';
    END IF;
END $$;

-- Grant cerniq_vault the ability to manage cerniq_app role
GRANT cerniq_app TO cerniq_vault WITH ADMIN OPTION;

-- Grant schema usage
GRANT USAGE ON SCHEMA public, bronze, silver, gold, approval, audit TO cerniq_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public, bronze, silver, gold, approval, audit TO cerniq_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public, bronze, silver, gold, approval, audit TO cerniq_app;

-- Default privileges pentru tabele viitoare
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO cerniq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO cerniq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA bronze GRANT ALL PRIVILEGES ON TABLES TO cerniq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA bronze GRANT ALL PRIVILEGES ON SEQUENCES TO cerniq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA silver GRANT ALL PRIVILEGES ON TABLES TO cerniq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA silver GRANT ALL PRIVILEGES ON SEQUENCES TO cerniq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA gold GRANT ALL PRIVILEGES ON TABLES TO cerniq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA gold GRANT ALL PRIVILEGES ON SEQUENCES TO cerniq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA approval GRANT ALL PRIVILEGES ON TABLES TO cerniq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA approval GRANT ALL PRIVILEGES ON SEQUENCES TO cerniq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT ALL PRIVILEGES ON TABLES TO cerniq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT ALL PRIVILEGES ON SEQUENCES TO cerniq_app;

-- ====================
-- FUNCȚII HELPER
-- ====================

-- Funcție pentru RLS tenant context
CREATE OR REPLACE FUNCTION set_current_tenant(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_current_tenant(uuid) TO cerniq_app;

-- Funcție pentru updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- TABELA TENANTS (Foundation)
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

-- ====================
-- LOG COMPLETARE
-- ====================
DO $$ 
BEGIN 
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Cerniq.app database initialization complete!';
    RAISE NOTICE 'PostgreSQL 18.1 + PostGIS 3.6 + pgvector 0.8';
    RAISE NOTICE 'Extensions: vector, postgis, pg_trgm, pg_stat_statements';
    RAISE NOTICE 'Schemas: bronze, silver, gold, approval, audit';
    RAISE NOTICE '============================================';
END $$;
