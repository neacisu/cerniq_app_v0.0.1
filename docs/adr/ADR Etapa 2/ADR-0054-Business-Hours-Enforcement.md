# ADR-0054: Business Hours Enforcement

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Mesajele trimise în afara orelor de lucru (09:00-18:00) au rate de răspuns foarte mici și pot fi percepute ca spam.

**Decision:** Toate mesajele sunt verificate contra business hours. Job-urile în afara intervalului sunt **delayed** la următoarea fereastră.

```typescript
const isBusinessHours = (tz: string): boolean => {
  const local = DateTime.now().setZone(tz);
  return local.hour >= 9 && local.hour < 18 && local.weekday <= 5;
};
```

**Rationale:**

- Respectă timpul prospectului
- Rate de răspuns mai mari
- Evită percepția de spam

**Consequences:**

- (+) Respectarea orelor de lucru ale prospectului
- (+) Rate de răspuns îmbunătățite
- (-) Acumulare de job-uri overnight
- (-) Spike de activitate la 09:00
- (-) Necesită timezone corect pentru fiecare lead
