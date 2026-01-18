# ADR-0059: Webhook Normalization Pattern

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Fiecare provider (TimelinesAI, Instantly, Resend) trimite webhooks în formate diferite.

**Decision:** **Normalizare la SystemEvent comun**:

```typescript
interface SystemEvent {
  lead_id: string;
  type: 'REPLY' | 'BOUNCE' | 'OPEN' | 'CLICK' | 'UNSUBSCRIBE';
  channel: 'WHATSAPP' | 'EMAIL';
  content?: string;
  timestamp: Date;
  raw_payload: object;
}
```

**Rationale:**

- Pipeline downstream uniform
- Ușor de adăugat noi provideri
- Single source of truth pentru events

**Consequences:**

- (+) Procesare uniformă downstream
- (+) Extensibilitate pentru noi provideri
- (-) Mapare per provider necesară
- (-) Posibilă pierdere de detalii specifice
- (-) raw_payload păstrat pentru debugging
