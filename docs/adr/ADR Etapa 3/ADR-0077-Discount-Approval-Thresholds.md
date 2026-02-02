# ADR-0077: Discount Approval Thresholds

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Discounturile mari trebuie aprobate de management. Politica de discount necesită enforcement automat.

**Decision:** **HITL Workflow** pentru discounturi peste threshold:

| Discount | Approval |
|----------|----------|
| ≤15% | Auto-approved |
| 15-30% | Manager approval (SLA 4h) |
| 30-50% | Director approval (SLA 24h) |
| >50% | Rejected (absolute max) |

**Implementation:**

- Sub AUTO_APPROVE_MAX: Return approved immediately
- Peste threshold: Create `approval_tasks` cu `type: 'DISCOUNT_APPROVAL'`
- Priority bazat pe discount value (>25% = HIGH)

**Consequences:**

- (+) Control financiar pe discounturi
- (+) Audit trail pentru toate aprobările
- (+) Flexibilitate în escalare
