# External API Integration Pattern

**Priority:** BLOCKER | **Version:** 1.0 | **February 2026**

## Overview

This pattern defines how Cerniq integrates with external APIs: ANAF (Romanian fiscal authority), Termene.ro (company data), Hunter.io (email discovery), Resend, and similar services. All integrations must be resilient, observable, and compliant with Romanian context (CUI, e-Factura, ANAF rate limits).

---

## 1. Circuit Breaker (Opossum)

Use [opossum](https://github.com/nodeshift/opossum) to prevent cascading failures when external APIs are degraded.

```typescript
import CircuitBreaker from "opossum";

const anafOptions = {
  timeout: 15000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

const anafBreaker = new CircuitBreaker(fetchAnafData, anafOptions);

anafBreaker.on("open", () => logger.warn("ANAF circuit breaker OPEN"));
anafBreaker.on("halfOpen", () => logger.info("ANAF circuit breaker HALF_OPEN"));
anafBreaker.on("close", () => logger.info("ANAF circuit breaker CLOSED"));
```

**Configuration per provider:**

| Provider  | Timeout | Error Threshold | Reset Timeout |
| --------- | ------- | --------------- | ------------- |
| ANAF      | 15s     | 50%             | 30s           |
| Termene   | 10s     | 50%             | 20s           |
| Hunter.io | 8s      | 60%             | 15s           |

---

## 2. Retry with Exponential Backoff

Implement retries only for transient failures (5xx, network errors). Do NOT retry 4xx (except 429).

```typescript
import pRetry from "p-retry";

const fetchWithRetry = async (fn: () => Promise<T>) =>
  pRetry(fn, {
    retries: 3,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 10000,
    onFailedAttempt: (e) => logger.warn({ attempt: e.attemptNumber }, "Retry"),
  });
```

**ANAF-specific:** ANAF API can return temporary errors; retry up to 3 times with 2s, 4s, 8s delays.

---

## 3. Timeout Handling

Always set explicit timeouts. Map timeout errors to `AppError` hierarchy:

```typescript
import { BadRequestError, TooManyRequestsError } from "../errors/app-error";

// Map external API errors to AppError
function mapToAppError(err: unknown): AppError {
  if (err instanceof TimeoutError)
    return new BadRequestError("External API timeout");
  if (err?.statusCode === 429)
    return new TooManyRequestsError("Rate limit exceeded");
  return new BadRequestError("External API error");
}
```

---

## 4. Response Caching

Cache ANAF/Termene responses to reduce load and respect rate limits. Use Redis with TTL:

- **ANAF TVA status:** 24h TTL (data changes infrequently)
- **Termene company:** 6h TTL
- **Hunter.io:** 7 days (email discovery rarely changes)

```typescript
const cacheKey = `cerniq:anaf:tva:${cui}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
// ... fetch, then redis.setex(cacheKey, 86400, JSON.stringify(data));
```

---

## 5. Error Mapping to AppError Hierarchy

| External Error  | AppError Class          | HTTP Status |
| --------------- | ----------------------- | ----------- |
| 400 Bad Request | BadRequestError         | 400         |
| 401/403         | UnauthorizedError       | 401         |
| 404             | NotFoundError           | 404         |
| 429 Rate Limit  | TooManyRequestsError    | 429         |
| Timeout         | BadRequestError         | 400         |
| Circuit Open    | BadRequestError (retry) | 503         |

---

## 6. Rate Limit Awareness

- **ANAF:** Max 1 req/sec, batch up to 100 CUI per request when possible
- **Hunter.io:** 50 req/min (free tier), 500/min (paid)
- **Termene.ro:** 20 req/min
- **Resend:** 100 emails/sec

Implement client-side rate limiting (e.g. `bottleneck`) before calling external APIs.

---

## 7. Credential Rotation via OpenBao

Never hardcode API keys. Fetch from OpenBao at runtime:

- Path: `secret/cerniq/shared/external`
- Keys: `anaf_api_key`, `termene_api_key`, `hunter_api_key`, `resend_api_key`

Workers and API read credentials from runtime secrets rendered by OpenBao agent.

---

## 8. ANAF-Specific Notes

- **Endpoint:** https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva
- **Batch:** Up to 100 CUI per request; use when possible
- **Response:** JSON with TVA status per CUI
- **Errors:** 503 during maintenance; retry with backoff

---

## 9. Related Documents

- `openbao-secrets-inventory.md` — Credential paths
- `worker-pool-sizing.md` — Rate limits per queue
- `webhook-ingestion.md` — Inbound webhooks (different pattern)

---

## Checklist

- [ ] Circuit breaker configured per provider
- [ ] Retry with exponential backoff (transient only)
- [ ] Timeout set on all requests
- [ ] Errors mapped to AppError
- [ ] Response caching where appropriate
- [ ] Rate limiting respected
- [ ] Credentials from OpenBao only
