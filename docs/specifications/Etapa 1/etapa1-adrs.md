# CERNIQ.APP — ETAPA 1: ARCHITECTURE DECISION RECORDS
## ADR-0031 până la ADR-0050
### Versiunea 1.0 | 15 Ianuarie 2026

---

# ADR-0031: Arhitectură Medallion Bronze-Silver-Gold

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Necesitatea structurării datelor în pipeline de enrichment multi-etapă cu trasabilitate completă.

**Decision:** Adoptăm arhitectura Medallion (Bronze → Silver → Gold):

- **Bronze Layer**: Date brute, append-only, imuabil, zero transformări
- **Silver Layer**: Date curățate, validate, deduplicate, partial enriched
- **Gold Layer**: Date complete, ready-for-outreach, cu scoring și FSM

**Consequences:**
- (+) Trasabilitate completă din source până la utilizare
- (+) Reprocessare posibilă de la orice punct
- (+) Separare clară responsabilități
- (-) Storage overhead (3x pentru date complete)
- (-) Complexitate pipeline

**Compliance:** GDPR Art.5(1)(e) - minimizare stocare prin TTL pe Bronze

---

# ADR-0032: Strategie Ingestie Multi-Source

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Date provin din surse multiple: CSV import, API webhooks, web scraping, manual entry.

**Decision:**

```typescript
// Unified ingestion interface
interface BronzeIngestionSource {
  sourceType: 'csv' | 'webhook' | 'scrape' | 'manual' | 'api';
  sourceIdentifier: string;  // filename, URL, endpoint
  rawPayload: Record<string, unknown>;
  ingestionTimestamp: Date;
  checksum: string;  // SHA-256 pentru deduplicare
}
```

Fiecare sursă are worker dedicat, toate scriu în `bronze_contacts` cu format unificat.

**Consequences:**
- (+) Flexibilitate adăugare surse noi
- (+) Deduplicare centralizată via checksum
- (+) Audit trail complet
- (-) Normalizare necesară în Silver layer

---

# ADR-0033: Validare CUI cu Modulo-11

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** CUI (Cod Unic de Identificare) este identificatorul fiscal unic românesc și trebuie validat algoritmic.

**Decision:** Implementăm validare Modulo-11 conform specificației ANAF:

```typescript
function validateCUI(cui: string): boolean {
  const cleaned = cui.replace(/^RO/i, '').trim();
  if (!/^\d{2,10}$/.test(cleaned)) return false;
  
  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  const digits = cleaned.padStart(10, '0').split('').map(Number);
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i];
  }
  
  const checkDigit = (sum * 10) % 11 % 10;
  return checkDigit === digits[9];
}
```

**Consequences:**
- (+) Validare offline fără API call
- (+) Filtrare CUI-uri invalide înainte de ANAF API
- (+) Economie rate limit ANAF

---

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

---

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

---

# ADR-0036: Email Discovery Strategy

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Necesitatea găsirii adreselor email pentru contacte business.

**Decision:** Multi-provider strategy:

1. **Hunter.io** (primary) - 15 req/sec, pattern discovery
2. **ZeroBounce** (verification) - 10 req/sec
3. **Web Scraping** (fallback) - Contact pages

Flow:
```
CUI/Domain → Hunter Pattern Discovery → Email Candidates → ZeroBounce Verify → Valid Email
```

**Consequences:**
- (+) Coverage rate ridicat
- (+) Validare email deliverability
- (-) Cost per verified email

---

# ADR-0037: Geocoding Strategy

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Adresele trebuie geocodate pentru proximity queries și zone agricole.

**Decision:**

1. **Primary:** Nominatim self-hosted (50 req/sec)
2. **Fallback:** Google Maps API (pentru adrese ambigue)
3. **PostGIS** pentru storage și queries spațiale

```sql
-- Spatial index pentru proximity queries
CREATE INDEX idx_gold_companies_geo 
ON gold_companies USING GIST (location_geography);

-- Query proximitate
SELECT * FROM gold_companies 
WHERE ST_DWithin(
  location_geography, 
  ST_GeographyFromText('POINT(26.1025 44.4268)'),
  50000  -- 50km radius
);
```

**Consequences:**
- (+) Queries spațiale performante
- (+) Zone agricole și clustering
- (-) Geocoding accuracy variabilă

---

# ADR-0038: Deduplicare Strategy

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Date din multiple surse pot conține duplicate cu variații minore.

**Decision:** Two-phase deduplication:

**Phase 1: Exact Match (Bronze)**
```typescript
// SHA-256 hash pe payload normalizat
const deduplicationHash = sha256(
  normalizeString(name) + '|' + 
  normalizePhone(phone) + '|' + 
  normalizeCUI(cui)
);
```

**Phase 2: Fuzzy Match (Silver)**
```typescript
// Levenshtein + Jaro-Winkler scoring
import fuzzball from 'fuzzball';

const similarity = fuzzball.WRatio(name1, name2);
const isSameCUI = cui1 === cui2;
const addressMatch = fuzzball.partial_ratio(addr1, addr2) > 80;

const isDuplicate = 
  isSameCUI || 
  (similarity > 85 && addressMatch);
```

**Consequences:**
- (+) Duplicate rate <1% în Gold
- (+) Entity resolution accuracy
- (-) CPU intensive pentru volume mari

---

# ADR-0039: Quality Scoring Algorithm

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Contactele necesită scoring pentru prioritizare și progresie pipeline.

**Decision:** Multi-dimensional scoring 0-100:

```typescript
interface QualityScore {
  completenessScore: number;  // Câmpuri populate
  accuracyScore: number;      // Validări trecute
  freshnessScore: number;     // Recența datelor
  enrichmentScore: number;    // Surse externe validate
  
  totalScore: number;         // Weighted average
}

const WEIGHTS = {
  completeness: 0.30,
  accuracy: 0.35,
  freshness: 0.15,
  enrichment: 0.20,
};

// Threshold pentru progresie
const BRONZE_TO_SILVER = 40;
const SILVER_TO_GOLD = 70;
```

**Consequences:**
- (+) Progresie automată bazată pe quality
- (+) Prioritizare outreach
- (+) KPI tracking

---

# ADR-0040: Pipeline Orchestration

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** 61 de workeri trebuie orchestrați cu dependențe și paralelism.

**Decision:** Event-driven orchestration cu BullMQ:

```typescript
// Pipeline stages
const PIPELINE_STAGES = [
  'INGEST',      // A: Bronze ingestion
  'NORMALIZE',   // B: Normalization
  'VALIDATE',    // C: CUI validation
  'ENRICH',      // D-L: External enrichment (parallel)
  'DEDUPE',      // M: Deduplication
  'SCORE',       // N: Quality scoring
  'AGGREGATE',   // O: Aggregation
  'PROMOTE',     // P: Layer promotion
];

// Event-driven triggers
worker.on('completed', async (job, result) => {
  const nextQueues = TRIGGER_MAP[job.queue.name];
  for (const queue of nextQueues) {
    await queue.add(job.data.entityId, {
      ...job.data,
      previousStage: job.queue.name,
    });
  }
});
```

**Consequences:**
- (+) Loose coupling între workeri
- (+) Paralelism maxim pentru enrichment
- (+) Replay și recovery easy

---

# ADR-0041: HITL Integration Etapa 1

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Anumite decizii necesită validare umană (data quality, deduplicare ambiguă).

**Decision:** 3 approval types pentru Etapa 1:

| Approval Type | Trigger | SLA Normal |
|---------------|---------|------------|
| `data_quality` | Quality score 40-60 | 24h |
| `dedup_review` | Fuzzy match 70-85% | 24h |
| `manual_enrich` | Missing critical fields | 48h |

```typescript
// HITL gate în worker
if (qualityScore >= 40 && qualityScore < 70) {
  await createApprovalTask({
    entityType: 'contact',
    entityId: contact.id,
    approvalType: 'data_quality',
    metadata: { qualityScore, missingFields },
  });
  
  // Job waiting for approval
  return { status: 'pending_approval' };
}
```

**Consequences:**
- (+) Calitate date garantată pentru Gold
- (+) Human oversight pentru edge cases
- (-) Latență pentru cazuri ambigue

---

# ADR-0042: Bronze Layer Immutability

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Bronze layer trebuie să fie sursa de adevăr pentru reprocessare.

**Decision:**

```sql
-- Bronze tables sunt append-only
CREATE TABLE bronze_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... columns ...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- NO updated_at - immutable!
);

-- Prevent UPDATE/DELETE
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Bronze tables are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bronze_immutable
BEFORE UPDATE OR DELETE ON bronze_contacts
FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

**Consequences:**
- (+) Trasabilitate 100%
- (+) Reprocessare oricând
- (-) Storage grows indefinitely (mitigate cu TTL)

---

# ADR-0043: Multi-Tenant Data Isolation

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Fiecare tenant are date izolate complet.

**Decision:** RLS (Row Level Security) pe toate tabelele:

```sql
-- Pattern pentru toate tabelele Etapa 1
ALTER TABLE bronze_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_bronze ON bronze_contacts
FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- UNIQUE constraints includ tenant_id
ALTER TABLE silver_companies 
ADD CONSTRAINT uq_silver_companies_cui 
UNIQUE (tenant_id, cui);
```

**Consequences:**
- (+) Izolare completă date
- (+) Imposibil data leak cross-tenant
- (-) UNIQUE constraints mai complexe

---

# ADR-0044: Event Sourcing pentru Enrichment

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Fiecare step de enrichment trebuie tracked pentru audit și replay.

**Decision:**

```sql
CREATE TABLE enrichment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL,  -- anaf, termene, hunter, etc.
  
  -- Event data
  payload JSONB NOT NULL,
  result_status VARCHAR(20),  -- success, failed, partial
  
  -- Idempotency
  idempotency_key VARCHAR(255) UNIQUE,
  
  -- Metadata
  correlation_id UUID,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrich_events_entity ON enrichment_events(entity_type, entity_id);
CREATE INDEX idx_enrich_events_correlation ON enrichment_events(correlation_id);
```

**Consequences:**
- (+) Audit trail complet
- (+) Replay posibil
- (+) Debugging facilitat

---

# ADR-0045: Rate Limiting Architecture

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

---

# ADR-0046: Web Scraping Strategy

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Unele date sunt disponibile doar pe site-uri publice (DAJ, ANIF, OUAI).

**Decision:** Playwright-based scraping cu stealth:

```typescript
import { chromium } from 'playwright';
import StealthPlugin from 'playwright-extra-plugin-stealth';

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});

// Respectăm robots.txt și ToS
// Rate limit: 1 req per 2 secunde per domain
// Cache rezultate 7 zile
```

**Consequences:**
- (+) Date publice accesibile
- (+) Automated și schedulat
- (-) Fragil la schimbări site
- (-) Legal considerations (public data only)

---

# ADR-0047: AI Structuring Pipeline

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Date nestructurate necesită parsing AI (PDF-uri, text liber).

**Decision:** xAI Grok-4 pentru structurare:

```typescript
const aiStructurePrompt = `
Extract structured data from the following text.
Return JSON with these fields:
- company_name
- cui
- address
- contact_person
- phone
- email

Text: {input}

JSON:
`;

// Rate limit: 60 req/min
// Fallback: Regex patterns
```

**Consequences:**
- (+) Handling date nestructurate
- (+) High accuracy pentru Romanian text
- (-) Cost per request
- (-) Latență AI call

---

# ADR-0048: Enrichment Priority Queue

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Unele contacte sunt mai importante și trebuie enriched prioritar.

**Decision:** Priority scoring pentru queue ordering:

```typescript
// Priority factors
const PRIORITY_WEIGHTS = {
  sourceQuality: 0.3,    // Import vs scrape
  dataCompleteness: 0.2, // Câmpuri populate
  businessSize: 0.3,     // Cifră afaceri estimată
  recentActivity: 0.2,   // Last interaction
};

// BullMQ priority (lower = higher priority)
const jobPriority = Math.floor((1 - normalizedScore) * 100);

await queue.add('enrich', data, { priority: jobPriority });
```

**Consequences:**
- (+) High-value contacts processed first
- (+) Better resource utilization
- (-) Low-priority poate stagna

---

# ADR-0049: Data Retention Policy

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** GDPR cerințe pentru data minimization și retention limits.

**Decision:**

| Layer | Retention | Action |
|-------|-----------|--------|
| Bronze | 30 zile | Auto-delete |
| Silver | 90 zile | Archive to cold storage |
| Gold | Indefinit | Review annual |
| Events | 365 zile | Archive compressed |

```sql
-- Automated cleanup job
CREATE OR REPLACE FUNCTION cleanup_old_bronze()
RETURNS void AS $$
BEGIN
  DELETE FROM bronze_contacts 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule daily
SELECT cron.schedule('cleanup-bronze', '0 3 * * *', 'SELECT cleanup_old_bronze()');
```

**Consequences:**
- (+) GDPR compliance
- (+) Storage optimizat
- (-) Reprocessare limitată temporal

---

# ADR-0050: Observability Stack Etapa 1

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Monitoring și debugging pentru 61 workeri.

**Decision:** SigNoz + custom metrics:

```typescript
// Custom metrics pentru Etapa 1
const metrics = {
  // Counters
  'etapa1.contacts.ingested': Counter,
  'etapa1.contacts.enriched': Counter,
  'etapa1.contacts.promoted': Counter,
  
  // Gauges
  'etapa1.queue.depth': Gauge,
  'etapa1.quality.average': Gauge,
  
  // Histograms
  'etapa1.enrichment.duration': Histogram,
  'etapa1.api.latency': Histogram,
};

// Alerting rules
const alerts = [
  { name: 'HighQueueDepth', condition: 'queue_depth > 10000', severity: 'warning' },
  { name: 'LowEnrichmentRate', condition: 'enriched_per_hour < 100', severity: 'critical' },
  { name: 'APIErrors', condition: 'error_rate > 5%', severity: 'critical' },
];
```

**Consequences:**
- (+) Visibility completă pipeline
- (+) Alerting proactiv
- (+) Debugging facilitat

---

**Document generat:** 15 Ianuarie 2026
**Total ADR-uri Etapa 1:** 20 (ADR-0031 → ADR-0050)
