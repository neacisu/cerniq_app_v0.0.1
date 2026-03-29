# Migration Safety Checklist — Zero-Downtime Deployments

| Field           | Value                     |
| --------------- | ------------------------- |
| Version         | 1.0.0                     |
| Last Updated    | 2026-03-22                |
| Applies To      | All Drizzle/SQL migrations|

---

## Mandatory Rules

### Rule 1: CREATE INDEX -> CREATE INDEX CONCURRENTLY

**NEVER** use `CREATE INDEX` in a migration without `CONCURRENTLY`. Regular `CREATE INDEX` takes an `ACCESS EXCLUSIVE` lock on the table, blocking all reads and writes for the duration of index creation.

```sql
-- BAD: Blocks all queries on the table
CREATE INDEX IF NOT EXISTS idx_foo ON my_table(column);

-- GOOD: Non-blocking, concurrent reads/writes allowed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_foo ON my_table(column);
```

**Note**: `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block. Drizzle migrations with `breakpoints: true` handle this correctly. If your migration runner wraps in a transaction, the CONCURRENTLY operation will fail. Test before applying.

### Rule 2: Rename Columns — Expand-Contract Pattern (4 Steps)

**NEVER** use `ALTER TABLE RENAME COLUMN` directly. This breaks all running application instances that reference the old name.

**4-Step Process:**
1. **Step 1 (Migration A):** Add new column with `ADD COLUMN IF NOT EXISTS`
2. **Step 2 (Deploy):** Update application code to write to BOTH old and new columns (dual-write)
3. **Step 3 (Migration B):** Backfill new column from old: `UPDATE SET new_col = old_col WHERE new_col IS NULL`
4. **Step 4 (Migration C, after all instances updated):** Drop old column with `DROP COLUMN IF EXISTS`

### Rule 3: ALTER COLUMN TYPE — Two-Deploy Migration

**NEVER** change column types in a single migration on large tables. The table is rewritten, holding `ACCESS EXCLUSIVE` lock.

**2-Deploy Process:**
1. **Deploy 1 (Migration A):** Add new column with target type, trigger/function to sync values
2. **Deploy 2 (Migration B, after backfill complete):** Drop old column, rename new

**Exception:** For small tables (< 10,000 rows), single ALTER COLUMN TYPE is acceptable.

### Rule 4: Rollback SQL Required

Every migration MUST have a corresponding rollback script tested on a database backup before production application.

```sql
-- migration: 0034_add_feature.sql
ALTER TABLE foo ADD COLUMN IF NOT EXISTS bar TEXT;

-- rollback: 0034_add_feature_rollback.sql
ALTER TABLE foo DROP COLUMN IF EXISTS bar;
```

### Rule 5: No Destructive Operations Without Backup Verification

Before any `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or `DELETE FROM` without WHERE:
1. Verify backup exists and is recent (< 1 hour)
2. Test rollback on staging
3. Document the operation in the migration comments

---

## Pre-Migration Checklist

Before applying any migration to production:

- [ ] Migration tested on a copy of production database
- [ ] All `CREATE INDEX` statements use `CONCURRENTLY`
- [ ] All column renames use expand-contract pattern
- [ ] All type changes assessed for table lock duration
- [ ] Rollback SQL written and tested
- [ ] Application code compatible with both old and new schema
- [ ] Estimated migration duration documented
- [ ] Maintenance window scheduled (if needed)
- [ ] Database backup verified (< 1 hour old)
- [ ] Monitoring alerts configured for lock wait timeouts

---

## Audit of Existing Migrations (0000-0033)

### Findings: CREATE INDEX without CONCURRENTLY

The following migrations use `CREATE INDEX` without `CONCURRENTLY`, which would block reads/writes in production:

| Migration | Count | Tables Affected                           |
| --------- | ----- | ----------------------------------------- |
| 0008      | 15    | bronze.bronze_contacts, bronze_batches    |
| 0009      | 13    | silver.silver_companies, contacts, dedup  |
| 0010      | 5     | gold.gold_companies, contacts, journey    |
| 0011      | 2     | approval.approval_tasks                   |
| 0012      | 3     | silver.silver_companies (GIN trgm)        |
| 0013      | 8     | silver + gold tables                      |
| 0014      | 6     | silver + gold + approval tables           |
| 0015      | 1     | gold.gold_companies (HNSW embedding)      |
| 0016      | 3     | bronze.bronze_contacts                    |
| 0017      | 6     | silver financial tables                   |
| 0018      | 1     | silver.silver_company_locations           |
| 0019      | 6     | bronze + silver + identity keys           |
| 0022      | 7     | consent + silver + gold (geography, trgm) |
| 0025      | 21    | outreach schema (all tables)              |
| 0026      | 1     | webhook archive                           |
| 0027      | 1     | wa_quota_usage                            |
| 0028      | 6     | outreach notifications + various          |
| 0030      | 4     | silver + reprocess sessions               |
| 0031      | 4     | bronze job logs                           |
| 0032      | 9     | import runtime sessions/jobs/counters     |

**Total: 122 indexes without CONCURRENTLY**

**Risk assessment:** These migrations have already been applied. The risk was during initial deployment. For future re-deployments or new environments, these should be reviewed. Tables with significant data (>100K rows) should have their indexes recreated with CONCURRENTLY.

### Findings: ALTER COLUMN TYPE

| Migration | Operation                          | Risk Level |
| --------- | ---------------------------------- | ---------- |
| 0022      | geography(POINT,4326) conversions  | LOW (small)|
| 0030      | varchar(20)->varchar(32) resize    | LOW        |
| 0033      | vector(1536)->halfvec(3072)        | MEDIUM     |

### Findings: DROP COLUMN

| Migration | Operation                     | Has Backup? |
| --------- | ----------------------------- | ----------- |
| 0015      | DROP ai_embedding (re-add)    | N/A (empty) |
| 0022      | DROP denumire_normalizata     | N/A (dev)   |
| 0022      | DROP is_agricultural          | N/A (dev)   |

---

## Recommended Practices for Future Migrations

1. **Always use `CREATE INDEX CONCURRENTLY`** for production tables
2. **Test migration duration** on a staging database with production-like data volume
3. **Monitor `pg_stat_activity`** during migration for blocked queries
4. **Set `lock_timeout`** in migration scripts: `SET lock_timeout = '5s';`
5. **Use `statement_timeout`** for safety: `SET statement_timeout = '300s';`
6. **Log migration start/end** with timestamp and duration
7. **Run `ANALYZE`** after large data modifications
