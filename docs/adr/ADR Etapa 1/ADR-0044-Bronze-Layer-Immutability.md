# ADR-0044: Bronze Layer Immutability

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Bronze layer trebuie să fie sursa de adevăr pentru reprocessare.

**Decision:**

```sql
-- Bronze tables sunt append-only
CREATE TABLE bronze_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... columns ...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- NO updated_at - immutable!
);

-- Prevent UPDATE/DELETE
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Bronze tables are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bronze_immutable
BEFORE UPDATE OR DELETE ON bronze_contacts
FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

**Consequences:**

- (+) Trasabilitate 100%
- (+) Reprocessare oricând
- (-) Storage grows indefinitely (mitigate cu TTL)
