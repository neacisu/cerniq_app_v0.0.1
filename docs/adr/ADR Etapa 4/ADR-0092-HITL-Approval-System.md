# ADR-0092: HITL Approval System Design

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Anumite decizii necesită intervenție umană (credit override, refund mare, reconciliere manuală).

**Decision:** Sistem **unified HITL** cu:

- Single approval queue
- SLA-based escalation
- Role-based routing
- Slack + Email notifications

**Approval Matrix:**

| Task Type | Approver | SLA | Escalate To |
| --------- | -------- | --- | ----------- |
| credit:override:small | SALES_MANAGER | 4h | CFO |
| credit:override:large | CFO | 2h | CEO |
| refund:large | FINANCE_MANAGER | 4h | CFO |
| payment:unmatched | ACCOUNTING | 8h | CFO |

**Consequences:**

- (+) Centralizare decizii
- (+) Audit complet
- (+) Escalare automată
- (-) Bottleneck potențial
- (-) Training necesar
