-- ============================================================================
-- Cerniq DB privilege repair (run as postgres superuser on CT107)
-- ============================================================================
-- Scope:
--   - cerniq
--   - cerniq_staging
--
-- Why:
--   Dynamic OpenBao roles inherit from c3rn1q.
--   If c3rn1q misses schema/table privileges, app endpoints fail with 500.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'c3rn1q') THEN
    RAISE EXCEPTION 'Role c3rn1q does not exist';
  END IF;

  IF current_database() NOT IN ('cerniq', 'cerniq_staging') THEN
    RAISE EXCEPTION 'Refusing to run on database "%". Allowed: cerniq, cerniq_staging', current_database();
  END IF;
END $$;

-- 1) Ensure schema ownership and usage
ALTER SCHEMA bronze OWNER TO c3rn1q;
ALTER SCHEMA silver OWNER TO c3rn1q;
ALTER SCHEMA gold OWNER TO c3rn1q;
ALTER SCHEMA approval OWNER TO c3rn1q;
ALTER SCHEMA audit OWNER TO c3rn1q;

GRANT USAGE ON SCHEMA public, bronze, silver, gold, approval, audit TO c3rn1q;

-- 2) Existing objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public, bronze, silver, gold, approval, audit TO c3rn1q;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public, bronze, silver, gold, approval, audit TO c3rn1q;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public, bronze, silver, gold, approval, audit TO c3rn1q;

-- 2b) Ensure existing objects are owned by c3rn1q (required for ALTER TABLE in migrations)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS object_name, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'bronze', 'silver', 'gold', 'approval', 'audit')
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  LOOP
    BEGIN
      IF r.relkind IN ('r', 'p') THEN
        EXECUTE format('ALTER TABLE %I.%I OWNER TO c3rn1q', r.schema_name, r.object_name);
      ELSIF r.relkind IN ('v', 'm') THEN
        EXECUTE format('ALTER VIEW %I.%I OWNER TO c3rn1q', r.schema_name, r.object_name);
      ELSIF r.relkind = 'S' THEN
        EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO c3rn1q', r.schema_name, r.object_name);
      ELSIF r.relkind = 'f' THEN
        EXECUTE format('ALTER FOREIGN TABLE %I.%I OWNER TO c3rn1q', r.schema_name, r.object_name);
      END IF;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping owner change for %.% (insufficient privilege)', r.schema_name, r.object_name;
    END;
  END LOOP;
END $$;

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT n.nspname AS schema_name, p.proname AS function_name, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'bronze', 'silver', 'gold', 'approval', 'audit')
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) OWNER TO c3rn1q',
        f.schema_name,
        f.function_name,
        f.args
      );
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping function owner change for %.%(%)', f.schema_name, f.function_name, f.args;
    END;
  END LOOP;
END $$;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT n.nspname AS schema_name, ty.typname AS type_name
    FROM pg_type ty
    JOIN pg_namespace n ON n.oid = ty.typnamespace
    WHERE n.nspname IN ('public', 'bronze', 'silver', 'gold', 'approval', 'audit')
      AND ty.typtype = 'e'
      AND ty.typname NOT LIKE '\_%'
  LOOP
    BEGIN
      EXECUTE format('ALTER TYPE %I.%I OWNER TO c3rn1q', t.schema_name, t.type_name);
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping type owner change for %.%', t.schema_name, t.type_name;
    END;
  END LOOP;
END $$;

-- 3) Future objects created by postgres
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO c3rn1q;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA bronze
  GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA bronze
  GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA bronze
  GRANT EXECUTE ON FUNCTIONS TO c3rn1q;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA silver
  GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA silver
  GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA silver
  GRANT EXECUTE ON FUNCTIONS TO c3rn1q;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA gold
  GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA gold
  GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA gold
  GRANT EXECUTE ON FUNCTIONS TO c3rn1q;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA approval
  GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA approval
  GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA approval
  GRANT EXECUTE ON FUNCTIONS TO c3rn1q;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA audit
  GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA audit
  GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA audit
  GRANT EXECUTE ON FUNCTIONS TO c3rn1q;

-- 4) Future objects created by c3rn1q itself
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO c3rn1q;

ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA bronze
  GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA bronze
  GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA bronze
  GRANT EXECUTE ON FUNCTIONS TO c3rn1q;

ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA silver
  GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA silver
  GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA silver
  GRANT EXECUTE ON FUNCTIONS TO c3rn1q;

ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA gold
  GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA gold
  GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA gold
  GRANT EXECUTE ON FUNCTIONS TO c3rn1q;

ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA approval
  GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA approval
  GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA approval
  GRANT EXECUTE ON FUNCTIONS TO c3rn1q;

ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA audit
  GRANT ALL PRIVILEGES ON TABLES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA audit
  GRANT ALL PRIVILEGES ON SEQUENCES TO c3rn1q;
ALTER DEFAULT PRIVILEGES FOR ROLE c3rn1q IN SCHEMA audit
  GRANT EXECUTE ON FUNCTIONS TO c3rn1q;
