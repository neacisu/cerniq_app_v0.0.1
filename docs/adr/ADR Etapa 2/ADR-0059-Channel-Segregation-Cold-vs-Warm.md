# ADR-0059: Channel Segregation (Cold vs Warm)

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Email-urile cold și warm au cerințe de deliverability complet diferite.

**Decision:** **Segregare strictă**:

- **Instantly.ai**: DOAR cold outreach (domenii sacrificabile)
- **Resend**: DOAR warm leads (domeniu principal, reputație)

```typescript
if (lead.current_state === 'WARM_REPLY' || lead.current_state === 'NEGOTIATION') {
  queue = 'email:warm'; // Resend
} else {
  queue = 'email:cold'; // Instantly
}
```

**Rationale:**

- Protejează reputația domeniului principal
- Instantly are warm-up și rotation built-in
- Resend garantează inbox pentru leads importante

**Consequences:**

- (+) Protecție reputație domeniu principal
- (+) Deliverability optim pentru leads calde
- (-) Doi provideri de email de gestionat
- (-) Costuri separate
- (-) Logică de routing necesară
