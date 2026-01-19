# ADR-0085: Audit Trail cu Hash Chain

**Status:** Accepted  
**Date:** 2026-01-18  
**Context:** Pentru compliance și non-repudiation, acțiunile fiscale trebuie să aibă audit trail tamper-evident.

**Decision:** **Hash Chain** pentru audit events critice:

**Table:** `audit_fiscal_events`

| Field | Purpose |
|-------|---------|
| event_type | PROFORMA_CREATED, INVOICE_ISSUED, EINVOICE_SENT |
| entity_type/id | Document reference |
| actor_type/id | user, system, ai_agent |
| event_data | Full payload JSONB |
| event_hash | SHA256 of this event |
| previous_hash | Chain link to previous event |

**Hash Formula:**

```sql
sha256(event_type || entity_id || event_data || previous_hash || created_at)
```

**Consequences:**

- (+) Tamper-evident audit trail
- (+) Compliance cu reglementări fiscale
- (+) Detectare alterări chain
