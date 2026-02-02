# ADR-0057: Jitter Pattern for Human Behavior

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Mesajele trimise la intervale fixe sunt detectate ca automatizate de WhatsApp/Email providers.

**Decision:** **Jitter obligatoriu**: `delay = baseDelay + random(0, maxJitter)`

```typescript
const jitter = 30_000 + Math.random() * 120_000; // 30s-150s
await sleep(jitter);
```

**Rationale:**

- Mimează comportament uman
- Evită detection patterns
- Reduce șansele de ban

**Consequences:**

- (+) Comportament mai natural, similar cu al unui om
- (+) Reducerea riscului de detectare și ban
- (-) Throughput mai mic
- (-) Timing impredictibil
- (-) Acceptabil pentru use case
