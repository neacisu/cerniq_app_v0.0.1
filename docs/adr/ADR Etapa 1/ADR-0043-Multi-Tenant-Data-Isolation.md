# ADR-0043: Multi-Tenant Data Isolation

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Fiecare tenant are date izolate complet.

**Decision:** RLS (Row Level Security) pe toate tabelele:

```sql
-- Pattern pentru toate tabelele Etapa 1
ALTER TABLE bronze_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_bronze ON bronze_contacts
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- UNIQUE constraints includ tenant_id
ALTER TABLE silver_companies 
ADD CONSTRAINT uq_silver_companies_cui 
UNIQUE (tenant_id, cui);
```

**Consequences:**

- (+) Izolare completă date
- (+) Imposibil data leak cross-tenant
- (-) UNIQUE constraints mai complexe
