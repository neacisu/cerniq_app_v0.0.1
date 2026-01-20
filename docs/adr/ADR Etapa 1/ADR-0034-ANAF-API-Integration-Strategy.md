# ADR-0034: ANAF API Integration Strategy

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** ANAF expune API pentru date fiscale, TVA, e-Factura cu rate limit 1 req/sec.

**Decision:**

1. **OAuth 2.0 Flow** pentru autentificare
2. **Circuit Breaker** cu threshold 3 failures, timeout 60s
3. **Rate Limiter** global 1 req/sec via Redis token bucket
4. **Retry** exponential backoff 2^n * 1000ms, max 5 încercări
5. **Cache** rezultate 24h în Redis

```typescript
const anafRateLimiter = {
  points: 1,       // 1 request
  duration: 1,     // per 1 second
  blockDuration: 5, // block 5s on exceed
};
```

**Consequences:**

- (+) Respectă limitele ANAF
- (+) Reziliență la downtime
- (-) Latență crescută pentru volume mari
