# ADR-0054: Quota Guardian Pattern

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** WhatsApp impune limita de 200 contacte NOI pe zi pe număr. Depășirea = ban permanent.

**Decision:** Implementăm **Quota Guardian** cu Redis Lua scripts pentru verificare și incrementare atomică:

```lua
-- ATOMIC: Check + Increment
local quota = redis.call('GET', key)
if tonumber(quota) >= 200 then
  return -1  -- REJECTED
end
redis.call('INCR', key)
return tonumber(quota) + 1  -- ALLOWED
```

**Rationale:**

- Operații atomice previn race conditions
- Redis oferă persistență și viteză
- Separare NEW (cost=1) vs FOLLOW-UP (cost=0)

**Consequences:**

- (+) Prevenire ban prin limitare atomică
- (+) Persistență și viteză Redis
- (-) Necesită Redis cluster pentru HA
- (-) Quota reset zilnic via cron la 00:00
- (-) Job-uri rejected sunt delayed, nu pierdute
