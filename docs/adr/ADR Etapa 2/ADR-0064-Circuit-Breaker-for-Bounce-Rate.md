# ADR-0064: Circuit Breaker for Bounce Rate

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Bounce rate > 3% poate duce la blacklisting domeniu.

**Decision:** **Circuit breaker** monitorizează hourly și pausează campaign dacă bounce > 3%:

```typescript
if (bounceRate > 0.03) {
  await pauseCampaign(campaignId);
  await alertAdmin('BOUNCE_RATE_HIGH', { bounceRate, campaignId });
}
```

**Rationale:**

- Protecție automată
- Notificare imediată
- Recovery manual după investigare

**Consequences:**

- (+) Protecție automată împotriva blacklisting
- (+) Alertare imediată pentru echipă
- (-) Poate opri campaigns legitime
- (-) Necesită threshold tuning
- (-) Manual resume required
