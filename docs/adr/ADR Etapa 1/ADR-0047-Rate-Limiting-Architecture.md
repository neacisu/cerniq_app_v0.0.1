# ADR-0047: Rate Limiting Architecture

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Multiple API-uri externe cu rate limits diferite.

**Decision:** Redis-based token bucket per provider:

```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiters = {
  anaf: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:anaf',
    points: 1,
    duration: 1,
  }),
  termene: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:termene',
    points: 20,
    duration: 1,
  }),
  hunter: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:hunter',
    points: 15,
    duration: 1,
  }),
};
```

**Consequences:**

- (+) Respectare limits per provider
- (+) Distributed rate limiting
- (+) Backpressure automatic
