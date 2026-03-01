# Search and Filter Pattern

**Priority:** HIGH | **Version:** 1.0 | **February 2026**

## Overview

This pattern covers search and filtering: pg_trgm for fuzzy search, GIN indexes, Drizzle where clauses, filter builder pattern, URL query params sync with frontend state, and debounced search input.

---

## 1. pg_trgm for Fuzzy Search

PostgreSQL extension for trigram similarity (handles typos, partial matches).

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Search companies by name (fuzzy)
SELECT * FROM companies
WHERE name % 'Acme Corp'  -- similarity operator
   OR name ILIKE '%acme%'
ORDER BY similarity(name, 'Acme Corp') DESC
LIMIT 20;
```

**Romanian:** pg_trgm works with diacritics (ă, î, ș, ț). Normalize for consistency (optional).

---

## 2. GIN Indexes

For fast ILIKE and similarity search:

```sql
CREATE INDEX idx_companies_name_trgm ON companies USING GIN (name gin_trgm_ops);
```

Add to Drizzle migrations. Use for frequently searched columns (company name, CUI, email).

---

## 3. Drizzle Where Clauses

```typescript
import { sql, ilike, or, eq, and } from "drizzle-orm";

const searchTerm = req.query.q ?? "";
const filters = req.query; // { status, region, ... }

let whereClause = and();

if (searchTerm) {
  whereClause = and(
    whereClause,
    or(
      ilike(companies.name, `%${searchTerm}%`),
      ilike(companies.cui, `%${searchTerm}%`),
      sql`similarity(${companies.name}, ${searchTerm}) > 0.3`,
    ),
  );
}

if (filters.status) whereClause = and(whereClause, eq(leads.status, filters.status));
if (filters.region) whereClause = and(whereClause, eq(companies.region, filters.region));
```

---

## 4. Filter Builder Pattern

Centralize filter logic:

```typescript
function buildLeadFilters(query: Record<string, string>) {
  const filters: SQL[] = [];
  if (query.status) filters.push(eq(leads.status, query.status));
  if (query.assignedTo) filters.push(eq(leads.assignedToId, query.assignedTo));
  if (query.dateFrom) filters.push(gte(leads.createdAt, new Date(query.dateFrom)));
  if (query.dateTo) filters.push(lte(leads.createdAt, new Date(query.dateTo)));
  return and(...filters);
}
```

---

## 5. URL Query Params Sync

Keep filters in URL for shareability and back/forward:

```
/leads?q=acme&status=WARM&region=Bucuresti
```

Frontend: `useSearchParams` or similar to read/write. API: parse `req.query`.

---

## 6. Debounced Search Input

Avoid API spam on keystroke:

```tsx
const [search, setSearch] = useState("");
const debouncedSearch = useDebouncedValue(search, 300);

useEffect(() => {
  if (debouncedSearch) {
    refetch(); // or setQueryParams({ q: debouncedSearch })
  }
}, [debouncedSearch]);
```

300–500ms debounce typical.

---

## 7. CUI Search

CUI (Romanian company ID) is 8 digits. Support:

- Exact: `12345678`
- Partial: `1234` (prefix match)
- With/without leading zeros

Normalize before query: pad to 8 digits if numeric.

---

## 8. Full-Text Search (Optional)

For longer text (descriptions, notes), use PostgreSQL `tsvector` and `tsquery`:

```sql
CREATE INDEX idx_leads_notes_fts ON leads USING GIN (to_tsvector('romanian', notes));
```

---

## 9. Filter Persistence

Save user filter presets (e.g. "My WARM leads") in DB. Load and apply as default when user returns.

---

## 10. Related Documents

- `pagination-strategy.md` — Combine search with pagination
- `fsm-pattern.md` — Status filter values

---

## Checklist

- [ ] pg_trgm enabled, GIN indexes on search columns
- [ ] Drizzle where builder
- [ ] URL params sync
- [ ] Debounced search (300ms+)
- [ ] CUI normalization
- [ ] Full-text for long text (optional)
