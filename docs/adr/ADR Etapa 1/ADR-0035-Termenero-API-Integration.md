# ADR-0035: Termene.ro API Integration

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Termene.ro oferă date financiare, bilanțuri, dosare juridice cu rate limit 20 req/sec.

**Decision:**

1. **API Key Authentication**
2. **Rate Limit** 20 req/sec cu burst 50
3. **Endpoints utilizate:**
   - `/company/{cui}` - Date generale
   - `/company/{cui}/balance` - Bilanț
   - `/company/{cui}/cases` - Dosare
   - `/company/{cui}/score` - Risk score

```typescript
const termeneRateLimiter = {
  points: 20,
  duration: 1,
  blockDuration: 2,
};
```

**Consequences:**

- (+) Date financiare comprehensive
- (+) Risk scoring extern
- (-) Cost per request
