# ADR-0044: Event Sourcing pentru Enrichment

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Fiecare step de enrichment trebuie tracked pentru audit și replay.

**Decision:**

```sql
CREATE TABLE enrichment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL,  -- anaf, termene, hunter, etc.
  
  -- Event data
  payload JSONB NOT NULL,
  result_status VARCHAR(20),  -- success, failed, partial
  
  -- Idempotency
  idempotency_key VARCHAR(255) UNIQUE,
  
  -- Metadata
  correlation_id UUID,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrich_events_entity ON enrichment_events(entity_type, entity_id);
CREATE INDEX idx_enrich_events_correlation ON enrichment_events(correlation_id);
```

**Consequences:**

- (+) Audit trail complet
- (+) Replay posibil
- (+) Debugging facilitat
