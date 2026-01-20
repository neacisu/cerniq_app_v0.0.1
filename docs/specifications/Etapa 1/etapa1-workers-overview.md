# CERNIQ.APP — ETAPA 1: WORKERS OVERVIEW

## Arhitectură și Organizare 58 Workeri

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. ARHITECTURĂ GENERALĂ WORKERS

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CERNIQ ENRICHMENT PIPELINE                             │
│                              58 Workeri în 16 Categorii                          │
└─────────────────────────────────────────────────────────────────────────────────┘

 ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
 │     A      │   │     B      │   │     C      │   │   D-L      │
 │  INGESTIE  │──▶│ NORMALIZE  │──▶│  VALIDATE  │──▶│  ENRICH    │
 │  5 workers │   │  4 workers │   │  2 workers │   │ 33 workers │
 └────────────┘   └────────────┘   └────────────┘   └────────────┘
                                                          │
 ┌────────────────────────────────────────────────────────┘
 │
 ▼
 ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
 │     M      │   │     N      │   │     O      │   │     P      │
 │   DEDUP    │──▶│  QUALITY   │──▶│  AGREGATE  │──▶│  PIPELINE  │
 │  2 workers │   │  3 workers │   │  2 workers │   │  4 workers │
 └────────────┘   └────────────┘   └────────────┘   └────────────┘
```

---

## 2. CATALOG COMPLET CATEGORII

| Cat.  | Nume               | Workers | Cozi BullMQ          | Descriere                       |
| ----- | ------------------ | ------- | -------------------- | ------------------------------- |
| **A** | Ingestie Bronze    | 5       | `bronze:ingest:*`    | Import CSV, webhooks, scraping  |
| **B** | Normalizare        | 4       | `bronze:normalize:*` | Standardizare date              |
| **C** | Validare CUI       | 2       | `silver:validate:*`  | Validare algoritm modulo-11     |
| **D** | ANAF API           | 5       | `enrich:anaf:*`      | Date fiscale ANAF               |
| **E** | Termene.ro         | 4       | `enrich:termene:*`   | Date financiare                 |
| **F** | ONRC               | 3       | `enrich:onrc:*`      | Registrul Comerțului            |
| **G** | Email Enrichment   | 5       | `enrich:email:*`     | Hunter.io, ZeroBounce           |
| **H** | Telefon Enrichment | 3       | `enrich:phone:*`     | Validare, HLR lookup            |
| **I** | Web Scraping       | 4       | `enrich:scrape:*`    | DAJ, ANIF, websites             |
| **J** | AI Structuring     | 4       | `enrich:ai:*`        | Parsare AI, extraction          |
| **K** | Geocoding          | 3       | `enrich:geo:*`       | Nominatim, PostGIS              |
| **L** | Agricol            | 5       | `enrich:agri:*`      | APIA, OUAI, culturi             |
| **M** | Deduplicare        | 2       | `silver:dedup:*`     | Fuzzy match, merge              |
| **N** | Quality Scoring    | 3       | `silver:score:*`     | Completeness, accuracy          |
| **O** | Agregare           | 2       | `silver:aggregate:*` | Statistici, rollup              |
| **P** | Pipeline Control   | 4       | `pipeline:*`         | Orchestrare, monitoring         |
|       | **TOTAL**          | **58**  |                      |                                 |

---

## 3. CONVENȚII GENERALE

## 3.1 Queue Naming Pattern

```text
{layer}:{category}:{action}

Exemple:
- bronze:ingest:csv-parser      → Worker A.1
- enrich:anaf:fiscal-status     → Worker D.1
- silver:dedup:fuzzy-matcher    → Worker M.1
- pipeline:orchestrator:start   → Worker P.1
```

## 3.2 Job ID Pattern

```typescript
// Pattern: {action}-{entityType}-{entityId}-{timestamp}
const jobId = `enrich-company-${companyId}-${Date.now()}`;

// Pentru batch processing
const batchJobId = `batch-${batchId}-${Date.now()}`;
```

## 3.3 Worker Base Configuration

```typescript
// Configurare standard pentru toți workerii
interface WorkerBaseConfig {
  queueName: string;
  concurrency: number;        // Default: 10
  limiter?: {
    max: number;
    duration: number;         // ms
  };
  attempts: number;           // Default: 3
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number;           // ms
  };
  timeout: number;           // ms
  removeOnComplete: {
    age: number;             // 24h default
    count: number;           // 1000 default
  };
  observability: {
    serviceName: string;     // ex: cerniq-worker-enrichment
    enabled: boolean;        // true
  };
}
```

## 3.4 Error Handling Pattern

```typescript
interface WorkerError {
  code: string;
  message: string;
  retriable: boolean;
  metadata?: Record<string, unknown>;
}

// Erori standard
const ERROR_CODES = {
  RATE_LIMITED: { retriable: true, backoff: 'exponential' },
  API_ERROR: { retriable: true, backoff: 'exponential' },
  VALIDATION_ERROR: { retriable: false },
  NOT_FOUND: { retriable: false },
  TIMEOUT: { retriable: true, backoff: 'fixed' },
};
```

---

## 4. FLOW TRIGGER MATRIX

## 4.1 Trigger Dependencies

```text
A.1 (CSV Parser) ─────────────────┐
A.2 (Excel Parser) ───────────────┼──▶ B.1 (Name Normalizer)
A.3 (Webhook Handler) ────────────┤
A.4 (Manual Entry) ───────────────┤
A.5 (API Ingest) ─────────────────┘

B.1 (Name Normalizer) ────────────┐
B.2 (Address Normalizer) ─────────┼──▶ C.1 (CUI Validator)
B.3 (Phone Normalizer) ───────────┤
B.4 (Email Normalizer) ───────────┘

C.1 (CUI Validator) ──────────────┬──▶ D.1 (ANAF Fiscal)
                                  ├──▶ E.1 (Termene Balance)
                                  ├──▶ F.1 (ONRC Data)
                                  └──▶ K.1 (Geocoder)

[D-L workers complete] ───────────┬──▶ M.1 (Dedup Exact)
                                  └──▶ M.2 (Dedup Fuzzy)

M.1/M.2 (Dedup) ──────────────────┬──▶ N.1 (Completeness Score)
                                  └──▶ N.2 (Accuracy Score)

N.1/N.2 (Scores) ─────────────────┬──▶ O.1 (Stats Aggregator)
                                  └──▶ P.3 (Promotion Worker)

P.3 (Promotion) ──────────────────▶ [Gold Layer Ready]
```

## 4.2 Parallel Execution Groups

```typescript
// Grupa 1: Secvențial obligatoriu
const SEQUENTIAL_GROUP_1 = ['A.*', 'B.*', 'C.*'];

// Grupa 2: Paralel (enrichment extern)
const PARALLEL_GROUP_ENRICH = ['D.*', 'E.*', 'F.*', 'G.*', 'H.*', 'I.*', 'J.*', 'K.*', 'L.*'];

// Grupa 3: Secvențial post-enrichment
const SEQUENTIAL_GROUP_2 = ['M.*', 'N.*', 'O.*', 'P.*'];
```

---

## 5. RATE LIMITS PER CATEGORIE

| Categorie   | Provider       | Rate Limit | Burst | Strategy    |
|-------------|----------------|------------|-------|-------------|
| D (ANAF)    | ANAF API       | 1/sec      | 5     | Exponential |
| E (Termene) | Termene.ro     | 20/sec     | 50    | Linear      |
| G (Email)   | Hunter.io      | 15/sec     | 30    | Exponential |
| G (Email)   | ZeroBounce     | 10/sec     | 20    | Linear      |
| I (Scrape)  | Various        | 0.5/sec    | 2     | Fixed 2s    |
| J (AI)      | xAI Grok       | 60/min     | 10    | Exponential |
| K (Geo)     | Nominatim      | 50/sec     | 100   | Linear      |

---

## 6. HITL INTEGRATION POINTS

| Worker | HITL Trigger        | Approval Type   | SLA  |
|--------|---------------------|-----------------|------|
| M.2    | Fuzzy match 70-85%  | `dedup_review`  | 24h  |
| N.1    | Quality score 40-60 | `data_quality`  | 24h  |
| J.3    | Low confidence AI   | `manual_enrich` | 48h  |

---

## 7. MONITORING & ALERTING

## 7.1 Metrici per Worker

```typescript
interface WorkerMetrics {
  // Standard OTel Metrics (Auto-instrumented via @cerniq/observability)
  // - http_request_duration_seconds
  // - db_pool_connections
  // - process_cpu_seconds_total
  
  // Custom Business Metrics (via OTel Meter)
  jobs_processed_counter: Counter;
  jobs_failed_counter: Counter;
  queue_depth_gauge: Gauge;         // Exposed via Monitoring API Sidecar
}
```

## 7.2 Alerting Rules

```yaml
alerts:
  - name: WorkerQueueBacklog
    condition: queue_depth > 10000
    severity: warning
    
  - name: WorkerHighErrorRate
    condition: error_rate > 5%
    severity: critical
    
  - name: WorkerStalled
    condition: jobs_processed_1h == 0 AND queue_depth > 0
    severity: critical
    
  - name: APIRateLimited
    condition: rate_limited_count_1h > 100
    severity: warning
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2
