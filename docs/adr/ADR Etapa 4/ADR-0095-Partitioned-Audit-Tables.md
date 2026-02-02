# ADR-0095: Partitioned Audit Tables

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Audit logs pot crește rapid și impacta performanța query-urilor.

**Decision:** **Table partitioning** by month pentru audit_logs și tracking:

- Range partitioning pe `created_at`
- Auto-create partitions pentru 3 luni în avans
- Retention policy: 7 ani (GDPR), apoi anonymize

**Consequences:**

- (+) Query performance menținută
- (+) Easy archival
- (+) Compliance asigurat
- (-) Complexitate DDL
- (-) Maintenance overhead
