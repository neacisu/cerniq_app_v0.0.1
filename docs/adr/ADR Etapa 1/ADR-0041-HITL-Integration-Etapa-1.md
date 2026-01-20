# ADR-0041: HITL Integration Etapa 1

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Anumite decizii necesită validare umană (data quality, deduplicare ambiguă).

**Decision:** 3 approval types pentru Etapa 1:

| Approval Type | Trigger | SLA Normal |
| --- | --- | --- |
| `data_quality` | Quality score 40-60 | 24h |
| `dedup_review` | Fuzzy match 70-85% | 24h |
| `manual_enrich` | Missing critical fields | 48h |

```typescript
// HITL gate în worker
if (qualityScore >= 40 && qualityScore < 70) {
  await createApprovalTask({
    entityType: 'contact',
    entityId: contact.id,
    approvalType: 'data_quality',
    metadata: { qualityScore, missingFields },
  });
  
  // Job waiting for approval
  return { status: 'pending_approval' };
}
```

**Consequences:**

- (+) Calitate date garantată pentru Gold
- (+) Human oversight pentru edge cases
- (-) Latență pentru cazuri ambigue
