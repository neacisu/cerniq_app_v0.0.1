# ADR-0005: Row-Level Security pentru Multi-Tenancy

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Cerniq.app este multi-tenant SaaS. Datele între tenants trebuie complet izolate. Opțiuni evaluate:

1. Database per tenant (complex operational)
2. Schema per tenant (migrații complexe)
3. **Shared schema cu RLS** (ales)

## Decizie

Utilizăm **Row-Level Security (RLS)** în PostgreSQL pentru izolarea datelor între tenants.

## Consecințe

### Pozitive

- O singură schemă de migrat
- Queries simplificate (RLS e transparent)
- Cross-tenant analytics posibile cu super_admin

### Negative

- ~12% overhead query latency (3.6ms mediu)
- Necesită `SET app.current_tenant` per request
- Risc de data leakage dacă RLS nu e configurat corect

### Pattern Obligatoriu

```sql
-- 1. Toate tabelele tenant-scoped TREBUIE să aibă tenant_id
CREATE TABLE silver_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    cui VARCHAR(12),
    -- UNIQUE per-tenant, NU global!
    CONSTRAINT unique_cui_per_tenant UNIQUE(tenant_id, cui)
);

-- 2. Enable RLS
ALTER TABLE silver_companies ENABLE ROW LEVEL SECURITY;

-- 3. Policy pentru izolare
CREATE POLICY tenant_isolation ON silver_companies
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- 4. Set context per request (în API)
SET LOCAL app.current_tenant = 'tenant-uuid-here';
```

### Restricții Anti-Halucinare

- **NICIODATĂ** `UNIQUE(cui)` global - ÎNTOTDEAUNA `UNIQUE(tenant_id, cui)`
- **NICIODATĂ** queries fără tenant context
- **AUDIT** RLS policies la fiecare PR
