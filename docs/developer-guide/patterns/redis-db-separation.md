# Redis Database Separation Strategy

**Priority:** BLOCKER | **Version:** 1.0 | **February 2026**

## Overview

Cerniq shares a single Redis instance with other projects on the orchestrator. This document defines the prefix isolation strategy, BullMQ naming, session storage, cache TTL policies, and operational considerations.

---

## 1. Single Redis Instance

- **Location:** Orchestrator (10.0.1.10:6379)
- **Shared by:** Cerniq, Neanelu, possibly others
- **No database separation:** Redis DB 0 used by all (BullMQ default)
- **Isolation:** Achieved via key prefix only

---

## 2. Prefix Isolation

**All Cerniq keys MUST use the `cerniq:` prefix.**

| Use Case      | Key Pattern                    | Example                          |
|---------------|--------------------------------|----------------------------------|
| BullMQ queues | `cerniq:{queueName}:*`         | `cerniq:enrich:anaf:tva`         |
| BullMQ keys   | `cerniq:bull:{queue}:*`        | `cerniq:bull:enrich:anaf:tva:1`  |
| Cache         | `cerniq:cache:{type}:{id}`     | `cerniq:cache:anaf:tva:12345678` |
| Session       | `cerniq:session:{sid}`         | `cerniq:session:abc123`          |
| Idempotency   | `cerniq:webhook:idempotency:*` | `cerniq:webhook:idempotency:key` |
| Rate limit    | `cerniq:ratelimit:{scope}:*`   | `cerniq:ratelimit:api:user:1`    |

---

## 3. BullMQ Queue Naming

Queue names include the prefix when using a custom prefix:

```typescript
const queue = new Queue('enrich:anaf:tva', {
  connection: redis,
  prefix: 'cerniq',
});
// Results in keys: cerniq:enrich:anaf:tva:*
```

Or use full name: `cerniq:queue:enrich:anaf:tva`. Be consistent across API and workers.

---

## 4. Session Storage

- **Library:** `@fastify/session` with `connect-redis`
- **Key:** `cerniq:session:{sessionId}`
- **TTL:** 24h (configurable per env)
- **Cookie:** `cerniq.sid` (httpOnly, secure, sameSite)

---

## 5. Cache TTL Policies

| Data Type        | TTL    | Key Pattern              |
|------------------|--------|--------------------------|
| ANAF TVA         | 24h    | `cerniq:cache:anaf:tva:*`|
| Termene company  | 6h     | `cerniq:cache:termene:*` |
| Hunter email     | 7d     | `cerniq:cache:hunter:*`   |
| API response     | 5m     | `cerniq:cache:api:*`     |
| Idempotency      | 24h    | `cerniq:webhook:idempotency:*` |

Use `SETEX` or `EXPIRE` for all cache keys. Never store without TTL.

---

## 6. noeviction Policy Implications

If Redis is configured with `maxmemory-policy noeviction`:

- When memory is full, **writes fail** (no eviction)
- Monitor memory usage proactively
- Set `maxmemory` and consider `volatile-lru` for cache keys if eviction is acceptable

**Recommendation:** Coordinate with infra team. Cerniq keys should have TTL to allow eventual cleanup; BullMQ job keys expire when jobs complete.

---

## 7. Monitoring via redis-cli

```bash
# Count Cerniq keys
redis-cli KEYS "cerniq:*" | wc -l

# Memory used by Cerniq keys (approximate)
redis-cli --memkeys --memkeys-samples 1000 | grep cerniq

# List queue lengths
redis-cli LLEN "cerniq:enrich:anaf:tva:wait"
```

---

## 8. Key Naming Conventions

- Use lowercase and colons: `cerniq:cache:anaf:tva:12345678`
- No spaces or special chars
- Consistent hierarchy: `cerniq:{domain}:{type}:{id}`

---

## 9. BullMQ Connection Options

```typescript
const redis = new Redis(process.env.REDIS_URL, {
  keyPrefix: 'cerniq:',  // Optional; or set per Queue
  maxRetriesPerRequest: 3,
});
```

Ensure `keyPrefix` aligns with Queue/Worker prefix for consistency.

---

## 10. Eviction and Memory

If Redis runs low on memory:
- Keys with TTL are evicted first (if policy allows)
- BullMQ job data: typically short-lived (completed jobs cleaned)
- Monitor `used_memory` and `maxmemory`; alert when > 80%

---

## 11. Related Documents

- `worker-pool-sizing.md` — Queue configuration
- `docs/infrastructure/redis-authentication.md` — Redis auth
- `docs/infrastructure/redis-high-availability.md` — HA setup

---

## Checklist

- [ ] All keys use `cerniq:` prefix
- [ ] BullMQ queues use consistent naming
- [ ] Session keys isolated
- [ ] Cache keys have TTL
- [ ] Memory usage monitored
- [ ] Key naming conventions followed
