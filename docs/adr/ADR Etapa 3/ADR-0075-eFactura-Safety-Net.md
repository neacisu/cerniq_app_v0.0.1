# ADR-0075: e-Factura Safety Net la 4 Zile

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Legislația românească: facturile trebuie transmise în SPV în **5 zile calendaristice**. Penalizare: amendă 15-20% din valoarea facturii.

**Decision:** **Safety Net** implementat cu cron job zilnic la 09:00:

- **Cutoff:** 4 zile (safety margin de 1 zi)
- **Acțiuni:**
  - La 4 zile: WARNING alert + queue cu priority urgent
  - La 5+ zile: CRITICAL alert + force submission

**Cron Schedule:** `0 9 * * *` (zilnic la 09:00)

**Consequences:**

- (+) Prevenire amenzi fiscale
- (+) Alertare proactivă
- (+) Compliance automat
