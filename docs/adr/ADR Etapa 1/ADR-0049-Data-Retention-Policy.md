# ADR-0049: Data Retention Policy

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** GDPR cerințe pentru data minimization și retention limits.

**Decision:**

| Layer | Retention | Action |
| ------- | ----------- | -------- |
| Bronze | 30 zile | Auto-delete |
| Silver | 90 zile | Archive to cold storage |
| Gold | Indefinit | Review annual |
| Events | 365 zile | Archive compressed |

```sql
-- Automated cleanup job
CREATE OR REPLACE FUNCTION cleanup_old_bronze()
RETURNS void AS $$
BEGIN
  DELETE FROM bronze_contacts 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule daily
SELECT cron.schedule('cleanup-bronze', '0 3 * * *', 'SELECT cleanup_old_bronze()');
```

**Consequences:**

- (+) GDPR compliance
- (+) Storage optimizat
- (-) Reprocessare limitată temporal
