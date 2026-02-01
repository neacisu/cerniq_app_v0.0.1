# CERNIQ.APP — EXTERNAL API RATE LIMITS

## Rate Limits și Constraints pentru API-uri Externe

### Versiunea 1.0 | 19 Ianuarie 2026

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** Rate limits, throttling și circuit breakers pentru toți providerii externi  
**SURSA CANONICĂ:** [`master-specification.md`](../specifications/master-specification.md) § 2.7

---

## CUPRINS

1. [Overview](#1-overview)
2. [Global Rate Limits per Provider](#2-global-rate-limits-per-provider-reference)
3. [WhatsApp Constraints (TimelinesAI)](#3-whatsapp-constraints-timelinesai)
4. [Email Constraints](#4-email-constraints)
5. [LLM Rate Limits](#5-llm-rate-limits)
6. [Circuit Breaker Configuration](#6-circuit-breaker-configuration)
7. [Per-Tenant Throttling](#7-per-tenant-throttling)
8. [Monitoring & Alerting](#8-monitoring--alerting)

---

## 1. OVERVIEW

### 1.1 Strategia de Rate Limiting

Cerniq.app folosește o strategie de rate limiting pe 3 niveluri:

```text
┌────────────────────────────────────────────────────────────────┐
│ NIVEL 1: Global per Provider                                   │
│ (Protejează limita impusă de API extern)                       │
├────────────────────────────────────────────────────────────────┤
│ NIVEL 2: Per-Tenant per Provider                               │
│ (Fair sharing între tenanți)                                   │
├────────────────────────────────────────────────────────────────┤
│ NIVEL 3: Per-Resource (phone, email account, etc)              │
│ (Protecție individuală per resursă)                            │
└────────────────────────────────────────────────────────────────┘
```

### 1.2 Backoff Strategies

| Strategie | Formula | Utilizare |
| --------- | ------- | --------- |
| **Exponential** | `2^n * base_delay` | API-uri critice (ANAF, xAI) |
| **Linear** | `n * base_delay` | API-uri tolerante (Nominatim, Resend) |
| **Fixed** | `delay` constant | Per-resource limiting (WhatsApp phones) |

---

## 2. GLOBAL RATE LIMITS PER PROVIDER (Reference)

> 📖 **Single Source of Truth:** Limitele oficiale și politicile de backoff sunt definite în [`master-specification.md`](../specifications/master-specification.md) § 2.7.1.
>
> Această secțiune detaliază doar **implementarea tehnică** (Redis keys, headers).

### 2.1 Provideri Data Enrichment (Etapa 1)

*Vezi Master Spec § 2.7.1 pentru limitele actuale ANAF, Termene.ro, Hunter.io, etc.*

**ANAF WS v9:** maxim 1 request/sec și maxim 100 CUI/request.

### 2.2 Provideri Comunicare (Etapa 2)

*Vezi Master Spec § 2.7.1 pentru timpii de backoff TimelinesAI și Instantly.*

### 2.3 Provideri LLM (Etapa 3)

*Vezi Master Spec § 2.7.1 pentru rate limits xAI Grok și OpenAI.*

### 2.4 Provideri Financiari (Etapa 4)

*Vezi Master Spec § 2.7.1 pentru constrângerile Revolut, Oblio și ANAF SPV.*

---

## 3. WHATSAPP CONSTRAINTS (TimelinesAI)

> 📖 **Sursă Canonică:** [`master-specification.md`](../specifications/master-specification.md) § 2.7.3

### 3.1 Limite per Număr de Telefon

| Constraint | Limit | Scope | Enforcement |
| ---------- | ----- | ----- | ----------- |
| **New contacts/zi/nr** | 200 | Per phone number | Quota Guardian |
| **New contacts/oră/nr** | 50 | Per phone number | Quota Guardian |
| **Follow-up messages** | Nelimitat | Per phone | N/A |
| **Concurrent sends** | 1 | Per phone queue | BullMQ concurrency=1 |
| **Phone numbers active** | 20 | Per tenant | Config |

### 3.2 Redis Keys pentru Tracking

```typescript
const WHATSAPP_RATE_KEYS = {
  // Counter pentru contacte noi zilnice per telefon
  'ratelimit:wa:{phoneNumber}:daily': 'counter', // Max 200/zi
  
  // Counter pentru contacte noi orare per telefon
  'ratelimit:wa:{phoneNumber}:hourly': 'counter', // Max 50/oră
  
  // Tracking pentru deduplicare
  'wa:contacted:{phoneNumber}:{targetPhone}': 'bitmap', // 90 days TTL
};
```

### 3.3 Quota Guardian Workers

> 📖 **Referință:** [`etapa2-workers-overview.md`](../specifications/Etapa%202/etapa2-workers-overview.md) Categoria A

| Worker | Queue | Funcție |
| ------ | ----- | ------- |
| A.1 | `quota:guardian:check` | Pre-verificare înainte de send |
| A.2 | `quota:guardian:increment` | Incrementare counter după send |
| A.3 | `quota:guardian:reset` | Reset daily counters (cron 00:00) |
| A.4 | `quota:guardian:alert` | Alert când aproape de limită |

---

## 4. EMAIL CONSTRAINTS

### 4.1 Warmup Schedule (Instantly.ai)

> 📖 **Sursă Canonică:** [`master-specification.md`](../specifications/master-specification.md) § 2.7.4

```typescript
const EMAIL_WARMUP_SCHEDULE = {
  week1: { dailyLimit: 20, hourlyLimit: 5 },
  week2: { dailyLimit: 50, hourlyLimit: 10 },
  week3: { dailyLimit: 100, hourlyLimit: 20 },
  week4: { dailyLimit: 200, hourlyLimit: 40 },
  week5_plus: { dailyLimit: 500, hourlyLimit: 100 },
};
```

### 4.2 Deliverability Thresholds

```typescript
const DELIVERABILITY_THRESHOLDS = {
  minDeliveryRate: 0.95,    // Minim 95% delivery rate
  maxBounceRate: 0.03,      // Maxim 3% bounce rate
  maxSpamRate: 0.001,       // Maxim 0.1% spam reports
  pauseOnBreach: true,      // Auto-pause pe breach
};
```

### 4.3 Redis Keys pentru Email

```typescript
const EMAIL_RATE_KEYS = {
  // Counter per account
  'ratelimit:email:{accountId}:hourly': 'counter',
  'ratelimit:email:{accountId}:daily': 'counter',
  
  // Warmup tracking
  'email:warmup:{accountId}:week': 'integer',
  'email:warmup:{accountId}:sent_today': 'counter',
  
  // Deliverability metrics
  'email:metrics:{accountId}:bounces': 'counter',
  'email:metrics:{accountId}:delivered': 'counter',
};
```

---

## 5. LLM RATE LIMITS

### 5.1 Provider Priority Chain

```typescript
const LLM_PROVIDER_CHAIN = {
  primary: 'xai-grok',           // xAI Grok-4
  fallback: ['openai-gpt4o', 'anthropic-claude'],
  
  // Routing rules
  routing: {
    'structured_extraction': 'xai-grok',
    'agent_orchestration': 'xai-grok',
    'embeddings': 'openai',
    'fast_classification': 'openai-gpt4o-mini',
  },
};
```

### 5.2 Token Usage Tracking

```typescript
const LLM_RATE_KEYS = {
  // Per-tenant token usage
  'llm:tokens:{tenantId}:daily': 'counter',
  'llm:tokens:{tenantId}:monthly': 'counter',
  
  // Per-provider rate
  'ratelimit:llm:{provider}:minute': 'token_bucket',
  
  // Cost tracking
  'llm:cost:{tenantId}:monthly': 'float',
};
```

### 5.3 Cost Caps

```typescript
const LLM_COST_CAPS = {
  defaultMonthlyCapUSD: 100,
  warningThreshold: 0.8,    // Alert at 80%
  hardCapEnforced: true,
  gracePeriodMinutes: 60,   // Allow finish in-flight requests
};
```

---

## 6. CIRCUIT BREAKER CONFIGURATION

> 📖 **Sursă Canonică:** [`master-specification.md`](../specifications/master-specification.md) § 2.7.5

### 6.1 Circuit Breaker per Provider

```typescript
interface CircuitBreakerConfig {
  provider: string;
  failureThreshold: number;    // Failures to open
  successThreshold: number;    // Successes to close
  timeout: number;             // Half-open wait (ms)
  monitorWindow: number;       // Window for counting (ms)
}

const CIRCUIT_BREAKERS: CircuitBreakerConfig[] = [
  { provider: 'anaf', failureThreshold: 3, successThreshold: 2, timeout: 60000, monitorWindow: 120000 },
  { provider: 'termene', failureThreshold: 5, successThreshold: 3, timeout: 30000, monitorWindow: 60000 },
  { provider: 'timelines', failureThreshold: 5, successThreshold: 3, timeout: 30000, monitorWindow: 60000 },
  { provider: 'instantly', failureThreshold: 5, successThreshold: 3, timeout: 30000, monitorWindow: 60000 },
  { provider: 'xai', failureThreshold: 3, successThreshold: 2, timeout: 60000, monitorWindow: 120000 },
];
```

### 6.2 Circuit States

```text
     ┌─────────┐      failures >= threshold      ┌─────────┐
     │ CLOSED  │ ─────────────────────────────▶  │  OPEN   │
     │(Normal) │                                  │ (Fail)  │
     └────┬────┘                                  └────┬────┘
          │                                            │
          │   successes >= threshold                   │ timeout
          │                                            │
          │     ┌───────────────┐                      │
          └──── │  HALF-OPEN    │ ◀────────────────────┘
                │ (Test single) │
                └───────────────┘
```

---

## 7. PER-TENANT THROTTLING

### 7.1 Redis Key Patterns

```typescript
const RATE_LIMIT_KEYS = {
  // Global per provider
  'ratelimit:global:{provider}': 'token_bucket',
  
  // Per tenant per provider  
  'ratelimit:{tenantId}:{provider}': 'token_bucket',
};
```

### 7.2 Fair Sharing Algorithm

```typescript
// Token bucket implementation
async function tryAcquireToken(
  tenantId: string,
  provider: string,
  tokens: number = 1
): Promise<boolean> {
  const key = `ratelimit:${tenantId}:${provider}`;
  const config = PROVIDER_LIMITS[provider];
  
  // Lua script for atomic token bucket
  const allowed = await redis.tokenBucket(
    key,
    config.rateLimit,     // Max tokens
    config.refillRate,    // Tokens per second
    tokens                // Requested tokens
  );
  
  return allowed === 1;
}
```

---

## 8. MONITORING & ALERTING

### 8.1 Metrici Rate Limiting

| Metric | Type | Labels | Alert |
| ------ | ---- | ------ | ----- |
| `rate_limit_acquired_total` | Counter | provider, tenant | — |
| `rate_limit_rejected_total` | Counter | provider, tenant | > 10% rejection |
| `circuit_breaker_state` | Gauge | provider | state = OPEN |
| `quota_usage_percent` | Gauge | tenant, resource | > 80% |

### 8.2 SigNoz Alerts

```yaml
alerts:
  - name: HighRateLimitRejection
    condition: |
      rate(rate_limit_rejected_total[5m]) 
      / rate(rate_limit_acquired_total[5m]) > 0.1
    severity: warning
    
  - name: CircuitBreakerOpen
    condition: circuit_breaker_state == 2  # OPEN
    severity: critical
    
  - name: QuotaNearLimit
    condition: quota_usage_percent > 80
    severity: warning
    
  - name: LLMCostOverrun
    condition: |
      sum(llm_cost_usd{tenant=~".+"}) by (tenant) 
      > on(tenant) tenant_cost_cap * 0.9
    severity: warning
```

---

## QUICK REFERENCE

### Limits Summary Table

| Provider | Rate | Burst | Backoff | Circuit Threshold |
| -------- | ---- | ----- | ------- | ----------------- |
| ANAF | 1/s | 1 | Exp 1s | 3 failures |
| Termene | 20/s | 50 | Lin 100ms | 5 failures |
| TimelinesAI | 50/min | 10 | Fixed 1s | 5 failures |
| Instantly | 100/10s | 20 | Exp 2s | 5 failures |
| xAI Grok | 60/min | 10 | Exp 1s | 3 failures |
| OpenAI | 3000/min | 100 | Exp 500ms | 5 failures |

**Notă:** Pentru ANAF WS v9, limita include max 100 CUI/request.

---

**Generat:** 19 Ianuarie 2026  
**Bazat pe:** master-specification.md § 2.7  
**Canonical:** Da — Subordonat Master Spec v1.2
