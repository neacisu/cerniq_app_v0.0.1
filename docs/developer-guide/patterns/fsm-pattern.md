# Finite State Machine Pattern — Lead/Negotiation Lifecycle

**Priority:** HIGH | **Version:** 1.0 | **February 2026**

## Overview

This pattern defines the lead and negotiation lifecycle as a Finite State Machine (FSM). States are stored in Drizzle enum columns, transitions are validated, and an audit trail is maintained. Event-driven transitions can be triggered via BullMQ.

---

## 1. State Definitions

### Lead Lifecycle States

| State       | Description               | Next States       |
| ----------- | ------------------------- | ----------------- |
| COLD        | New lead, not contacted   | CONTACTED         |
| CONTACTED   | First contact attempted   | WARM, DEAD        |
| WARM        | Engaged, showing interest | NEGOTIATION, DEAD |
| NEGOTIATION | In active negotiation     | CONVERTED, DEAD   |
| CONVERTED   | Won / closed deal         | (terminal)        |
| DEAD        | Lost / disqualified       | (terminal)        |

### Drizzle Schema

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

export const leadStateEnum = pgEnum('lead_state', [
  'COLD', 'CONTACTED', 'WARM', 'NEGOTIATION', 'CONVERTED', 'DEAD'
]);

// In schema
leadState: leadStateEnum('lead_state').default('COLD').notNull(),
```

---

## 2. State Transition Validation

Define allowed transitions in code:

```typescript
const ALLOWED_TRANSITIONS: Record<LeadState, LeadState[]> = {
  COLD: ["CONTACTED"],
  CONTACTED: ["WARM", "DEAD"],
  WARM: ["NEGOTIATION", "DEAD"],
  NEGOTIATION: ["CONVERTED", "DEAD"],
  CONVERTED: [],
  DEAD: [],
};

function canTransition(from: LeadState, to: LeadState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
```

Reject invalid transitions with `ConflictError`.

---

## 3. Audit Trail via approval_audit_log

Log every state change for compliance and debugging:

```typescript
await db.insert(approvalAuditLog).values({
  entityType: "lead",
  entityId: lead.id,
  fromState: currentState,
  toState: newState,
  userId: req.user.id,
  reason: body.reason ?? null,
  metadata: { source: "api", ip: req.ip },
});
```

Table: `approval_audit_log` with columns: `id`, `entity_type`, `entity_id`, `from_state`, `to_state`, `user_id`, `reason`, `metadata`, `created_at`.

---

## 4. Event-Driven Transitions via BullMQ

For automated transitions (e.g. after email opened, meeting scheduled):

```typescript
await leadTransitionQueue.add("transition", {
  leadId: lead.id,
  fromState: "CONTACTED",
  toState: "WARM",
  trigger: "email_opened",
  metadata: { emailId, openedAt },
});
```

Worker validates transition, updates DB, and writes audit log.

---

## 5. API Design

```http
PATCH /v1/leads/:id/state
Content-Type: application/json

{ "toState": "WARM", "reason": "Positive reply received" }
```

Response: 200 with updated lead, or 409 if transition invalid.

---

## 6. Romanian Context

- **Lead** = prospect (potențial client)
- **CUI** validation may gate transition from COLD to CONTACTED
- **e-Factura** integration relevant when CONVERTED (invoice generation)

---

## 7. Bulk Transitions

For batch updates (e.g. mark 50 leads as DEAD): validate each transition, apply in transaction, log each in audit. Use BullMQ for large batches to avoid timeout.

---

## 8. State Entry/Exit Hooks

Optional: run side effects on transition (e.g. send email when WARM, create task when NEGOTIATION). Implement in worker or API layer; keep FSM logic pure.

---

## 9. Related Documents

- `worker-pool-sizing.md` — Worker for transition jobs
- `docs/specifications/Etapa 1/etapa1-plan-implementare-COMPLET.md` — Lead model

---

## Checklist

- [ ] Drizzle enum for states
- [ ] Transition validation function
- [ ] Audit log on every transition
- [ ] BullMQ for async transitions
- [ ] API endpoint for manual transitions
- [ ] Bulk transition support
