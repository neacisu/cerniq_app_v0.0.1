# CERNIQ.APP — Circuit Breaker Pattern

## Ghid Implementare pentru External APIs

**Versiune:** 1.0  
**Data:** 20 Ianuarie 2026  
**Status:** Best Practice Documentată

---

## 1. CONTEXT ȘI NECESITATE

### Problema

Cerniq.app integrează multiple API-uri externe:

- ANAF (TVA, Bilanțuri)
- Termene.ro (Dosare, Asociați)
- TimelinesAI (WhatsApp)
- Oblio (Facturare)
- Revolut (Plăți)

Fără circuit breakers:

- Un API down → cascade failure în workers
- Requests continuă să timeout → resurse blocate
- Recovery lent după ce API-ul revine

### Soluția

Implementare **Circuit Breaker Pattern** folosind biblioteca [opossum](https://github.com/nodeshift/opossum) sau [cockatiel](https://github.com/connor4312/cockatiel).

---

## 2. PATTERN OVERVIEW

### State Machine

```text
     ┌───────────────────────────────────────┐
     │                                       │
     ▼                                       │
┌─────────┐   Threshold   ┌────────┐   Timeout  ┌───────────┐
│ CLOSED  │ ────────────► │  OPEN  │ ─────────► │ HALF-OPEN │
└─────────┘   exceeded    └────────┘   expired  └───────────┘
     ▲                                       │
     │                                       │
     └─────── success ◄─────────────────────┘
              in half-open
```

| State | Behavior |
| ----- | -------- |
| **CLOSED** | Normal operation, requests pass through |
| **OPEN** | All requests fail immediately (fast-fail) |
| **HALF-OPEN** | Limited requests to test recovery |

---

## 3. IMPLEMENTARE CU OPOSSUM

### 3.1 Instalare

```bash
pnpm add opossum
```

### 3.2 Factory Pattern

```typescript
// lib/circuit-breaker/factory.ts
import CircuitBreaker from 'opossum';

export interface CircuitBreakerConfig {
  name: string;
  timeout?: number;        // Time in ms before request is considered failed
  errorThresholdPercentage?: number; // % errors to trip circuit
  resetTimeout?: number;   // Time in ms before trying again (OPEN → HALF-OPEN)
  volumeThreshold?: number; // Min requests before calculating error %
}

const defaultConfig: Partial<CircuitBreakerConfig> = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 10,
};

export function createCircuitBreaker<T>(
  fn: (...args: any[]) => Promise<T>,
  config: CircuitBreakerConfig
): CircuitBreaker<T> {
  const breaker = new CircuitBreaker(fn, {
    ...defaultConfig,
    ...config,
  });

  // Logging
  breaker.on('open', () => {
    console.warn(`[CircuitBreaker] ${config.name} OPENED`);
  });
  
  breaker.on('halfOpen', () => {
    console.info(`[CircuitBreaker] ${config.name} HALF-OPEN`);
  });
  
  breaker.on('close', () => {
    console.info(`[CircuitBreaker] ${config.name} CLOSED`);
  });

  // Metrics (pentru SigNoz)
  breaker.on('success', () => {
    // Emit metric: circuit_breaker_success_total{name}
  });
  
  breaker.on('failure', () => {
    // Emit metric: circuit_breaker_failure_total{name}
  });

  return breaker;
}
```

### 3.3 Configurare per Provider

```typescript
// lib/circuit-breaker/config.ts
export const circuitBreakerConfigs: Record<string, CircuitBreakerConfig> = {
  // High reliability needed
  'anaf-api': {
    name: 'anaf-api',
    timeout: 30000,            // ANAF poate fi lent
    errorThresholdPercentage: 30,
    resetTimeout: 60000,       // Wait 1 min before retry
    volumeThreshold: 5,
  },
  
  // Medium reliability
  'termene-api': {
    name: 'termene-api',
    timeout: 15000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 10,
  },
  
  // Critical path
  'revolut-api': {
    name: 'revolut-api',
    timeout: 10000,
    errorThresholdPercentage: 20, // Trip fast for payments
    resetTimeout: 15000,
    volumeThreshold: 3,
  },
  
  // Non-critical
  'timelines-api': {
    name: 'timelines-api',
    timeout: 20000,
    errorThresholdPercentage: 60,
    resetTimeout: 45000,
    volumeThreshold: 20,
  },
};
```

### 3.4 Utilizare în Workers

```typescript
// workers/enrich/anaf-tva.worker.ts
import { createCircuitBreaker } from '@/lib/circuit-breaker/factory';
import { circuitBreakerConfigs } from '@/lib/circuit-breaker/config';
import { anafClient } from '@/lib/clients/anaf';

const anafBreaker = createCircuitBreaker(
  anafClient.getTvaStatus,
  circuitBreakerConfigs['anaf-api']
);

export async function processAnafTvaJob(job: Job) {
  const { cui } = job.data;
  
  try {
    // Circuit breaker wraps the API call
    const result = await anafBreaker.fire(cui);
    return result;
  } catch (error) {
    if (error.code === 'EOPENBREAKER') {
      // Circuit is open - fail fast
      throw new Error('ANAF API temporarily unavailable');
    }
    throw error;
  }
}
```

---

## 4. FALLBACK STRATEGIES

### 4.1 Cached Data Fallback

```typescript
anafBreaker.fallback(async (cui: string) => {
  // Try to return cached data
  const cached = await redis.get(`anaf:tva:${cui}`);
  if (cached) {
    return { ...JSON.parse(cached), fromCache: true };
  }
  throw new Error('No cached data available');
});
```

### 4.2 Degraded Service Fallback

```typescript
termeneBreaker.fallback(async (cui: string) => {
  // Return partial data when full service unavailable
  return {
    cui,
    status: 'unknown',
    enrichmentPending: true,
    message: 'Data will be enriched when service recovers',
  };
});
```

### 4.3 Queue for Later

```typescript
oblioBreaker.fallback(async (invoiceData) => {
  // Queue for retry later
  await retryQueue.add('oblio-retry', invoiceData, {
    delay: 300000, // 5 minutes
  });
  return { queued: true, retryAt: Date.now() + 300000 };
});
```

---

## 5. MONITORING & ALERTING

### 5.1 Prometheus Metrics

```typescript
// Register metrics
const circuitOpenGauge = new Gauge({
  name: 'circuit_breaker_open',
  help: 'Circuit breaker state (1=open, 0=closed)',
  labelNames: ['name'],
});

const circuitFailuresCounter = new Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total circuit breaker failures',
  labelNames: ['name', 'type'],
});
```

### 5.2 SigNoz Alerts

```yaml
# signoz-alerts.yaml
alerts:
  - name: CircuitBreakerOpen
    condition: circuit_breaker_open{name="anaf-api"} == 1
    duration: 5m
    severity: warning
    annotations:
      summary: "ANAF API circuit breaker is open"
      
  - name: CircuitBreakerFlapping
    condition: changes(circuit_breaker_open[10m]) > 5
    severity: critical
    annotations:
      summary: "Circuit breaker is flapping - unstable API"
```

---

## 6. BEST PRACTICES

### DO

- ✅ Configure different thresholds per API criticality
- ✅ Always provide fallback strategies
- ✅ Log state transitions pentru debugging
- ✅ Expose metrics pentru monitoring
- ✅ Test circuit breaker behavior în integration tests

### DON'T

- ❌ Use same config for all APIs
- ❌ Set timeout too low (false positives)
- ❌ Ignore HALF-OPEN state
- ❌ Forget to handle `EOPENBREAKER` exception

---

## 7. TESTING

```typescript
describe('Circuit Breaker', () => {
  it('should open after threshold failures', async () => {
    const breaker = createCircuitBreaker(
      async () => { throw new Error('API down'); },
      { ...config, volumeThreshold: 3, errorThresholdPercentage: 50 }
    );
    
    // Fail 3 times
    for (let i = 0; i < 3; i++) {
      await breaker.fire().catch(() => {});
    }
    
    expect(breaker.opened).toBe(true);
  });
  
  it('should use fallback when open', async () => {
    breaker.fallback(() => ({ fallback: true }));
    breaker.open(); // Force open
    
    const result = await breaker.fire();
    expect(result.fallback).toBe(true);
  });
});
```

---

## 8. DOCUMENTE CONEXE

- [Risks and Technical Debt](../architecture/risks-and-technical-debt.md) — TD-A02
- [Master Specification §2.7](../specifications/master-specification.md)
- [Worker Queue Inventory](../specifications/worker-queue-inventory.md)

---

**Actualizat:** 20 Ianuarie 2026
