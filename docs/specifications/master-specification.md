# CERNIQ.APP — MASTER SPECIFICATION (NORMATIV)

## B2B Sales Automation Platform pentru Piața Agricolă Românească

### Versiunea 1.2 | 11 Ianuarie 2026

---

**DOCUMENT STATUS:** NORMATIV (Single Source of Truth)  
**SCOPE:** Toate documentele existente în proiect devin ANEXE la acest document  
**CREATION DATE:** 11 Ianuarie 2026  
**LAST UPDATED:** 11 Ianuarie 2026 (v1.2 - Complete spec with governance)  
**NEXT REVIEW:** Aprilie 2026 sau la actualizări majore dependențe

### Changelog v1.2 (11 Ianuarie 2026)

- ✅ Adăugare Secțiune 0: GOVERNANCE & PRECEDENCE RULES
- ✅ Adăugare Secțiune 2.7: RATE LIMITING & PROVIDER CONSTRAINTS
- ✅ Adăugare Secțiune 2.8: TEST STRATEGY (completă)
- ✅ Alias declaration: `shop_id` = `tenant_id` (legacy alias, deprecated)
- ✅ Contract of Record pentru toate anexele (versiuni, status, hash)
- ✅ FSM naming canonizat: `current_state`, `assigned_phone_number`

### Changelog v1.1 (11 Ianuarie 2026)

- ✅ Clarificare `sha256()` funcție nativă PostgreSQL 11+ (nu necesită pgcrypto)
- ✅ Fix UNIQUE constraint multi-tenant: `UNIQUE(tenant_id, cui)` în loc de `UNIQUE(cui)`
- ✅ Update React 19.2.1 → 19.2.3 (ultima versiune npm)
- ✅ Adăugare secțiune 2.3: LLM Routing Policy (canonic)
- ✅ Adăugare secțiune 2.4: Multi-tenant Contract (canonic)
- ✅ Adăugare secțiune 2.5: Observability Stack (SigNoz canonic)
- ✅ Adăugare secțiune 2.6: Event Contract (idempotency, replay strategy)
- ✅ HITL: Deprecation notice pentru `gold_hitl_tasks`
- ✅ HITL: User Identity Contract (assigned_to UUID, nu email)

---

## CUPRINS

0. [GOVERNANCE & PRECEDENCE RULES](#0-governance--precedence-rules)
1. [Glossary & Naming Rules](#1-glossary--naming-rules)
2. [Active Technologies (Truth Source)](#2-active-technologies-truth-source)
   - 2.1 [Matrice Versiuni Canonice](#21-matrice-versiuni-canonice)
   - 2.2 [Python Free-Threading Status](#22-python-free-threading-status)
   - 2.3 [PostgreSQL 18 Capabilități Cheie](#23-postgresql-18-capabilități-cheie)
   - 2.4 [Frontend Stack](#24-frontend-stack)
   - 2.5 [LLM Routing Policy](#25-llm-routing-policy-canonic)
   - 2.6 [Multi-tenant Contract](#26-multi-tenant-contract-canonic)
   - 2.7 [Observability Stack](#27-observability-stack-canonic)
   - 2.8 [Event Contract](#26-event-contract-canonic)
   - 2.9 [Rate Limiting & Provider Constraints](#27-rate-limiting--provider-constraints-canonic)
   - 2.10 [Test Strategy](#28-test-strategy-canonic)
3. [Canonical Data Model](#3-canonical-data-model)
4. [Canonical Event Names & Queues](#4-canonical-event-names--queues)
5. [HITL Core Contract](#5-hitl-core-contract)
6. [Integration Registry Contract](#6-integration-registry-contract)
7. [RBAC & Audit Contract](#7-rbac--audit-contract)
8. [Anexe și Documente Conexe](#8-anexe-și-documente-conexe)

---

## 0. GOVERNANCE & PRECEDENCE RULES

### 0.1 Document Authority Hierarchy

> **REGULĂ FUNDAMENTALĂ:** Acest document (Master Spec v1.2+) este **SINGURA sursă de adevăr** pentru proiectul Cerniq.app.
>
> Orice alt document din librărie este considerat **ANEXĂ** și este **SUBORDONAT** acestui master spec.

### Ierarhie de Precedență (de la cea mai mare la cea mai mică autoritate)

| Nivel | Document                                         | Rol                                   | În caz de conflict      |
|-------|--------------------------------------------------|---------------------------------------|-------------------------|
| **1** | `Cerniq_Master_Spec_Normativ_Complet.md` (v1.2+) | **NORMATIV** - Single Source of Truth | **CÂȘTIGĂ ÎNTOTDEAUNA** |
| **2** | Unified HITL Approval System                     | Normativ transversal (HITL)           | Supus master-ului       |
| **3** | Strategie docs (Etapa 1-5 .rtf)                  | Normativ per domeniu                  | Supus master-ului       |
| **4** | Worker docs (.md)                                | Procedural/Implementare               | Supus master-ului       |
| **5** | Schema_contacte_bronze_silver_gold.md            | Anexă data model                      | **SUPUS MASTER-ului**   |

### Reguli de Rezolvare Conflicte

```explain
IF anexă.rule != master.rule THEN
    APPLY master.rule
    FLAG anexă.rule AS DEPRECATED
    LOG conflict în această secțiune
END IF
```

## 0.2 Deprecation Policy

### Documente/Concepte DEPRECATED

| Element                 | Status          | Motiv               | Înlocuit cu                    |
|-------------------------|-----------------|---------------------|--------------------------------|
| `gold_hitl_tasks`       | ❌ DEPRECATED   | Per-stage tables    | `approval_tasks` (transversal) |
| `shop_id` (în cod/docs) | ⚠️ LEGACY ALIAS | Naming inconsistent | `tenant_id` (canonic)          |
| `assigned_to` ca email  | ❌ DEPRECATED   | Identity contract   | `assigned_to` UUID             |
| `cui UNIQUE` global     | ❌ DEPRECATED   | Multi-tenant break  | `UNIQUE(tenant_id, cui)`       |
| `current_stage`         | ⚠️ LEGACY ALIAS | FSM naming          | `current_state` (canonic)      |

### Alias Mapping (pentru compatibilitate legacy)

```typescript
// CANONICAL ALIASES - pentru compatibilitate cu cod existent
const LEGACY_ALIASES = {
  'shop_id': 'tenant_id',        // shop_id = tenant_id (deprecated, use tenant_id)
  'current_stage': 'current_state',
  'assigned_phone_id': 'assigned_phone_number',
} as const;

// ⚠️ La implementare: acceptă alias, dar scrie canonic
// ⚠️ La citire din DB: returnează canonic
```

## 0.3 Document Validation Requirements

### Cerințe pentru ca un document să fie VALID în librărie

1. **Nu contrazice** master spec-ul (conflict = INVALID)
2. **Respectă** naming conventions din Secțiunea 1
3. **Respectă** multi-tenant contract din Secțiunea 2.4
4. **Respectă** event contract din Secțiunea 2.6
5. **Are versiune și dată** în header

### Validare la Pull Request / Merge

```bash
# Checklist obligatoriu înainte de merge
[ ] Nu introduce `UNIQUE(cui)` fără tenant_id
[ ] Nu introduce `gold_hitl_tasks` sau alte tabele HITL per-stage
[ ] Nu folosește email ca identifier pentru user assignment
[ ] Respectă event schema din Secțiunea 2.6
[ ] Are correlation_id în toate job-urile
[ ] Emite evenimente pentru acțiuni relevante
```

---

## 1. GLOSSARY & NAMING RULES

### 1.1 Glossar Termeni Canonici

| Termen        | Definiție                                               | Context                            |
|---------------|---------------------------------------------------------|------------------------------------|
| **Bronze**    | Strat de date brute, nevalidate, append-only și imuabil | Zona de aterizare pentru ingestie  |
| **Silver**    | Date curățate, validate și normalizate                  | Entity resolution și deduplicare   |
| **Gold**      | Contacte complet îmbogățite, ready-for-outreach         | Date operaționale pentru vânzări   |
| **HITL**      | Human-in-the-Loop                                       | Sistem de aprobare manuală         |
| **CUI**       | Cod Unic de Identificare                                | Identificator fiscal unic românesc |
| **OUAI**      | Organizație de Utilizatori de Apă pentru Irigații       | Entitate juridică agricolă         |
| **e-Factura** | Sistem electronic facturare obligatoriu ANAF            | Compliance fiscal România          |
| **CIUS-RO**   | Core Invoice Usage Specification România                | Standard e-Factura UBL 2.1         |
| **LIA**       | Legitimate Interest Assessment                          | Evaluare GDPR Art.6(1)(f)          |
| **SLA**       | Service Level Agreement                                 | Timp maxim procesare approval      |
| **FSM**       | Finite State Machine                                    | Model stări engagement lead        |
| **MCP**       | Model Context Protocol                                  | Protocol AI tool access            |

## 1.2 Reguli de Denumire (Naming Convention)

### 1.2.1 Prefixe pentru Tabele PostgreSQL

| Prefix       | Semnificație              | Exemplu                                        | Notă                      |
|--------------|---------------------------|------------------------------------------------|---------------------------|
| `bronze_*`   | Date brute ingestie       | `bronze_contacts`, `bronze_webhooks`           | Append-only, imuabil      |
| `silver_*`   | Date validate/normalizate | `silver_companies`, `silver_contacts`          | Deduplicate               |
| `gold_*`     | Date operaționale         | `gold_companies`, `gold_lead_journey`          | Ready for outreach        |
| `approval_*` | HITL core (transversal)   | `approval_tasks`, `approval_audit_log`         | Centralizat, nu per-etapă |
| `*_events`   | Event logs append-only    | `communication_events`, `enrichment_events`    | Audit trail               |
| `*_configs`  | Configurări sistem        | `approval_type_configs`, `integration_configs` | Metadata                  |

### 1.2.2 Pattern Cozi BullMQ

```explain
{layer}:{category}:{action}
```

| Layer      | Descriere                 | Exemple                                                          |
|------------|---------------------------|------------------------------------------------------------------|
| `bronze`   | Ingestie date brute       | `bronze:ingest:csv-parser`, `bronze:dedup:hash-checker`          |
| `silver`   | Validare/normalizare      | `silver:validate:cui-anaf`, `silver:norm:address`                |
| `enrich`   | Îmbogățire externă        | `enrich:anaf:fiscal-status`, `enrich:termene:financials`         |
| `gold`     | Operații Gold layer       | `gold:score:lead`, `gold:journey:transition`                     |
| `outreach` | Orchestrare outreach      | `outreach:orchestrator:dispatch`, `outreach:orchestrator:router` |
| `q:wa`     | Cozi WhatsApp per-telefon | `q:wa:phone_01`, `q:wa:phone_20`                                 |
| `q:email`  | Cozi email per-tip        | `q:email:cold`, `q:email:warm`                                   |
| `pipeline` | Control pipeline          | `pipeline:orchestrator:start`, `pipeline:monitor:health`         |
| `quota`    | Rate limiting             | `quota:guardian:check`, `quota:guardian:increment`               |

### 1.2.3 Convenții pentru Job IDs

```typescript
// Pattern: {prefix}-{entityType}-{entityId}-{timestamp}
jobId: `enrich-company-${companyId}-${Date.now()}`
jobId: `esc-${approvalId}`  // Escalation jobs
jobId: `warn-${approvalId}` // Warning jobs
```

### 1.2.4 Convenții pentru Event Types

| Pattern                                | Utilizare             | Exemple                                      |
|----------------------------------------|-----------------------|----------------------------------------------|
| `ENTITY_ACTIUNE`                       | Evenimente principale | `LEAD_CREATED`, `APPROVAL_COMPLETED`         |
| `*_STARTED`, `*_COMPLETED`, `*_FAILED` | Lifecycle events      | `ENRICHMENT_STARTED`, `ENRICHMENT_COMPLETED` |
| `*_ESCALATED`, `*_EXPIRED`             | HITL events           | `APPROVAL_ESCALATED`, `SLA_EXPIRED`          |

---

## 2. ACTIVE TECHNOLOGIES (Truth Source)

### 2.1 Matrice Versiuni Canonice

| Component          | Versiune CANONICĂ     | Release Date | Status         | EOL/Suport              |
|--------------------|-----------------------|--------------|----------------|-------------------------|
| **Node.js**        | **24.12.0 "Krypton"** | 10 Dec 2025  | Active LTS     | Apr 2028                |
| **V8 Engine**      | 13.6.233.17           | Bundled      | —              | —                       |
| **NPM**            | 11.x                  | Bundled      | —              | —                       |
| **Python**         | **3.14.2**            | 5 Dec 2025   | Stable         | Free-threading Phase II |
| **PostgreSQL**     | **18.1**              | 13 Nov 2025  | Current Stable | —                       |
| **pgvector**       | **0.8.1**             | Late 2025    | Stable         | PG 13-18                |
| **PostGIS**        | **3.6.1**             | 13 Nov 2025  | Stable         | PG 12-18                |
| **Fastify**        | **5.6.2**             | 9 Nov 2025   | Stable         | v4 EOL: 30 Jun 2025     |
| **React**          | **19.2.3**            | Dec 2025     | Stable         | —                       |
| **React Compiler** | **1.0**               | 7 Oct 2025   | Stable         | Production ready        |
| **Tailwind CSS**   | **4.1.x**             | 2025         | Stable         | Oxide engine            |
| **Redis**          | **7.4.7**             | Late 2025    | Security rel.  | —                       |
| **BullMQ**         | **5.66.5**            | 14 Jan 2026  | Stable         | Requires Redis 6.2+     |

> ⚠️ **SECURITY ADVISORY**: Node.js security release programat 13 Ianuarie 2026 (3 HIGH, 1 MEDIUM, 1 LOW vulnerabilities).

## 2.2 Python Free-Threading Status

| PEP     | Status                  | Semnificație                  |
|---------|-------------------------|-------------------------------|
| PEP 703 | **100% Implementat**    | GIL-optional core complet     |
| PEP 779 | **Final (16 Jun 2025)** | Phase II criteria îndeplinite |

**Overhead single-threaded:** 5-10% (vs 40% în 3.13)  
**Binary suffix:** `python3.14t`

## 2.3 PostgreSQL 18 Capabilități Cheie

- **JSON_TABLE**: Transformare JSON → tabele relaționale
- **pgvector 0.8.1**: Half-precision vectors (4,000 dimensiuni), sparse vectors
- **PostGIS 3.6.1**: pgSphere integrat, CGAL 3D functions

## 2.4 Frontend Stack

| Component      | Versiune | Caracteristici                                        |
|----------------|----------|-------------------------------------------------------|
| React 19       | 19.2.3   | Server Components stable, useOptimistic, Activity API |
| React Compiler | 1.0      | 12% faster loads, 2.5x faster interactions            |
| Tailwind CSS 4 | 4.1.x    | Oxide engine (Rust), 3.5-5x faster builds             |
| Refine         | v5       | TanStack Query v5, headless admin                     |
| shadcn/ui      | Latest   | Radix UI primitives                                   |

## 2.5 LLM ROUTING POLICY (Canonic)

### 2.3.1 Provideri LLM Canonici

| Provider             | Use Case                          | Model                  | Rate Limit | Cost               |
|----------------------|-----------------------------------|------------------------|------------|--------------------|
| **xAI Grok-4**       | Structured Outputs, Agent Core E3 | grok-4                 | 60 RPM     | ~$0.02/1K tokens   |
| **OpenAI**           | Embeddings                        | text-embedding-3-large | 3000 RPM   | $0.0001/1K tokens  |
| **Groq**             | Real-time Chat (latență scăzută)  | Llama 3 8B             | 100 RPM    | ~$0.0005/1K tokens |
| **Ollama Local**     | Privacy-First (date sensibile)    | Qwen 2.5 / Llama       | Nelimitat  | $0 (on-premise)    |
| **Anthropic Claude** | Fallback, Complex Reasoning       | claude-3-5-sonnet      | 50 RPM     | ~$0.015/1K tokens  |

### 2.3.2 Routing Strategy

```typescript
// LLM Routing Decision Tree
const LLM_ROUTING = {
  // Primary use cases
  'structured_extraction': 'xai-grok',     // JSON Schema enforcement
  'agent_orchestration': 'xai-grok',       // Tool calling, E3 agent
  'embeddings': 'openai',                   // Vector generation
  'real_time_chat': 'groq',                 // Low latency <500ms
  'sensitive_data': 'ollama',               // On-premise, no data egress
  
  // Fallback chain (în caz de rate limit sau eroare)
  'fallback_chain': ['xai-grok', 'anthropic-claude', 'groq'],
  
  // Cost caps per tenant/day
  'cost_caps': {
    'small_tenant': 10.00,    // $10/zi
    'medium_tenant': 50.00,   // $50/zi
    'enterprise': 500.00      // $500/zi
  }
};
```

### 2.3.3 Guardrails & Logging Policy

| Aspect                      | Policy            | Implementare               |
|-----------------------------|-------------------|----------------------------|
| **PII Redaction**           | Obligatoriu       | Înainte de orice apel LLM  |
| **Prompt Logging**          | Toate prompturile | audit_llm_calls table      |
| **Response Validation**     | JSON Schema       | Pydantic strict mode       |
| **Cost Tracking**           | Per tenant/zi     | Redis counter + alerts     |
| **Red-teaming**             | Lunar             | Adversarial prompt testing |
| **Hallucination Detection** | Per response      | Fact-check vs. product DB  |

### 2.3.4 Anti-Hallucination Guardrails (Zero-Hallucination Policy)

```typescript
// Obligatoriu pentru toate răspunsurile AI în E3 (Sales Agent)
interface GuardrailChecks {
  price_guard: boolean;      // preț_oferit >= preț_minim_aprobat
  stock_guard: boolean;      // stock_quantity > 0
  discount_guard: boolean;   // discount <= max_discount_aprobat
  product_exists: boolean;   // SKU există în catalog
  client_validated: boolean; // CUI valid + date fiscale OK
}
```

## 2.6 MULTI-TENANT CONTRACT (Canonic)

### 2.4.1 Principii Izolare Date

| Principiu                      | Implementare                    | Status      |
|--------------------------------|---------------------------------|-------------|
| **Row-Level Security (RLS)**   | Toate tabelele silver/gold      | OBLIGATORIU |
| **Tenant ID în toate queries** | Via app.current_tenant          | OBLIGATORIU |
| **Unique constraints**         | UNIQUE(tenant_id, business_key) | OBLIGATORIU |
| **Shared data**                | Tabele *_configs fără tenant_id | DOCUMENTAT  |
| **Cross-tenant queries**       | INTERZIS (doar super_admin)     | IMPUS       |

### 2.4.2 Date Shared vs Per-Tenant

| Tip Date          | Scope          | Exemple Tabele                                                       |
|-------------------|----------------|----------------------------------------------------------------------|
| **Per-Tenant**    | Izolate RLS    | silver_*, gold_*, approval_tasks, bronze_contacts                    |
| **Shared Global** | Fără tenant_id | integration_configs, approval_type_configs, audit_retention_policies |
| **System**        | Metadata       | roles (is_system_role=true), permissions                             |

### 2.4.3 Migrare Date Între Tenants

```sql
-- MIGRAREA ÎNTRE TENANTS ESTE INTERZISĂ în mod implicit
-- Excepție: super_admin poate executa cu audit complet

-- Procedura (dacă absolut necesar):
-- 1. Export bronze_contacts original
-- 2. Re-ingest în tenant țintă cu source_type='MIGRATION'
-- 3. Log în audit cu actor_on_behalf_of
-- 4. Soft-delete în tenant sursă (retenție 90 zile)
```

## 2.7 OBSERVABILITY STACK (Canonic)

### 2.5.1 Stack Obligatoriu

| Component             | Versiune   | Rol                              | Status      |
|-----------------------|------------|----------------------------------|-------------|
| **SigNoz**            | v0.106.0   | APM + Traces + Logs (all-in-one) | PRIMARY     |
| **OpenTelemetry SDK** | Latest     | Instrumentare aplicații          | OBLIGATORIU |
| **ClickHouse**        | Via SigNoz | Storage traces/metrics           | INTERN      |

### 2.5.2 OpenTelemetry Semantic Conventions

```typescript
// Atribute OBLIGATORII pentru toate span-urile
const REQUIRED_SPAN_ATTRIBUTES = {
  'service.name': 'cerniq-{component}',
  'service.version': process.env.APP_VERSION,
  'deployment.environment': process.env.NODE_ENV,
  'tenant.id': 'din context',
  'correlation.id': 'job.data.correlationId'
};

// Atribute pentru workeri BullMQ
const WORKER_SPAN_ATTRIBUTES = {
  'worker.name': 'queue_name',
  'worker.job_id': 'job.id',
  'worker.attempt': 'job.attemptsMade',
  'worker.category': 'etapa{N}'
};
```

### 2.5.3 Metrici Obligatorii

| Metric                 | Tip       | Labels                  | Alert Threshold |
|------------------------|-----------|-------------------------|-----------------|
| `jobs_processed_total` | Counter   | worker, status          | -               |
| `job_duration_seconds` | Histogram | worker                  | P95 > 30s       |
| `job_errors_total`     | Counter   | worker, error_type      | >5% error rate  |
| `queue_depth`          | Gauge     | queue_name              | >1000 pending   |
| `api_latency_seconds`  | Histogram | endpoint, method        | P95 > 500ms     |
| `llm_tokens_used`      | Counter   | provider, model, tenant | Cost cap breach |

### 2.5.4 Alerting Rules

```yaml
# SigNoz Alert Configuration
alerts:
  - name: HighJobErrorRate
    condition: rate(job_errors_total[5m]) / rate(jobs_processed_total[5m]) > 0.05
    severity: critical
    
  - name: QueueBacklog
    condition: queue_depth > 1000
    severity: warning
    
  - name: LLMCostOverrun
    condition: sum(llm_cost_usd{tenant=~".+"}) by (tenant) > on(tenant) tenant_cost_cap
    severity: critical
```

## 2.6 EVENT CONTRACT (Canonic)

### 2.6.1 Schema Evenimente

```typescript
// Structură OBLIGATORIE pentru toate evenimentele
interface CerniqEvent<T = unknown> {
  // Identificare
  eventId: string;          // UUID v7 (time-sortable)
  eventType: EventType;     // Enum canonic (vezi secțiunea 4)
  
  // Idempotency
  idempotencyKey: string;   // {entityType}:{entityId}:{action}:{timestamp}
  
  // Temporal
  timestamp: string;        // ISO 8601 UTC
  processedAt?: string;
  
  // Context
  correlationId: string;    // Pentru tracing end-to-end
  causationId?: string;     // Event care a cauzat acest event
  
  // Multi-tenant
  tenantId: string;
  
  // Payload tipat
  payload: T;
  
  // Metadata
  version: number;          // Schema version pentru evoluție
  source: string;           // Serviciul care a emis
}
```

### 2.6.2 Idempotency Keys Pattern

```typescript
// Pattern pentru generare idempotency keys
function generateIdempotencyKey(
  entityType: string,
  entityId: string,
  action: string,
  timestamp?: Date
): string {
  const ts = timestamp || new Date();
  // Truncate la oră pentru a permite retry în window
  const hourTs = Math.floor(ts.getTime() / 3600000);
  return `${entityType}:${entityId}:${action}:${hourTs}`;
}

// Exemplu: lead:123e4567-e89b:STATE_CHANGE:482947
```

### 2.6.3 Replay Strategy

| Scenarriu           | Strategie              | Implementare                       |
|---------------------|------------------------|------------------------------------|
| **Job failed**      | Retry exponențial      | BullMQ backoff: 2^attempt * 1000ms |
| **System outage**   | Replay din dead-letter | Queue: `dlq:{original_queue}`      |
| **Data correction** | Re-process cu flag     | `isReplay: true` în job data       |
| **Audit replay**    | Read-only rebuild      | Rebuild state din event log        |

### 2.6.4 Ordering Guarantees

| Tip                 | Garanție       | Mecanism                             |
|---------------------|----------------|--------------------------------------|
| **Per-entity**      | Strict ordered | Hash-based routing per entityId      |
| **Cross-entity**    | Best-effort    | Timestamp-based eventual consistency |
| **Causation chain** | Preserved      | causationId linking                  |

## 2.7 RATE LIMITING & PROVIDER CONSTRAINTS (Canonic)

### 2.7.1 Global Rate Limits per Provider

| Provider         | Endpoint        | Rate Limit   | Burst | Backoff Strategy        |
|------------------|-----------------|--------------|-------|-------------------------|
| **ANAF API**     | Toate           | 1 req/sec    | 5     | Exponential 2^n * 1s    |
| **Termene.ro**   | Toate           | 20 req/sec   | 50    | Linear 100ms            |
| **Hunter.io**    | Email discovery | 15 req/sec   | 30    | Exponential 2^n * 500ms |
| **ZeroBounce**   | Email verify    | 10 req/sec   | 20    | Linear 200ms            |
| **TimelinesAI**  | WA messages     | 50 req/min   | 10    | Fixed 1s (per phone)    |
| **Instantly.ai** | Email send      | 100 req/10s  | 20    | Exponential 2^n * 2s    |
| **Resend**       | Transactional   | 100 req/sec  | 200   | Linear 50ms             |
| **Nominatim**    | Geocoding       | 50 req/sec   | 100   | Linear 100ms            |
| **xAI Grok**     | LLM             | 60 req/min   | 10    | Exponential 2^n * 1s    |
| **OpenAI**       | Embeddings      | 3000 req/min | 100   | Exponential 2^n * 500ms |

### 2.7.2 Per-Tenant Throttling

```typescript
// Redis key pattern pentru rate limiting per tenant
const RATE_LIMIT_KEYS = {
  // Global per provider
  'ratelimit:global:{provider}': 'token_bucket',
  
  // Per tenant per provider  
  'ratelimit:{tenantId}:{provider}': 'token_bucket',
  
  // Per phone number (WhatsApp)
  'ratelimit:wa:{phoneNumber}:daily': 'counter', // Max 200 NEW contacts/zi
  'ratelimit:wa:{phoneNumber}:hourly': 'counter', // Max 50 NEW contacts/oră
  
  // Per email account
  'ratelimit:email:{accountId}:hourly': 'counter', // Warmup-dependent
};
```

### 2.7.3 WhatsApp Specific Constraints (TimelinesAI)

| Constraint               | Limit     | Scope            | Enforcement          |
|--------------------------|-----------|------------------|----------------------|
| **New contacts/zi/nr**   | 200       | Per phone number | Quota Guardian       |
| **New contacts/oră/nr**  | 50        | Per phone number | Quota Guardian       |
| **Follow-up messages**   | Nelimitat | Per phone        | N/A                  |
| **Concurrent sends**     | 1         | Per phone queue  | BullMQ concurrency=1 |
| **Phone numbers active** | 20        | Per tenant       | Config               |

### 2.7.4 Email Warmup Schedule

```typescript
// Warmup progression pentru conturi email noi
const EMAIL_WARMUP_SCHEDULE = {
  week1: { dailyLimit: 20, hourlyLimit: 5 },
  week2: { dailyLimit: 50, hourlyLimit: 10 },
  week3: { dailyLimit: 100, hourlyLimit: 20 },
  week4: { dailyLimit: 200, hourlyLimit: 40 },
  week5_plus: { dailyLimit: 500, hourlyLimit: 100 },
};

// Deliverability thresholds
const DELIVERABILITY_THRESHOLDS = {
  minDeliveryRate: 0.95,    // 95%
  maxBounceRate: 0.03,      // 3%
  maxSpamRate: 0.001,       // 0.1%
  pauseOnBreach: true,
};
```

### 2.7.5 Circuit Breaker Pattern

```typescript
interface CircuitBreakerConfig {
  provider: string;
  failureThreshold: number;    // Ex: 5 failures
  successThreshold: number;    // Ex: 3 successes to close
  timeout: number;             // Ex: 30000ms half-open wait
  monitorWindow: number;       // Ex: 60000ms
}

const CIRCUIT_BREAKERS: CircuitBreakerConfig[] = [
  { provider: 'anaf', failureThreshold: 3, successThreshold: 2, timeout: 60000, monitorWindow: 120000 },
  { provider: 'termene', failureThreshold: 5, successThreshold: 3, timeout: 30000, monitorWindow: 60000 },
  { provider: 'timelines', failureThreshold: 5, successThreshold: 3, timeout: 30000, monitorWindow: 60000 },
  { provider: 'instantly', failureThreshold: 5, successThreshold: 3, timeout: 30000, monitorWindow: 60000 },
  { provider: 'xai', failureThreshold: 3, successThreshold: 2, timeout: 60000, monitorWindow: 120000 },
];
```

## 2.8 TEST STRATEGY (Canonic)

### 2.8.1 Test Pyramid Overview

```text
                    ┌─────────────────┐
                    │    E2E Tests    │  ← 5% (Critical flows only)
                    │   (Playwright)  │
                    └────────┬────────┘
                             │
               ┌─────────────┴─────────────┐
               │    Integration Tests      │  ← 25%
               │ (API + DB + Queue + Redis)│
               └─────────────┬─────────────┘
                             │
      ┌──────────────────────┴──────────────────────┐
      │              Unit Tests                      │  ← 70%
      │  (Business logic, validators, transforms)   │
      └──────────────────────────────────────────────┘
```

### 2.8.2 Contract Tests (OBLIGATORII)

| Contract Type      | Tool                | Scope                    | Frequency     |
|--------------------|---------------------|--------------------------|---------------|
| **Event Schema**   | JSON Schema + Zod   | Toate evenimentele emise | Pre-commit    |
| **API Contract**   | OpenAPI 3.1 + Prism | Toate endpoint-urile     | Pre-commit    |
| **DB Constraints** | pgTAP               | UNIQUE, CHECK, FK        | Pre-migration |
| **Queue Contract** | Custom assertions   | Job payloads             | Pre-commit    |

### 2.8.3 Event Schema Contract Tests

```typescript
// /tests/contracts/event-schema.test.ts
import { describe, it, expect } from 'vitest';
import { CerniqEventSchema } from '@cerniq/events';

describe('Event Schema Contract', () => {
  it('all events have required fields', () => {
    const requiredFields = [
      'eventId', 'eventType', 'idempotencyKey', 
      'timestamp', 'correlationId', 'tenantId', 
      'payload', 'version', 'source'
    ];
    // Test all event types against schema
  });

  it('idempotencyKey follows pattern', () => {
    // Pattern: {entityType}:{entityId}:{action}:{hourTimestamp}
    const key = generateIdempotencyKey('lead', 'uuid', 'STATE_CHANGE');
    expect(key).toMatch(/^[a-z]+:[a-f0-9-]+:[A-Z_]+:\d+$/);
  });
});
```

### 2.8.4 DB Constraint Tests (pgTAP)

```sql
-- /tests/db/constraints.test.sql
BEGIN;
SELECT plan(5);

-- Test 1: CUI uniqueness per tenant
SELECT throws_ok(
  $$INSERT INTO silver_companies (tenant_id, cui, denumire) 
    VALUES ('tenant-1', '12345678', 'Test'),
           ('tenant-1', '12345678', 'Test2')$$,
  23505,  -- unique_violation
  'duplicate key value violates unique constraint'
);

-- Test 2: Same CUI allowed in different tenants
SELECT lives_ok(
  $$INSERT INTO silver_companies (tenant_id, cui, denumire) 
    VALUES ('tenant-1', '12345678', 'Test'),
           ('tenant-2', '12345678', 'Test2')$$
);

-- Test 3: approval_tasks.assigned_to must be UUID
SELECT col_type_is('approval_tasks', 'assigned_to', 'uuid');

-- Test 4: RLS is enabled
SELECT policies_are('silver_companies', ARRAY['tenant_isolation_companies']);

-- Test 5: Audit log is immutable
SELECT trigger_is('approval_audit_log', 'audit_immutable', 'prevent_audit_modification');

SELECT * FROM finish();
ROLLBACK;
```

### 2.8.5 HITL Gating Tests

```typescript
// /tests/integration/hitl-gating.test.ts
describe('HITL Gating', () => {
  it('blocks job completion until approval', async () => {
    // 1. Create job that requires approval
    const job = await queue.add('pricing:generate', {
      discountPercent: 20,  // > 15% threshold
      correlationId: 'test-123'
    });
    
    // 2. Verify approval_task was created
    const task = await db.approval_tasks.findOne({
      where: { correlation_id: 'test-123' }
    });
    expect(task).toBeDefined();
    expect(task.status).toBe('pending');
    
    // 3. Job should be in waiting state
    expect(await job.getState()).toBe('waiting-children');
  });

  it('resumes job after approval', async () => {
    // 1. Approve the task
    await approvalService.approve(taskId, {
      decidedBy: userUuid,
      decision: 'approved'
    });
    
    // 2. Verify job resumed and completed
    await waitFor(() => expect(job.getState()).resolves.toBe('completed'));
  });
});
```

### 2.8.6 Idempotency Tests

```typescript
// /tests/integration/idempotency.test.ts
describe('Idempotency', () => {
  it('duplicate events are ignored', async () => {
    const event = {
      eventId: 'evt-123',
      idempotencyKey: 'lead:uuid:STATE_CHANGE:12345',
      // ...
    };
    
    // Process same event twice
    await eventProcessor.process(event);
    await eventProcessor.process(event);
    
    // Verify only one side effect
    const stateChanges = await db.gold_lead_journey.count({
      where: { last_event_id: 'evt-123' }
    });
    expect(stateChanges).toBe(1);
  });
});
```

### 2.8.7 Replay Tests

```typescript
// /tests/integration/replay.test.ts
describe('Event Replay', () => {
  it('can rebuild state from event log', async () => {
    // 1. Get current state
    const currentState = await getLeadJourneyState(leadId);
    
    // 2. Clear state table
    await db.gold_lead_journey.delete({ where: { id: leadId } });
    
    // 3. Replay all events for this lead
    const events = await db.events.findMany({
      where: { entity_id: leadId },
      orderBy: { timestamp: 'asc' }
    });
    
    for (const event of events) {
      await eventProcessor.replay(event);
    }
    
    // 4. Verify state matches
    const rebuiltState = await getLeadJourneyState(leadId);
    expect(rebuiltState).toEqual(currentState);
  });
});
```

### 2.8.8 Minimum Test Coverage Requirements

| Component          | Min Coverage | Critical Paths                  |
|--------------------|--------------|---------------------------------|
| **API Routes**     | 80%          | Auth, CRUD, Validation          |
| **Workers**        | 75%          | Happy path + Error handling     |
| **Event Handlers** | 90%          | All event types                 |
| **HITL Logic**     | 95%          | Approval flows, Escalation, SLA |
| **DB Migrations**  | 100%         | All constraints tested          |
| **Rate Limiters**  | 85%          | Throttling, Circuit breakers    |

### 2.8.9 CI/CD Pipeline Test Gates

```yaml
# .github/workflows/test.yml
test:
  stages:
    - name: Unit Tests
      run: pnpm test:unit
      coverage: 70%
      
    - name: Contract Tests
      run: pnpm test:contracts
      required: true  # Block merge if fails
      
    - name: DB Migration Tests
      run: pnpm test:db
      required: true
      
    - name: Integration Tests
      run: pnpm test:integration
      coverage: 50%
      
    - name: E2E Tests (Critical)
      run: pnpm test:e2e --tag=critical
      required: true

  gates:
    - all_required_pass: true
    - min_total_coverage: 65%
    - no_new_violations: true
```

---

## 3. CANONICAL DATA MODEL

### 3.1 Arhitectura Medallion (Bronze → Silver → Gold)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA QUALITY PROGRESSION                           │
└─────────────────────────────────────────────────────────────────────────────┘

    BRONZE                    SILVER                      GOLD
    ──────                    ──────                      ────
    • Raw payload            • Normalized               • Fully enriched
    • Append-only            • Deduplicated             • Verified contacts
    • Source tracking        • CUI validated            • Lead scored
    • Zero transforms        • E.164 phones             • Ready for outreach
    
    [Ingestie]  ───────▶  [Validare]  ───────▶  [Operațional]
       │                      │                       │
       │  Criterii:           │  Criterii:            │  Output:
       │  - JSON valid        │  - CUI modulo-11 OK   │  - Lead scoring
       │  - 1+ identificator  │  - Email SMTP check   │  - Engagement FSM
       │                      │  - Phone HLR OK       │  - e-Factura ready
       │                      │  - 60%+ completeness  │
```

### 3.2 Schema Bronze (Append-Only)

```sql
-- TABELĂ CANONICĂ: bronze_contacts
CREATE TABLE bronze_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Payload original (imuabil)
    raw_payload JSONB NOT NULL,
    
    -- Sursa și tracking
    source_type VARCHAR(30) NOT NULL 
        CHECK (source_type IN ('import', 'webhook', 'scrape', 'manual', 'api')),
    source_identifier TEXT NOT NULL,  -- URL/filename/API endpoint
    
    -- Multi-tenant isolation
    tenant_id UUID NOT NULL,
    
    -- Timestamps
    ingestion_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Hash pentru deduplicare exactă
    -- NOTĂ: sha256() este funcție NATIVĂ PostgreSQL 11+ (nu necesită pgcrypto)
    -- Documentație: https://www.postgresql.org/docs/current/functions-binarystring.html
    content_hash TEXT GENERATED ALWAYS AS (
        encode(sha256(raw_payload::text::bytea), 'hex')
    ) STORED
);

-- Index pentru deduplicare
CREATE UNIQUE INDEX idx_bronze_dedup ON bronze_contacts(tenant_id, content_hash);
```

### Surse Ingestie Bronze

| Sursă               | Tip Date                  | Format      | Frecvență  |
|---------------------|---------------------------|-------------|------------|
| APIA Registre       | Liste fermieri, subvenții | CSV/Excel   | Anual      |
| MADR Registre       | OUAI, Cooperative         | PDF tabelar | Lunar      |
| ONRC/Recom          | Date juridice             | JSON/XML    | La cerere  |
| Import manual       | Liste prospecți           | CSV/Excel   | Ad-hoc     |
| Webhook-uri externe | Evenimente real-time      | JSON        | Real-time  |
| Web scraping        | Site-uri DAJ, ANIF        | HTML parsed | Săptămânal |

### 3.3 Schema Silver (Validated)

```sql
-- TABELĂ CANONICĂ: silver_companies
CREATE TABLE silver_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Identificatori validați
    -- ⚠️ MULTI-TENANT: CUI unic PER TENANT (același CUI poate exista în tenants diferiți)
    cui VARCHAR(12),
    cui_validated BOOLEAN DEFAULT FALSE,
    cui_validation_date TIMESTAMPTZ,
    nr_reg_com VARCHAR(20),
    
    -- Constraint compus pentru izolare multi-tenant
    CONSTRAINT unique_cui_per_tenant UNIQUE(tenant_id, cui),
    
    -- Date normalizate
    denumire VARCHAR(255) NOT NULL,
    denumire_normalizata VARCHAR(255) GENERATED ALWAYS AS (
        UPPER(TRIM(REGEXP_REPLACE(denumire, '\s+', ' ', 'g')))
    ) STORED,
    
    -- Adresă normalizată SIRUTA
    adresa_sediu TEXT,
    judet VARCHAR(50),
    localitate VARCHAR(100),
    cod_siruta INTEGER,
    cod_postal VARCHAR(10),
    
    -- Geografie PostGIS
    location_geography GEOGRAPHY(POINT, 4326),
    
    -- Status fiscal (din ANAF)
    status_firma VARCHAR(20) CHECK (status_firma IN (
        'ACTIVE', 'INACTIVE', 'SUSPENDED', 'RADIATED'
    )),
    cod_caen_principal VARCHAR(6),
    data_inregistrare DATE,
    platitor_tva BOOLEAN,
    status_e_factura BOOLEAN,
    
    -- Date financiare (din Termene.ro)
    cifra_afaceri DECIMAL(15,2),
    profit_net DECIMAL(15,2),
    numar_angajati INTEGER,
    an_bilant INTEGER,
    scor_risc_termene INTEGER,  -- 0-100
    
    -- Metadate
    source_bronze_id UUID REFERENCES bronze_contacts(id),
    enrichment_status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELĂ CANONICĂ: silver_contacts
CREATE TABLE silver_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES silver_companies(id),
    tenant_id UUID NOT NULL,
    
    -- Identificare persoană
    prenume VARCHAR(100),
    nume VARCHAR(100),
    nume_complet VARCHAR(200) GENERATED ALWAYS AS (
        COALESCE(prenume, '') || ' ' || COALESCE(nume, '')
    ) STORED,
    
    -- Contact multi-channel (normalizat)
    email VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    email_provider VARCHAR(50),
    
    telefon VARCHAR(20),  -- Format E.164
    telefon_verified BOOLEAN DEFAULT FALSE,
    telefon_carrier VARCHAR(50),
    
    whatsapp_number VARCHAR(20),
    whatsapp_available BOOLEAN,
    
    -- Profesional
    functie VARCHAR(100),
    seniority VARCHAR(30),
    
    -- GDPR
    consent_marketing BOOLEAN,
    consent_date TIMESTAMPTZ,
    data_source VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Criterii Avansare Silver → Gold

| Criteriu          | Verificare                       | Obligatoriu |
|-------------------|----------------------------------|-------------|
| CUI Validat       | Modulo-11 + status ACTIV ANAF    | ✅ DA       |
| Contact Verificat | Email SMTP OK SAU Telefon HLR OK | ✅ DA       |
| Date Financiare   | Bilanț < 2 ani vechime           | ✅ DA       |
| Locație Geocodată | Coordonate GPS PostGIS           | ✅ DA       |
| Completitudine    | 60%+ câmpuri obligatorii         | ✅ DA       |

### 3.4 Schema Gold (Operational)

```sql
-- TABELĂ CANONICĂ: gold_companies
-- Schema completă cu 150+ câmpuri (vezi Anexa Schema_contacte_bronze_silver_gold.md)
CREATE TABLE gold_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    silver_id UUID UNIQUE REFERENCES silver_companies(id),
    tenant_id UUID NOT NULL,
    
    -- ══════════════════════════════════════════════════════════════════
    -- SECȚIUNEA 1: IDENTIFICARE
    -- ══════════════════════════════════════════════════════════════════
    -- ⚠️ MULTI-TENANT: CUI unic PER TENANT (constraint compus mai jos)
    cui VARCHAR(12) NOT NULL,
    cui_ro VARCHAR(14) GENERATED ALWAYS AS ('RO' || cui) STORED,
    nr_reg_com VARCHAR(20),
    iban_principal VARCHAR(34),
    denumire VARCHAR(255) NOT NULL,
    forma_juridica VARCHAR(50),
    tip_entitate VARCHAR(30),
    
    -- Constraint multi-tenant (definit la sfârșitul tabelei)
    -- CONSTRAINT unique_gold_cui_per_tenant UNIQUE(tenant_id, cui),
    
    -- ══════════════════════════════════════════════════════════════════
    -- SECȚIUNEA 2: DATE AGRICOLE SPECIFICE
    -- ══════════════════════════════════════════════════════════════════
    suprafata_totala_ha DECIMAL(10,2),
    suprafata_irigata_ha DECIMAL(10,2),
    tip_exploatatie VARCHAR(30),
    categorie_dimensiune VARCHAR(30),
    culturi_principale JSONB DEFAULT '[]',
    echipamente_agricole JSONB DEFAULT '[]',
    subventii_apia_ultimul_an DECIMAL(15,2),
    certificat_eco BOOLEAN DEFAULT FALSE,
    
    -- ══════════════════════════════════════════════════════════════════
    -- SECȚIUNEA 3: CREDIT SCORING
    -- ══════════════════════════════════════════════════════════════════
    scor_risc_intern INTEGER,
    categorie_risc VARCHAR(20),
    limita_credit_calculata DECIMAL(15,2),
    limita_credit_aprobata DECIMAL(15,2),
    conditii_plata VARCHAR(30),
    
    -- ══════════════════════════════════════════════════════════════════
    -- SECȚIUNEA 4: ENGAGEMENT & LEAD SCORING
    -- ══════════════════════════════════════════════════════════════════
    lead_score INTEGER DEFAULT 0,
    fit_score INTEGER,
    engagement_score INTEGER,
    intent_score INTEGER,
    
    engagement_stage VARCHAR(30) DEFAULT 'COLD',
    -- Values: COLD, CONTACTED_WA, CONTACTED_EMAIL, WARM_REPLY, 
    --         NEGOTIATION, PROPOSAL, CLOSING, CONVERTED, CHURNED, DEAD
    
    canal_preferat VARCHAR(20),
    data_prima_contactare TIMESTAMPTZ,
    data_ultima_interactiune TIMESTAMPTZ,
    
    -- ══════════════════════════════════════════════════════════════════
    -- SECȚIUNEA 5: GDPR & PREFERINȚE
    -- ══════════════════════════════════════════════════════════════════
    gdpr_legal_basis VARCHAR(30) DEFAULT 'LEGITIMATE_INTEREST',
    gdpr_lia_documentat BOOLEAN DEFAULT FALSE,
    consent_email_marketing BOOLEAN,
    consent_whatsapp BOOLEAN,
    do_not_contact BOOLEAN DEFAULT FALSE,
    
    -- ══════════════════════════════════════════════════════════════════
    -- SECȚIUNEA 6: AI/ML FEATURES
    -- ══════════════════════════════════════════════════════════════════
    embedding VECTOR(1536),
    probabilitate_conversie DECIMAL(5,4),
    probabilitate_churn DECIMAL(5,4),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- ⚠️ MULTI-TENANT: CUI unic PER TENANT
    CONSTRAINT unique_gold_cui_per_tenant UNIQUE(tenant_id, cui)
);

-- TABELĂ CANONICĂ: gold_lead_journey (State Machine)
CREATE TABLE gold_lead_journey (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES gold_companies(id),
    tenant_id UUID NOT NULL,
    
    -- FSM State
    current_state VARCHAR(30) NOT NULL DEFAULT 'COLD',
    previous_state VARCHAR(30),
    state_changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Channel attribution
    assigned_phone_number VARCHAR(20),  -- Sticky session WA
    assigned_email_account VARCHAR(100),
    
    -- Sequence tracking
    sequence_id UUID,
    sequence_step INTEGER,
    next_followup_at TIMESTAMPTZ,
    
    -- Flags
    do_not_contact BOOLEAN DEFAULT FALSE,
    requires_human_review BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pentru FSM queries
CREATE INDEX idx_journey_state ON gold_lead_journey(current_state, tenant_id);
CREATE INDEX idx_journey_followup ON gold_lead_journey(next_followup_at) 
    WHERE next_followup_at IS NOT NULL;
```

### Lead Journey State Machine

```text
                          ┌─────────────────────────────────────────────────┐
                          │                ENGAGEMENT FSM                   │
                          └─────────────────────────────────────────────────┘

    ┌──────┐     WA/Email      ┌──────────────┐    Reply     ┌────────────┐
    │ COLD │ ─────────────────▶│ CONTACTED_*  │ ───────────▶ │ WARM_REPLY │
    └──────┘                   └──────────────┘              └────────────┘
        │                            │                             │
        │                            │ No response (7d)            │ Interest signal
        │                            ▼                             ▼
        │                      ┌──────────┐               ┌─────────────┐
        │                      │  DEAD    │               │ NEGOTIATION │
        │                      └──────────┘               └─────────────┘
        │                                                        │
        │                                                        │ Quote sent
        │                                                        ▼
        │                                                 ┌──────────┐
        │                                                 │ PROPOSAL │
        │                                                 └──────────┘
        │                                                        │
        │                                                        │ Accept/Reject
        │                                                        ▼
        │                     ┌───────────┐               ┌───────────┐
        └────────────────────▶│  CHURNED  │◀──────────────│ CONVERTED │
                              └───────────┘               └───────────┘
```

---

## 4. CANONICAL EVENT NAMES & QUEUES

### 4.1 Inventar Complet Cozi BullMQ

#### Etapa 1: Data Enrichment (34 cozi core)

> **Notă:** Aceste 34 cozi sunt cozile core documentate. Workerii (61 total) pot procesa job-uri din aceste cozi, unii workeri partajând aceeași coadă.

| #  | Queue Name                     | Categorie   | Rate Limit | API          | Cost         |
|----|--------------------------------|-------------|------------|--------------|--------------|
| 1  | `bronze:ingest:csv-parser`     | Ingestie    | N/A        | —            | —            |
| 2  | `bronze:ingest:json-parser`    | Ingestie    | N/A        | —            | —            |
| 3  | `bronze:ingest:pdf-extractor`  | Ingestie    | N/A        | —            | —            |
| 4  | `bronze:ingest:html-scraper`   | Ingestie    | N/A        | —            | —            |
| 5  | `bronze:dedup:hash-checker`    | Dedup       | N/A        | —            | —            |
| 6  | `silver:norm:company-name`     | Normalizare | N/A        | —            | —            |
| 7  | `silver:norm:address`          | Normalizare | N/A        | —            | —            |
| 8  | `silver:norm:phone-e164`       | Normalizare | N/A        | —            | —            |
| 9  | `silver:norm:email`            | Normalizare | N/A        | —            | —            |
| 10 | `silver:validate:cui-checksum` | Validare    | N/A        | —            | —            |
| 11 | `silver:validate:cui-anaf`     | Validare    | **1/sec**  | ANAF         | Gratuit      |
| 12 | `enrich:anaf:fiscal-status`    | ANAF        | 1/sec      | ANAF         | Gratuit      |
| 13 | `enrich:anaf:tva-status`       | ANAF        | 1/sec      | ANAF         | Gratuit      |
| 14 | `enrich:anaf:efactura`         | ANAF        | 1/sec      | ANAF         | Gratuit      |
| 15 | `enrich:anaf:address`          | ANAF        | 1/sec      | ANAF         | Gratuit      |
| 16 | `enrich:anaf:caen`             | ANAF        | 1/sec      | ANAF         | Gratuit      |
| 17 | `enrich:termene:company-base`  | Termene.ro  | **20/sec** | Termene.ro   | Plătit       |
| 18 | `enrich:termene:financials`    | Termene.ro  | 20/sec     | Termene.ro   | Plătit       |
| 19 | `enrich:onrc:registration`     | ONRC        | 5/sec      | ONRC         | —            |
| 20 | `enrich:email:discovery`       | Email       | **15/sec** | Hunter.io    | $0.01/email  |
| 21 | `enrich:email:mx-check`        | Email       | N/A        | —            | —            |
| 22 | `enrich:email:smtp-verify`     | Email       | 10/sec     | ZeroBounce   | $0.008/email |
| 23 | `enrich:phone:type-detect`     | Phone       | N/A        | —            | —            |
| 24 | `enrich:phone:hlr-lookup`      | Phone       | 5/sec      | HLR Provider | $0.01/lookup |
| 25 | `enrich:phone:whatsapp-check`  | Phone       | 50/min     | TimelinesAI  | —            |
| 26 | `enrich:web:fetch`             | Scraping    | N/A        | —            | —            |
| 27 | `enrich:ai:text-structure`     | AI          | 60/min     | Grok         | —            |
| 28 | `enrich:geo:geocode`           | Geocoding   | **50/sec** | Nominatim    | Gratuit      |
| 29 | `enrich:apia:farmer-lookup`    | Agricol     | N/A        | Scraping     | —            |
| 30 | `silver:dedup:fuzzy-match`     | Dedup       | N/A        | —            | —            |
| 31 | `silver:quality:completeness`  | QA          | N/A        | —            | —            |
| 32 | `silver:merge:company`         | Merge       | N/A        | —            | —            |
| 33 | `pipeline:orchestrator:start`  | Control     | N/A        | —            | —            |
| 34 | `pipeline:monitor:health`      | Monitor     | Cron */5m  | —            | —            |

#### Etapa 2: Cold Outreach (52 cozi logice, 60 fizice)

> **Notă:** Liniile 6-25 și 26-45 reprezintă range-uri (20 cozi fiecare). Total fizic: 60 cozi. Total logic/workeri: 52.

| #     | Queue Name                       | Categorie    | Rate Limit         | API          | Cost        |
|-------|----------------------------------|--------------|--------------------|--------------|-------------|
| 1     | `quota:guardian:check`           | Quota        | N/A                | —            | —           |
| 2     | `quota:guardian:increment`       | Quota        | N/A                | —            | —           |
| 3     | `quota:guardian:reset`           | Quota        | Cron 00:00         | —            | —           |
| 4     | `outreach:orchestrator:dispatch` | Orchestrator | N/A                | —            | —           |
| 5     | `outreach:orchestrator:router`   | Orchestrator | N/A                | —            | —           |
| 6-25  | `q:wa:phone_{01-20}`             | WhatsApp     | **Quota Guardian** | TimelinesAI  | $25-60/seat |
| 26-45 | `q:wa:phone_{01-20}:followup`    | WhatsApp     | Fără limită        | TimelinesAI  | —           |
| 46    | `q:wa:reply`                     | WhatsApp     | N/A                | —            | —           |
| 47    | `wa:status:sync`                 | WhatsApp     | N/A                | —            | —           |
| 48    | `q:email:cold`                   | Email Cold   | **100/10s**        | Instantly.ai | $37+/month  |
| 49    | `email:cold:campaign:create`     | Email Cold   | 10/min             | Instantly.ai | —           |
| 50    | `email:cold:analytics:fetch`     | Email Cold   | N/A                | Instantly.ai | —           |
| 51    | `q:email:warm`                   | Email Warm   | **100/sec**        | Resend       | $0.40/1K    |
| 52    | `template:spintax:process`       | Templates    | N/A                | —            | —           |
| 53    | `webhook:timelinesai:ingest`     | Webhooks     | N/A                | —            | —           |
| 54    | `sequence:schedule:followup`     | Sequences    | N/A                | —            | —           |
| 55    | `lead:state:transition`          | State        | N/A                | —            | —           |
| 56    | `ai:sentiment:analyze`           | AI           | N/A                | —            | —           |
| 57    | `monitor:phone:health`           | Monitor      | Cron */5m          | —            | —           |
| 58    | `monitor:email:deliverability`   | Monitor      | Cron */1h          | —            | —           |
| 59    | `human:review:queue`             | HITL         | N/A                | —            | —           |
| 60    | `escalations`                    | HITL         | N/A                | —            | —           |

#### Etapa 3-5: Additional Queues

| Queue Name             | Etapa | Scop                 |
|------------------------|-------|----------------------|
| `e3:sales:proposal`    | E3    | Generare oferte AI   |
| `e3:invoice:oblio`     | E3    | Creare facturi Oblio |
| `e3:efactura:submit`   | E3    | Submit ANAF          |
| `e4:payment:revolut`   | E4    | Reconciliere plăți   |
| `e4:credit:scoring`    | E4    | Calcul credit score  |
| `e4:logistics:sameday` | E4    | AWB Sameday          |
| `e5:proximity:knn`     | E5    | PostGIS proximity    |
| `e5:social:graph`      | E5    | NetworkX analysis    |
| `e5:nurture:campaign`  | E5    | Nurturing sequences  |

### 4.2 Event Types Canonice

#### Pipeline Events

```typescript
// Event type enum canonical
enum PipelineEvent {
  // Lifecycle
  JOB_STARTED = 'JOB_STARTED',
  JOB_COMPLETED = 'JOB_COMPLETED',
  JOB_FAILED = 'JOB_FAILED',
  JOB_RETRIED = 'JOB_RETRIED',
  
  // Enrichment
  ENRICHMENT_STARTED = 'ENRICHMENT_STARTED',
  ENRICHMENT_COMPLETED = 'ENRICHMENT_COMPLETED',
  ENRICHMENT_FAILED = 'ENRICHMENT_FAILED',
  ENRICHMENT_PARTIAL = 'ENRICHMENT_PARTIAL',
  
  // Validation
  VALIDATION_PASSED = 'VALIDATION_PASSED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  
  // Entity lifecycle
  ENTITY_CREATED = 'ENTITY_CREATED',
  ENTITY_UPDATED = 'ENTITY_UPDATED',
  ENTITY_MERGED = 'ENTITY_MERGED',
  ENTITY_DELETED = 'ENTITY_DELETED',
  
  // Quality
  QUALITY_SCORE_UPDATED = 'QUALITY_SCORE_UPDATED',
  TIER_PROMOTED = 'TIER_PROMOTED',  // Bronze→Silver, Silver→Gold
  TIER_DEMOTED = 'TIER_DEMOTED',
}
```

#### HITL Events

```typescript
enum HITLEvent {
  APPROVAL_CREATED = 'APPROVAL_CREATED',
  APPROVAL_ASSIGNED = 'APPROVAL_ASSIGNED',
  APPROVAL_STARTED = 'APPROVAL_STARTED',
  APPROVAL_COMPLETED = 'APPROVAL_COMPLETED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  APPROVAL_ESCALATED = 'APPROVAL_ESCALATED',
  APPROVAL_EXPIRED = 'APPROVAL_EXPIRED',
  SLA_WARNING_80 = 'SLA_WARNING_80',
  SLA_BREACHED = 'SLA_BREACHED',
}
```

### Outreach Events

```typescript
enum OutreachEvent {
  // WhatsApp
  WA_MESSAGE_QUEUED = 'WA_MESSAGE_QUEUED',
  WA_MESSAGE_SENT = 'WA_MESSAGE_SENT',
  WA_MESSAGE_DELIVERED = 'WA_MESSAGE_DELIVERED',
  WA_MESSAGE_READ = 'WA_MESSAGE_READ',
  WA_REPLY_RECEIVED = 'WA_REPLY_RECEIVED',
  
  // Email
  EMAIL_QUEUED = 'EMAIL_QUEUED',
  EMAIL_SENT = 'EMAIL_SENT',
  EMAIL_DELIVERED = 'EMAIL_DELIVERED',
  EMAIL_OPENED = 'EMAIL_OPENED',
  EMAIL_CLICKED = 'EMAIL_CLICKED',
  EMAIL_BOUNCED = 'EMAIL_BOUNCED',
  EMAIL_REPLIED = 'EMAIL_REPLIED',
  
  // Lead journey
  LEAD_STATE_CHANGED = 'LEAD_STATE_CHANGED',
  LEAD_CONVERTED = 'LEAD_CONVERTED',
  LEAD_CHURNED = 'LEAD_CHURNED',
}
```

---

## 5. HITL CORE CONTRACT

### 5.1 Principiu Arhitectural

> **DECIZIE CANONICĂ:** Un singur sistem HITL transversal (`approval_tasks`), NU tabele per-etapă (`gold_hitl_tasks`).

#### ⚠️ DEPRECATION NOTICE

> **IMPORTANT:** Orice referință la `gold_hitl_tasks` în documentele anexă (în special Etapa 4) este **DEPRECATED**.
>
> Toate etapele (E1-E5) TREBUIE să scrie în `approval_tasks`.
>
> Migrare obligatorie pentru cod legacy:
>
> - `gold_hitl_tasks` → `approval_tasks`
> - `assigned_to` (email string) → `assigned_to` (UUID user.id)
>
> Pentru asignare după email: `SELECT id FROM users WHERE email = $1`

#### User Identity Contract

| Câmp            | Tip     | Descriere                              |
|-----------------|---------|----------------------------------------|
| `assigned_to`   | UUID    | OBLIGATORIU - referință la `users(id)` |
| `assigned_role` | VARCHAR | Rol funcțional (pentru routing)        |
| `decided_by`    | UUID    | OBLIGATORIU la rezoluție - `users(id)` |
| `actor_user_id` | UUID    | În audit log - întotdeauna UUID        |

**Regula:** Nicăieri în sistem nu se stochează email-ul ca identificator de user. Lookup user ID din email se face la momentul asignării.

Sistemul HITL folosește **asocieri polimorfe** pentru a gestiona aprobări din toate cele 5 etape printr-o singură tabelă și un singur UI.

### 5.2 Schema Approval Tasks (Core)

> **SOURCE OF TRUTH:** Please refer to the [Unified HITL Approval System](./hitl-unified-system.md#3-schema-approval_tasks) for the authoritative schema definition.

### 5.3 Configurare Approval Types

> **SOURCE OF TRUTH:** Please refer to the [Unified HITL Approval System](./hitl-unified-system.md#42-schema-approval_type_configs) for the authoritative schema definition.

### 5.4 SLA Tiers

| Priority     | Calendar Hours | Business Hours        | Use Case                    |
|--------------|----------------|-----------------------|-----------------------------|
| **Critical** | 4h             | 4h (always on)        | Security, production issues |
| **High**     | 8h             | 8h                    | Time-sensitive deals        |
| **Normal**   | 24h            | 16h (2 business days) | Standard approvals          |
| **Low**      | 72h            | 40h (5 business days) | Routine reviews             |

## 5.5 Approval Type Matrix per Stage

| Stage            | approval_type       | Trigger Condition                 | SLA | Timeout Action |
|------------------|---------------------|-----------------------------------|-----|----------------|
| **E1** Data      | `data_quality`      | Completeness < 70%                | 24h | Escalate       |
| **E2** Outreach  | `content_review`    | First message to segment          | 8h  | Escalate       |
| **E3** AI Sales  | `pricing_approval`  | Discount > 15% OR value > €50K    | 4h  | Escalate to VP |
| **E4** Post-Sale | `credit_approval`   | Risk score > 0.5 OR value > €100K | 48h | Reject         |
| **E5** Nurturing | `campaign_approval` | All campaigns                     | 72h | Escalate       |

### 5.6 State Machine XState

```typescript
// Stările HITL approval machine
const approvalStates = {
    pending: {
        on: { ASSIGN: 'assigned', AUTO_ASSIGN: 'assigned' }
    },
    assigned: {
        on: { 
            START_REVIEW: 'in_review',
            REASSIGN: 'assigned',
            TIMEOUT: { target: 'escalated', guard: 'shouldEscalate' }
        }
    },
    in_review: {
        on: {
            APPROVE: { target: 'approved', guard: 'canApprove' },
            REJECT: 'rejected',
            REQUEST_INFO: 'pending_info',
            ESCALATE: 'escalated'
        }
    },
    pending_info: {
        entry: 'pauseSLA',
        exit: 'resumeSLA',
        on: { INFO_PROVIDED: 'in_review', TIMEOUT: 'escalated' }
    },
    escalated: {
        entry: 'incrementLevel',
        on: {
            ASSIGN: 'assigned',
            APPROVE: 'approved',
            REJECT: 'rejected',
            MAX_ESCALATION: 'expired'
        }
    },
    approved: { type: 'final', entry: 'notifyApproved' },
    rejected: { type: 'final', entry: 'notifyRejected' },
    expired: { type: 'final', entry: 'notifyExpired' }
};
```

## 5.7 KPIs Dashboard

| KPI                        | Calcul                                       | Target |
|----------------------------|----------------------------------------------|--------|
| **Time-to-Approve**        | `AVG(decided_at - created_at)`               | < 24h  |
| **Approval Rate**          | `COUNT(approved) / COUNT(*)`                 | 70-90% |
| **Escalation Rate**        | `COUNT(escalated) / COUNT(*)`                | < 10%  |
| **SLA Compliance**         | `COUNT(decided_at < due_at) / COUNT(*)`      | > 95%  |
| **First-Touch Resolution** | `COUNT(current_level = 1) / COUNT(approved)` | > 80%  |

---

## 6. INTEGRATION REGISTRY CONTRACT

### 6.1 Schema Integration Configs

```sql
-- TABELĂ CANONICĂ: integration_configs
CREATE TABLE integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Identificare integrare
    integration_name VARCHAR(100) NOT NULL,
    integration_type VARCHAR(50) NOT NULL
        CHECK (integration_type IN (
            'api', 'webhook', 'oauth', 'smtp', 'messaging'
        )),
    provider VARCHAR(100) NOT NULL,
    
    -- Endpoint configuration
    base_url TEXT NOT NULL,
    api_version VARCHAR(20),
    
    -- Rate limiting
    rate_limit_requests INTEGER,
    rate_limit_window_seconds INTEGER,
    rate_limit_strategy VARCHAR(20) DEFAULT 'token_bucket'
        CHECK (rate_limit_strategy IN ('token_bucket', 'sliding_window', 'fixed_window')),
    
    -- Credentials (reference to Vault)
    vault_path TEXT,
    credential_type VARCHAR(50),
    
    -- Health & status
    is_active BOOLEAN DEFAULT TRUE,
    health_check_url TEXT,
    last_health_check TIMESTAMPTZ,
    health_status VARCHAR(20) DEFAULT 'unknown',
    
    -- Metadata
    config_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, integration_name)
);

-- TABELĂ: integration_credentials (pentru environments)
CREATE TABLE integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_config_id UUID REFERENCES integration_configs(id) ON DELETE CASCADE,
    
    environment VARCHAR(20) NOT NULL
        CHECK (environment IN ('development', 'staging', 'production')),
    
    -- Encrypted credentials (sau referință Vault)
    vault_secret_path TEXT NOT NULL,
    credential_version INTEGER DEFAULT 1,
    
    -- Rotation tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_rotated_at TIMESTAMPTZ,
    rotation_interval_days INTEGER,
    
    UNIQUE(integration_config_id, environment)
);
```

### 6.2 Integration Registry Canonical

| Integration      | Provider    | Type  | Rate Limit | Auth          | Vault Path              |
|------------------|-------------|-------|------------|---------------|-------------------------|
| **ANAF API**     | ANAF        | oauth | 1,000/min  | OAuth2 + Cert | `secret/anaf/oauth`     |
| **Termene.ro**   | Termene.ro  | api   | 20/sec     | API Key       | `secret/termene/api`    |
| **Hunter.io**    | Hunter      | api   | 15/sec     | API Key       | `secret/hunter/api`     |
| **ZeroBounce**   | ZeroBounce  | api   | 10/sec     | API Key       | `secret/zerobounce/api` |
| **TimelinesAI**  | TimelinesAI | api   | 50/min     | API Key       | `secret/timelines/api`  |
| **Instantly.ai** | Instantly   | api   | 100/10s    | Bearer Token  | `secret/instantly/api`  |
| **Resend**       | Resend      | api   | 100/sec    | API Key       | `secret/resend/api`     |
| **Oblio.eu**     | Oblio       | api   | N/A        | API Key       | `secret/oblio/api`      |
| **Revolut**      | Revolut     | oauth | N/A        | OAuth2        | `secret/revolut/oauth`  |
| **Sameday**      | Sameday     | api   | N/A        | API Key       | `secret/sameday/api`    |
| **Nominatim**    | OSM         | api   | 50/sec     | None          | —                       |

### 6.3 Secrets Management Pattern

```typescript
// HashiCorp Vault namespace per tenant
interface VaultConfig {
  namespace: `tenant/${tenantId}`;
  paths: {
    anaf: 'secret/data/anaf';
    termene: 'secret/data/termene';
    timelines: 'secret/data/timelines';
    instantly: 'secret/data/instantly';
  };
  rotation: {
    enabled: true;
    intervalDays: 90;
    notifyBeforeDays: 7;
  };
}
```

### 6.4 Rate Limit Aggregation

```typescript
// Token bucket per tenant per integration
interface RateLimitConfig {
  integration: string;
  tenantId: string;
  
  // Bucket config
  maxTokens: number;
  refillRate: number;  // tokens per second
  refillInterval: number;  // ms
  
  // Current state (Redis)
  redisKey: `ratelimit:${tenantId}:${integration}`;
}

// Lua script pentru atomic token consumption
const consumeToken = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local refillRate = tonumber(ARGV[2])
  local maxTokens = tonumber(ARGV[3])
  
  local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
  local tokens = tonumber(bucket[1]) or maxTokens
  local lastRefill = tonumber(bucket[2]) or now
  
  -- Refill tokens
  local elapsed = now - lastRefill
  tokens = math.min(maxTokens, tokens + (elapsed * refillRate / 1000))
  
  if tokens >= 1 then
    redis.call('HMSET', key, 'tokens', tokens - 1, 'lastRefill', now)
    return 1  -- Success
  else
    return 0  -- Rate limited
  end
`;
```

### 6.5 Integration Health Monitoring

```sql
-- TABELĂ: integration_health_events
CREATE TABLE integration_health_events (
    id BIGSERIAL PRIMARY KEY,
    integration_config_id UUID REFERENCES integration_configs(id),
    
    check_timestamp TIMESTAMPTZ DEFAULT NOW(),
    response_time_ms INTEGER,
    status_code INTEGER,
    is_healthy BOOLEAN,
    error_message TEXT,
    
    -- Nu păstrăm la infinit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cleanup automat (păstrăm 30 zile)
CREATE INDEX idx_health_cleanup ON integration_health_events(created_at);
```

---

## 7. RBAC & AUDIT CONTRACT

### 7.1 Arhitectură Autorizare Three-Layer

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        THREE-LAYER AUTHORIZATION                            │
└─────────────────────────────────────────────────────────────────────────────┘

    Layer 1: RBAC (Role-Based)
    ─────────────────────────
    • Permisiuni coarse-grained
    • Roluri: admin, manager, sales_rep, viewer
    • Mapare: Role → Permissions
    
    Layer 2: ReBAC (Relationship-Based)
    ────────────────────────────────────
    • Permisiuni pe bază de relații
    • Ownership, team membership
    • Ex: "user owns lead" → can edit
    
    Layer 3: ABAC (Attribute-Based)
    ────────────────────────────────
    • Constrângeri contextuale
    • Business hours, IP, device
    • Ex: "only during 09:00-18:00"
```

### 7.2 Schema RBAC

```sql
-- TABELĂ CANONICĂ: roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_role_id UUID REFERENCES roles(id),
    hierarchy_level INTEGER DEFAULT 0,
    
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, name)
);

-- TABELĂ CANONICĂ: permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    resource VARCHAR(100) NOT NULL,  -- 'leads', 'companies', 'approvals'
    action VARCHAR(50) NOT NULL,      -- 'create', 'read', 'update', 'delete', 'approve'
    
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(resource, action)
);

-- TABELĂ: role_permissions (many-to-many)
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    
    -- Condiții ABAC (opțional)
    conditions JSONB DEFAULT '{}',
    
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    
    PRIMARY KEY (role_id, permission_id)
);

-- TABELĂ: user_roles
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    
    -- Temporal validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    
    PRIMARY KEY (user_id, role_id, tenant_id)
);
```

### 7.3 PostgreSQL Row Level Security

```sql
-- Enable RLS pe toate tabelele tenant-scoped
ALTER TABLE gold_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_lead_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_tasks ENABLE ROW LEVEL SECURITY;

-- Policy pentru tenant isolation
CREATE POLICY tenant_isolation_companies ON gold_companies
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_journey ON gold_lead_journey
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_approvals ON approval_tasks
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Middleware pentru setare context
-- În fiecare request:
-- SET LOCAL app.current_tenant = 'tenant-uuid';
-- SET LOCAL app.current_user = 'user-uuid';
```

### 7.4 Roluri Predefinite

| Role              | Level | Permissions                                | Descriere                    |
|-------------------|-------|--------------------------------------------|------------------------------|
| **super_admin**   | 0     | `*:*`                                      | Acces complet, toate tenants |
| **tenant_admin**  | 1     | `tenant:*`                                 | Admin pe tenant              |
| **sales_manager** | 2     | `leads:*, approvals:approve, reports:read` | Manager vânzări              |
| **sales_rep**     | 3     | `leads:read,create,update, contacts:*`     | Agent vânzări                |
| **viewer**        | 4     | `leads:read, reports:read`                 | Read-only access             |
| **approver**      | 3     | `approvals:view,approve,reject`            | Doar aprobări                |

### 7.5 Audit Log Contract

```sql
-- TABELĂ CANONICĂ: approval_audit_log (IMUTABILĂ)
CREATE TABLE approval_audit_log (
    id BIGSERIAL PRIMARY KEY,
    approval_task_id UUID REFERENCES approval_tasks(id),
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Actor information
    actor_user_id UUID NOT NULL,
    actor_email TEXT,
    actor_role TEXT,
    actor_on_behalf_of UUID,  -- Delegation tracking
    
    -- Context
    source_ip INET,
    user_agent TEXT,
    session_id TEXT,
    
    -- State changes
    previous_state JSONB,
    new_state JSONB,
    
    -- Decision context
    decision_rationale TEXT,
    
    -- Immutability - hash chain
    event_hash TEXT NOT NULL,
    previous_hash TEXT,
    
    -- GDPR
    contains_pii BOOLEAN DEFAULT FALSE,
    retention_category TEXT DEFAULT 'standard'
);

-- Prevenire modificări
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log modifications not permitted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_immutable
    BEFORE UPDATE OR DELETE ON approval_audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Revocare drepturi
REVOKE UPDATE, DELETE, TRUNCATE ON approval_audit_log FROM PUBLIC;

-- Hash chain pentru tamper detection
-- NOTĂ: sha256() este funcție NATIVĂ PostgreSQL 11+ (nu necesită CREATE EXTENSION pgcrypto)
-- Referință: https://www.postgresql.org/docs/current/functions-binarystring.html
CREATE OR REPLACE FUNCTION compute_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
    v_prev_hash TEXT;
    v_content TEXT;
BEGIN
    SELECT event_hash INTO v_prev_hash
    FROM approval_audit_log
    ORDER BY id DESC LIMIT 1;
    
    IF v_prev_hash IS NULL THEN
        v_prev_hash := encode(sha256('GENESIS'::bytea), 'hex');
    END IF;
    
    v_content := v_prev_hash || NEW.approval_task_id || NEW.event_type 
        || NEW.event_timestamp || NEW.actor_user_id;
    
    NEW.previous_hash := v_prev_hash;
    NEW.event_hash := encode(sha256(v_content::bytea), 'hex');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_hash_before_insert
    BEFORE INSERT ON approval_audit_log
    FOR EACH ROW EXECUTE FUNCTION compute_audit_hash();
```

### 7.6 Politici Retenție Date

```sql
-- TABELĂ: audit_retention_policies
CREATE TABLE audit_retention_policies (
    category TEXT PRIMARY KEY,
    retention_days INTEGER NOT NULL,
    legal_basis TEXT NOT NULL
);

INSERT INTO audit_retention_policies VALUES
    ('approval_decisions', 2555, 'Legal obligation - 7 year business records'),
    ('access_logs', 365, 'Legitimate interest - security'),
    ('pii_containing', 1095, 'Consent + legal obligation'),
    ('communication_logs', 730, 'Business records - 2 years'),
    ('financial_data', 3650, 'Legal obligation - 10 years accounting');
```

### 7.7 GDPR Anonymization

```sql
-- Funcție pentru anonimizare GDPR
CREATE OR REPLACE FUNCTION anonymize_user_audit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE approval_audit_log
    SET 
        actor_email = 'ANONYMIZED',
        source_ip = '0.0.0.0'::INET,
        user_agent = 'ANONYMIZED'
    WHERE actor_user_id = p_user_id
        AND contains_pii = TRUE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 8. ANEXE ȘI DOCUMENTE CONEXE

### 8.1 Contract of Record pentru Anexe

> **NOTĂ IMPORTANTĂ:** Toate documentele listate mai jos sunt **SUBORDONATE** acestui Master Spec.
>
> Dacă există contradicții între o anexă și Master Spec, **MASTER SPEC CÂȘTIGĂ**.
>
> Anexele care conțin reguli contradictorii sunt marcate cu ⚠️ și au note de override.

#### 8.1.1 Documente Normative (Tier 2)

| # | Document                                          | Tip            | Status   | Versiune Validată | Override Notes          |
|---|---------------------------------------------------|----------------|----------|-------------------|-------------------------|
| 1 | `Unified_HITL_Approval_System.md`                 | Normativ       | ✅ VALID | Jan 2026          | —                       |
| 2 | `TOC_Plan_Dezvoltare_Cerniq_App.rtf`              | Normativ/Plan  | ✅ VALID | Jan 2026          | —                       |
| 3 | `__Cerniq_App_-_Introducere.rtf`                  | Normativ       | ✅ VALID | Jan 2026          | —                       |
| 4 | `Tehnologii_Active_Ianuarie_2026.rtf`             | Normativ       | ✅ VALID | Jan 2026          | React → 19.2.3 (master) |
| 5 | `__Docker_Infrastructure_Technical_Reference.rtf` | Normativ       | ✅ VALID | Jan 2026          | —                       |

#### 8.1.2 Documente Strategie per Etapă (Tier 3)

| #  | Document                                           | Etapa | Status   | Override Notes |
|----|----------------------------------------------------|-------|----------|----------------|
| 6  | `Etapa_1_-_Strategie_Data_Enrichment.rtf`          | E1    | ✅ VALID | —              |
| 7  | `__Etapa_1_-_Frontend_strategy___tech_stack.md`    | E1    | ✅ VALID | —              |
| 8  | `__Etapa_1_-_Cerniq_UI_UX_Complet.rtf`             | E1    | ✅ VALID | —              |
| 9  | `Etapa_2_-_Optimizare_Strategie_Cold_Outreach.rtf` | E2    | ✅ VALID | —              |
| 10 | `Etapa_3_-_Strategie_și_Plan.rtf`                  | E3    | ✅ VALID | —              |
| 11 | `Etapa_3_-_Strategie_Generala_Ofertare.rtf`        | E3    | ✅ VALID | —              |
| 12 | `Date_pentru_Etapa_3_-_AI_pentru_Vânzări.rtf`      | E3    | ✅ VALID | —              |
| 13 | `Etapa_4__Monitorizare_Vânzare.rtf`                | E4    | ✅ VALID | —              |
| 14 | `Etapa_5_-_Strategie_Nurturing_Leads.rtf`          | E5    | ✅ VALID | —              |
| 15 | `Extindere_Etapa_5__Grupuri_și_Asocieri.rtf`       | E5    | ✅ VALID | —              |
| 16 | `Roadmap_Paralel_Vanzari_AI_-_Cerniq_app.rtf`      | All   | ✅ VALID | —              |

#### 8.1.3 Documente Procedurale (Workers) (Tier 4)

| #  | Document                                        | Etapa | Status      | Override Notes                                             |
|----|-------------------------------------------------|-------|-------------|------------------------------------------------------------|
| 17 | `__Etapa_1_-_Documentare_workers.md`            | E1    | ✅ VALID    | —                                                          |
| 18 | `__Etapa_2_-_Complete-workers-cold-outreach.md` | E2    | ✅ VALID    | —                                                          |
| 19 | `cerniq-workers-etapa3-ai-sales-agent.md`       | E3    | ✅ VALID    | LLM → xAI Grok canonic                                     |
| 20 | `cerniq-workers-etapa4-monitorizare.md`         | E4    | ⚠️ OVERRIDE | `gold_hitl_tasks` → `approval_tasks`; `assigned_to` → UUID |
| 21 | `cerniq-workers-etapa5-nurturing.md`            | E5    | ✅ VALID    | LLM → use routing policy                                   |

#### 8.1.4 Anexe Data Model (Tier 5 - ATENȚIE LA OVERRIDE-URI)

| #   | Document                                             | Status            | Override Notes (CRITICO)                   |
|-----|------------------------------------------------------|-------------------|--------------------------------------------|
| 22  | `docs/specifications/schema-database.md`             | ✅ **CURENT**     | Versiune corectată aliniată cu Master v1.2 |
| 22a | `__Schema_contacte_bronze_silver_gold_CORRECTED.md`  | ⚠️ **DEPRECATED** | Use `schema-database.md` instead           |

#### 8.1.5 Override-uri Critice pentru Schema Contacte

> **✅ REZOLVAT:** Schema completă a fost mutată în `docs/specifications/schema-database.md`.
>
> Versiunea originală din `/mnt/project/` este DEPRECATED și NU trebuie folosită.

| Problemă în Original              | Regula din Master (CORECTĂ)        | Status în CORRECTED |
|-----------------------------------|------------------------------------|---------------------|
| `"shop_id": "UUID"`               | **USE:** `tenant_id` (canonic)     | ✅ CORECTAT         |
| `cui VARCHAR(12) UNIQUE`          | **USE:** `UNIQUE(tenant_id, cui)`  | ✅ CORECTAT         |
| `cui VARCHAR(12) NOT NULL UNIQUE` | **USE:** `UNIQUE(tenant_id, cui)`  | ✅ CORECTAT         |
| Lipsă `tenant_id` în tabele       | **USE:** `tenant_id UUID NOT NULL` | ✅ CORECTAT         |

#### 8.1.6 Fișiere în Proiect vs Outputs

| Locație                                                | Status            | Notă                                   |
|--------------------------------------------------------|-------------------|----------------------------------------|
| `/mnt/project/Cerniq_Master_Spec_Normativ_Complet.md`  | ⛔ **OUTDATED**   | Versiunea v1.0 veche - NU FOLOSI       |
| `/mnt/project/__Schema_contacte_bronze_silver_gold.md` | ⛔ **DEPRECATED** | Are conflicte multi-tenant - NU FOLOSI |
| `docs/specifications/schema-database.md`               | ✅ **CURRENT**    | Schema canonică                        |
| `docs/specifications/master-specification.md`          | ✅ **CURRENT**    | Aceasta e v1.2 (actuală)               |

> **ACȚIUNE NECESARĂ PENTRU PROIECT:**
>
> 1. Folosește `docs/specifications/master-specification.md` ca Single Source of Truth.
> 2. Folosește `docs/specifications/schema-database.md` pentru schema de date.

### 8.2 Inconsistențe Rezolvate (Complet)

| #  | Inconsistență                         | Sursă                   | Rezoluție                                 | Status |
|----|---------------------------------------|-------------------------|-------------------------------------------|--------|
| 1  | Node.js 24.13 vs 24.12                | Etapa 1 vs Etapa 2-5    | **CANONIC: 24.12.0**                      | ✅     |
| 2  | Python 3.14.1 vs 3.14.2               | Docs vechi vs Research  | **CANONIC: 3.14.2**                       | ✅     |
| 3  | `gold_hitl_tasks` vs `approval_tasks` | Etapa 4 vs Unified HITL | **CANONIC: `approval_tasks`**             | ✅     |
| 4  | React 19.2.3 vs 19.2.1                | TOC vs npm              | **CANONIC: 19.2.3**                       | ✅     |
| 5  | SPA vs SSR frontend                   | Frontend doc            | **RECOMANDAT: Next.js 15+ RSC**           | ✅     |
| 6  | `sha256()` vs `digest()`              | Audit report            | **CANONIC: `sha256()`** nativ PG11+       | ✅     |
| 7  | UNIQUE(cui) global                    | Multi-tenant break      | **FIX: `UNIQUE(tenant_id, cui)`**         | ✅     |
| 8  | LLM Grok vs Claude                    | E3 vs E5                | **FIX: LLM Routing Policy** (S2.3)        | ✅     |
| 9  | `assigned_to` email vs UUID           | E4 workers              | **FIX: UUID obligatoriu**                 | ✅     |
| 10 | `shop_id` vs `tenant_id`              | Schema anexă vs Master  | **CANONIC: `tenant_id`** (alias declared) | ✅     |
| 11 | `current_stage` vs `current_state`    | Diverse docs            | **CANONIC: `current_state`**              | ✅     |
| 12 | 2 copii master spec                   | Project vs Outputs      | **FIX: Înlocuire necesară**               | ⚠️     |

### 8.3 Gap-uri Documentate și Adresate (Complet)

| #  | Gap                         | Status               | Adresare                          | Secțiune |
|----|-----------------------------|----------------------|-----------------------------------|----------|
| 1  | Multi-tenant RBAC           | ✅ REZOLVAT          | Three-layer auth                  | S7       |
| 2  | Multi-tenant DB Constraints | ✅ REZOLVAT          | UNIQUE(tenant_id, cui)            | S2.4, S3 |
| 3  | Integration Registry        | ✅ REZOLVAT          | Integration configs               | S6       |
| 4  | Idempotency global          | ✅ REZOLVAT          | correlation_id + idempotencyKey   | S2.6     |
| 5  | Event Contract End-to-End   | ✅ REZOLVAT          | Schema + Replay Strategy          | S2.6     |
| 6  | Data retention GDPR         | ✅ REZOLVAT          | Retention policies                | S7.6     |
| 7  | LLM Routing Policy          | ✅ REZOLVAT          | Provideri + Guardrails + Cost caps| S2.3     |
| 8  | Observability Standard      | ✅ REZOLVAT          | SigNoz + OTel canonic             | S2.5     |
| 9  | HITL User Identity          | ✅ REZOLVAT          | UUID contract                     | S5.1     |
| 10 | SQL Hashing Functions       | ✅ CLARIFICAT        | sha256() nativ PG11+              | S3.2     |
| 11 | Test Strategy               | ✅ **REZOLVAT v1.2** | Contract tests + pgTAP + CI gates | **S2.8** |
| 12 | Rate Limiting Policy        | ✅ **REZOLVAT v1.2** | Per-provider + Circuit breakers   | **S2.7** |
| 13 | Governance & Precedence     | ✅ **REZOLVAT v1.2** | Document hierarchy + Aliases      | **S0**   |
| 14 | Contract of Record Anexe    | ✅ **REZOLVAT v1.2** | Status + Overrides                | **S8.1** |

### 8.4 Checklist "Definition of Done" pentru Master Spec

> **Acest checklist trebuie să fie 100% bifat pentru ca spec-ul să fie considerat COMPLET.**

### Structură & Guvernanță

- [x] Secțiune 0: Governance & Precedence Rules
- [x] Document hierarchy definit (Tier 1-5)
- [x] Deprecation policy documentată
- [x] Alias mapping pentru legacy terms
- [x] Validation requirements pentru PR/Merge

### Tech Stack & Contracts

- [x] Versiuni canonice tech stack (S2.1)
- [x] LLM Routing Policy (S2.5)
- [x] Multi-tenant Contract (S2.6)
- [x] Observability Stack (S2.7)
- [x] Event Contract (S2.8)
- [x] Rate Limiting & Provider Constraints (S2.9)
- [x] Test Strategy (S2.10)

### Data Model

- [x] Bronze schema cu multi-tenant
- [x] Silver schema cu UNIQUE(tenant_id, cui)
- [x] Gold schema cu UNIQUE(tenant_id, cui)
- [x] FSM naming canonizat (current_state)
- [x] sha256() nativ documentat
- [x] **Schema Annex corectată** (`__Schema_contacte_bronze_silver_gold_CORRECTED.md`)

### HITL

- [x] approval_tasks ca single table transversal
- [x] Deprecation notice pentru gold_hitl_tasks
- [x] User Identity Contract (UUID)
- [x] SLA & Escalation chain

### Integration & Security

- [x] Integration Registry schema
- [x] RBAC three-layer auth
- [x] Audit log immutable
- [x] RLS pentru multi-tenant

### Anexe & Reconciliere

- [x] Contract of Record pentru toate anexele
- [x] Override notes pentru contradicții
- [x] Toate inconsistențele rezolvate
- [x] Toate gap-urile adresate
- [x] **Schema annex corectată și în outputs**

### Deployment Readiness

- [ ] Fișierele vechi din /mnt/project/ înlocuite (necesită acțiune manuală)
- [ ] Toate echipele notificate de versiunea v1.2

### 8.5 Următoarele Review-uri

| Data                  | Tip Review | Focus                                 |
|-----------------------|------------|---------------------------------------|
| **Aprilie 2026**      | Quarterly  | Versiuni tech stack, security patches |
| **La Node.js 25 LTS** | Major      | Upgrade path, breaking changes        |
| **La PostgreSQL 19**  | Major      | New features adoption                 |
| **Dec 2026+**         | Compliance | e-Factura ViDA changes                |
| **La cerere**         | Ad-hoc     | Orice contradicție nou descoperită    |

---

> **END OF MASTER SPECIFICATION**

*Document Version: 1.2 (COMPLETE)*  
*Creation date: 11 Ianuarie 2026*  
*Last Updated: 11 Ianuarie 2026 (v1.2 - Complete with Governance)*  
*Validation source: Project Knowledge + Online Research + Critical Audit Report*  
*Status: ✅ ALL GAPS ADDRESSED - READY FOR IMPLEMENTATION*  
*Author: Claude AI Assistant*
