# CERNIQ.APP — CODING STANDARDS & AI AGENT CONFIGURATION

## Guvernat de Master Spec v1.2 (Single Source of Truth)

### Versiunea 1.0 | 12 Ianuarie 2026

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** Standarde codare pentru dezvoltare manuală și agenți AI (Cursor, GitHub Copilot)  
**CREATION DATE:** 12 Ianuarie 2026  
**AUTHOR:** Alex (1-Person-Team Development)

---

## CUPRINS

0. [GOVERNANCE & DOCUMENT AUTHORITY](#0-governance--document-authority)
1. [TECHNOLOGY STACK CANONIC](#1-technology-stack-canonic)
2. [ARCHITECTURE PATTERNS](#2-architecture-patterns)
3. [NAMING CONVENTIONS](#3-naming-conventions)
4. [TYPESCRIPT STANDARDS](#4-typescript-standards)
5. [PYTHON STANDARDS](#5-python-standards)
6. [DATABASE STANDARDS](#6-database-standards)
7. [API STANDARDS (FASTIFY)](#7-api-standards-fastify)
8. [BULLMQ WORKER STANDARDS](#8-bullmq-worker-standards)
9. [FRONTEND STANDARDS](#9-frontend-standards)
10. [TESTING STANDARDS](#10-testing-standards)
11. [SECURITY STANDARDS](#11-security-standards)
12. [ANTI-HALLUCINATION GUARDRAILS](#12-anti-hallucination-guardrails)
13. [AI AGENT CONFIGURATION](#13-ai-agent-configuration)
14. [CODE REVIEW CHECKLIST](#14-code-review-checklist)
15. [DEPRECATED PATTERNS](#15-deprecated-patterns)

---

## 0. GOVERNANCE & DOCUMENT AUTHORITY

## 0.1 Document Hierarchy

> **REGULĂ FUNDAMENTALĂ:** Master Spec v1.2 este **SINGURA sursă de adevăr** pentru proiectul Cerniq.app.

| Nivel | Document | Autoritate |
| ------- | ---------- | ------------ |
| **1** | `Cerniq_Master_Spec_Normativ_Complet.md` v1.2+ | **NORMATIV ABSOLUT** |
| **2** | `coding-standards.md` (acest document) | Normativ derivat |
| **3** | `.cursor/rules/*.mdc`, `.github/copilot-instructions.md` | Configurare AI |
| **4** | Documentație per-etapă (E1-E5) | Procedural |

## 0.2 Conflict Resolution

```typescript
// Regula de precedență
IF (this_document.rule !== master_spec.rule) {
  APPLY(master_spec.rule);
  FLAG(this_document.rule, "NEEDS_UPDATE");
}
```

## 0.3 AI Agent Instruction Priority

Pentru agenți AI (Cursor, Copilot), instrucțiunile se aplică în această ordine:

1. **Acest document** — standarde explicite
2. **Master Spec v1.2** — pentru clarificări
3. **Context din conversație** — cerințe specifice task
4. **Cunoștințe generale** — doar când cele de mai sus nu acoperă

---

## 1. TECHNOLOGY STACK CANONIC

> ⚠️ **CRITIAL:** Aceste versiuni sunt OBLIGATORII. NU genera cod pentru alte versiuni.

## 1.1 Backend Stack

| Component | Versiune CANONICĂ | Release Date | EOL/Suport |
| ----------- | ------------------- | -------------- | ------------ |
| **Node.js** | **24.12.0 "Krypton"** | 10 Dec 2025 | Apr 2028 |
| **V8 Engine** | 13.6.233.17 | Bundled | — |
| **NPM** | 11.x | Bundled | — |
| **Python** | **3.14.2** Free-Threading | 5 Dec 2025 | Phase II |
| **PostgreSQL** | **18.1** | 13 Nov 2025 | — |
| **pgvector** | **0.8.1** | Late 2025 | PG 13-18 |
| **PostGIS** | **3.6.1** | 13 Nov 2025 | PG 12-18 |
| **Redis** | **7.4.7** | Late 2025 | — |
| **BullMQ** | **5.66.4** | 29 Dec 2025 | Requires Redis 6.2+ |
| **Fastify** | **5.6.2** | 9 Nov 2025 | v4 EOL: 30 Jun 2025 |

## 1.2 Frontend Stack

| Component | Versiune CANONICĂ | Caracteristici Cheie |
| ----------- | ------------------- | ---------------------- |
| **React** | **19.2.3** | Server Components, useOptimistic, Activity API |
| **React Compiler** | **1.0** | 12% faster loads, 2.5x faster interactions |
| **Tailwind CSS** | **4.1.x** | Oxide engine (Rust), 3.5-5x faster builds |
| **Refine** | **v5** | TanStack Query v5, headless admin |
| **shadcn/ui** | Latest | Radix UI primitives |

## 1.3 AI/ML Stack

| Provider | Use Case | Model | Rate Limit |
| ---------- | ---------- | ------- | ------------ |
| **xAI Grok-4** | Structured Outputs, Agent Core E3 | grok-4 | 60 RPM |
| **OpenAI** | Embeddings | text-embedding-3-large | 3000 RPM |
| **Groq** | Real-time Chat (<500ms) | Llama 3 8B | 100 RPM |
| **Ollama Local** | Privacy-First (date sensibile) | Qwen 2.5 / Llama | Nelimitat |
| **Anthropic Claude** | Fallback, Complex Reasoning | claude-3-5-sonnet | 50 RPM |

---

## 2. ARCHITECTURE PATTERNS

## 2.1 Vertical Slice Architecture

> **PRINCIPIU:** Organizare pe feature-uri complete, NU pe layer-uri tehnice.

```text
src/
├── features/
│   ├── enrichment/           # E1: Data Enrichment
│   │   ├── workers/
│   │   ├── api/
│   │   ├── types/
│   │   └── tests/
│   ├── outreach/             # E2: Cold Outreach
│   │   ├── whatsapp/
│   │   ├── email/
│   │   └── orchestration/
│   ├── sales-agent/          # E3: AI Sales
│   ├── post-sale/            # E4: Monitoring
│   └── nurturing/            # E5: Nurturing
├── shared/
│   ├── database/
│   ├── queue/
│   ├── auth/
│   └── observability/
└── infrastructure/
```

## 2.2 Medallion Data Architecture

```text
BRONZE                    SILVER                      GOLD
──────                    ──────                      ────
• Raw payload            • Normalized               • Fully enriched
• Append-only            • Deduplicated             • Verified contacts
• Source tracking        • CUI validated            • Lead scored
• Zero transforms        • E.164 phones             • Ready for outreach
```

**Criterii Avansare:**

| Tranziție | Criterii Obligatorii |
| ----------- | --------------------- |
| Bronze → Silver | JSON valid, 1+ identificator |
| Silver → Gold | CUI modulo-11 OK, Contact verificat, Date financiare < 2 ani, Locație geocodată, Completitudine ≥ 60% |

## 2.3 Neuro-Symbolic AI Pattern

```typescript
// Pattern obligatoriu pentru toate output-urile AI
const NEURO_SYMBOLIC_FLOW = {
  // 1. Neural: LLM generează
  neural: 'xai-grok structured output',
  
  // 2. Symbolic: Guardrails validează
  symbolic: {
    price_guard: 'offered_price >= min_approved_price',
    stock_guard: 'stock_quantity > 0',
    discount_guard: 'discount <= max_discount_approved',
    product_exists: 'SKU exists in gold_products',
    client_validated: 'CUI valid + fiscal data OK'
  }
};
```

## 2.4 Multi-Tenant Contract

> ⚠️ **CRITICO:** Fiecare query TREBUIE să includă `tenant_id`.

```typescript
// ❌ INTERZIS - constraint global
UNIQUE(cui)

// ✅ CORECT - constraint per-tenant
UNIQUE(tenant_id, cui)
```

```sql
-- RLS obligatoriu pentru toate tabelele tenant-scoped
ALTER TABLE gold_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON gold_companies
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

## 2.5 Event-Driven Architecture

```typescript
// Schema OBLIGATORIE pentru toate evenimentele
interface CerniqEvent<T = unknown> {
  eventId: string;          // UUID v7 (time-sortable)
  eventType: EventType;     // Enum canonic
  idempotencyKey: string;   // {entityType}:{entityId}:{action}:{hourTs}
  timestamp: string;        // ISO 8601 UTC
  correlationId: string;    // Pentru tracing end-to-end
  tenantId: string;
  payload: T;
  version: number;          // Schema version
  source: string;           // Serviciul emitent
}
```

---

## 3. NAMING CONVENTIONS

## 3.1 PostgreSQL Tables

| Prefix | Semnificație | Exemple |
| -------- | ------------- | --------- |
| `bronze_*` | Date brute ingestie | `bronze_contacts`, `bronze_webhooks` |
| `silver_*` | Date validate/normalizate | `silver_companies`, `silver_contacts` |
| `gold_*` | Date operaționale | `gold_companies`, `gold_lead_journey` |
| `approval_*` | HITL core (transversal) | `approval_tasks`, `approval_audit_log` |
| `*_events` | Event logs append-only | `communication_events` |
| `*_configs` | Configurări sistem | `approval_type_configs` |

## 3.2 BullMQ Queues

```text
Pattern: {layer}:{category}:{action}
```

| Layer | Descriere | Exemple |
| ------- | ----------- | --------- |
| `bronze` | Ingestie date brute | `bronze:ingest:csv-parser` |
| `silver` | Validare/normalizare | `silver:validate:cui-anaf` |
| `enrich` | Îmbogățire externă | `enrich:anaf:fiscal-status` |
| `gold` | Operații Gold layer | `gold:score:lead` |
| `outreach` | Orchestrare outreach | `outreach:orchestrator:dispatch` |
| `q:wa` | Cozi WhatsApp per-telefon | `q:wa:phone_01` |
| `q:email` | Cozi email per-tip | `q:email:cold` |

## 3.3 Job IDs

```typescript
// Pattern: {prefix}-{entityType}-{entityId}-{timestamp}
jobId: `enrich-company-${companyId}-${Date.now()}`
jobId: `esc-${approvalId}`  // Escalation jobs
jobId: `warn-${approvalId}` // Warning jobs
```

## 3.4 Event Types

| Pattern | Utilizare | Exemple |
| --------- | ----------- | --------- |
| `ENTITY_ACTIUNE` | Evenimente principale | `LEAD_CREATED`, `APPROVAL_COMPLETED` |
| `*_STARTED`, `*_COMPLETED`, `*_FAILED` | Lifecycle events | `ENRICHMENT_STARTED` |
| `*_ESCALATED`, `*_EXPIRED` | HITL events | `APPROVAL_ESCALATED` |

## 3.5 TypeScript/JavaScript

```typescript
// Variables & Functions
const leadScore = 85;                    // camelCase
function calculateLeadScore() {}         // camelCase

// Constants
const MAX_RETRY_ATTEMPTS = 3;            // SCREAMING_SNAKE_CASE
const DEFAULT_SLA_MINUTES = 1440;

// Types & Interfaces
interface LeadJourney {}                 // PascalCase
type ApprovalStatus = 'pending' | 'approved';

// Enums
enum PipelineStage {
  E1_ENRICHMENT = 'E1',
  E2_OUTREACH = 'E2',
}

// Files
// feature-name.service.ts               // kebab-case
// LeadJourney.types.ts                   // PascalCase for type-only files
```

## 3.6 Python

```python
# Variables & Functions
lead_score = 85                          # snake_case
def calculate_lead_score(): pass

# Constants
MAX_RETRY_ATTEMPTS = 3                   # SCREAMING_SNAKE_CASE

# Classes
class LeadJourneyService:                # PascalCase
    pass

# Type hints obligatorii
def process_lead(lead_id: str, tenant_id: str) -> LeadResult:
    pass
```

---

## 4. TYPESCRIPT STANDARDS

## 4.1 Strict Mode Configuration

```json
// tsconfig.json - OBLIGATORIU
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## 4.2 Type Safety Rules

```typescript
// ❌ INTERZIS - any type
const data: any = fetchData();

// ✅ CORECT - tipuri explicite
const data: CompanyData = fetchData();

// ❌ INTERZIS - default parameters
function process(options = {}) {}

// ✅ CORECT - tipuri explicite pentru toate parametrii
function process(options: ProcessOptions): ProcessResult {}

// ❌ INTERZIS - assertions fără validare
const company = data as Company;

// ✅ CORECT - type guards
function isCompany(data: unknown): data is Company {
  return typeof data === 'object' && data !== null && 'cui' in data;
}
```

## 4.3 Zod Schema Validation

```typescript
import { z } from 'zod';

// Schema pentru validare runtime
const CompanySchema = z.object({
  cui: z.string().regex(/^\d{1,12}$/).refine(validateCuiChecksum),
  denumire: z.string().min(1).max(255),
  tenant_id: z.string().uuid(),
  status_firma: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'RADIATED']),
});

// Derivare TypeScript type din Zod
type Company = z.infer<typeof CompanySchema>;

// Validare obligatorie la input
export function processCompany(input: unknown): Company {
  return CompanySchema.parse(input); // Throws on invalid
}
```

## 4.4 Error Handling

```typescript
// ❌ INTERZIS - catch-all silențios
try {
  await process();
} catch (e) {
  console.log(e);
}

// ✅ CORECT - error handling explicit
try {
  await process();
} catch (error) {
  if (error instanceof ValidationError) {
    throw new BadRequestError(error.message);
  }
  if (error instanceof NetworkError) {
    await retryWithBackoff(process);
  }
  throw error; // Re-throw unknown errors
}
```

## 4.5 Async/Await Patterns

```typescript
// ❌ INTERZIS - callback-uri sau .then()
fetchData()
  .then(data => process(data))
  .catch(err => handle(err));

// ✅ CORECT - async/await
async function fetchAndProcess(): Promise<Result> {
  const data = await fetchData();
  return process(data);
}

// Promise.all pentru operații paralele
const [companies, contacts] = await Promise.all([
  fetchCompanies(tenantId),
  fetchContacts(tenantId),
]);
```

---

## 5. PYTHON STANDARDS

## 5.1 Python 3.14 Free-Threading

> **NOTĂ:** Python 3.14 suportă free-threading (no-GIL). Binary: `python3.14t`

```python
# Verificare free-threading
import sys
if sys.version_info >= (3, 13):
    is_gil_disabled = not sys._is_gil_enabled()
    print(f"GIL disabled: {is_gil_disabled}")
```

## 5.2 Type Hints Obligatorii

```python
from typing import Optional, List, Dict
from pydantic import BaseModel, Field

# ❌ INTERZIS - fără type hints
def process_lead(lead_id, tenant_id):
    pass

# ✅ CORECT - type hints complete
def process_lead(lead_id: str, tenant_id: str) -> LeadResult:
    pass

# Pydantic models pentru validare
class CompanyInput(BaseModel):
    cui: str = Field(..., pattern=r'^\d{1,12}$')
    denumire: str = Field(..., min_length=1, max_length=255)
    tenant_id: str = Field(...)

    class Config:
        strict = True  # Pydantic strict mode
```

## 5.3 Thread Safety (Free-Threading)

```python
import threading

# Cu free-threading, lock-urile explicite sunt OBLIGATORII
_lock = threading.Lock()

def update_shared_state(key: str, value: Any) -> None:
    with _lock:
        shared_dict[key] = value

# Sau folosește structuri thread-safe
from queue import Queue
task_queue: Queue[Task] = Queue()
```

## 5.4 Error Handling

```python
# ❌ INTERZIS - bare except
try:
    process()
except:
    pass

# ✅ CORECT - excepții specifice
try:
    process()
except ValidationError as e:
    logger.error(f"Validation failed: {e}")
    raise BadRequestError(str(e))
except NetworkError as e:
    await retry_with_backoff(process)
except Exception as e:
    logger.exception(f"Unexpected error: {e}")
    raise
```

---

## 6. DATABASE STANDARDS

## 6.1 Multi-Tenant Constraints

```sql
-- ⚠️ OBLIGATORIU: Toate tabelele cu date client TREBUIE să aibă tenant_id

-- ❌ INTERZIS
CREATE TABLE silver_companies (
    cui VARCHAR(12) UNIQUE  -- GREȘIT!
);

-- ✅ CORECT
CREATE TABLE silver_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    cui VARCHAR(12),
    
    CONSTRAINT unique_cui_per_tenant UNIQUE(tenant_id, cui)
);
```

## 6.2 Standard Column Types

```sql
-- Identificatori
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id UUID NOT NULL
entity_id UUID NOT NULL

-- Timestamps
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
deleted_at TIMESTAMPTZ  -- Soft delete

-- Status fields
status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'active', ...))

-- JSONB pentru date flexibile
metadata JSONB DEFAULT '{}'
```

## 6.3 Indexes

```sql
-- Index pentru foreign keys
CREATE INDEX idx_contacts_company ON silver_contacts(company_id);

-- Index pentru tenant queries (întotdeauna include tenant_id)
CREATE INDEX idx_companies_tenant ON silver_companies(tenant_id);

-- Partial index pentru stări active
CREATE INDEX idx_active_leads ON gold_lead_journey(tenant_id, current_state)
    WHERE current_state NOT IN ('CONVERTED', 'CHURNED', 'DEAD');

-- GIN index pentru JSONB
CREATE INDEX idx_metadata ON approval_tasks USING GIN (metadata);
```

## 6.4 Migrations

```sql
-- Migration header
-- Migration: 20260112_001_add_lead_scoring
-- Author: Alex
-- Description: Add lead scoring columns to gold_companies

BEGIN;

-- Always check if column/table exists
ALTER TABLE gold_companies 
    ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fit_score INTEGER,
    ADD COLUMN IF NOT EXISTS engagement_score INTEGER;

-- Add constraint with descriptive name
ALTER TABLE gold_companies
    ADD CONSTRAINT chk_lead_score_range 
    CHECK (lead_score >= 0 AND lead_score <= 100);

COMMIT;
```

---

## 7. API STANDARDS (FASTIFY)

## 7.1 Route Structure

```typescript
// Fastify v5 Type Provider pattern
import { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

const companiesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.withTypeProvider<TypeBoxTypeProvider>();
  
  fastify.get('/companies', {
    schema: {
      querystring: GetCompaniesQuerySchema,
      response: {
        200: CompaniesResponseSchema,
        400: ErrorResponseSchema,
      },
    },
    preHandler: [fastify.authenticate, fastify.authorize('companies:read')],
  }, async (request, reply) => {
    const { tenant_id } = request.user;
    const companies = await companyService.list(tenant_id, request.query);
    return { data: companies };
  });
};
```

## 7.2 Error Handling

```typescript
// Error response format standard
interface ErrorResponse {
  error: {
    code: string;           // e.g., 'VALIDATION_ERROR'
    message: string;        // Human-readable
    details?: unknown;      // Optional structured details
  };
  requestId: string;        // For tracing
}

// Custom error classes
export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
}

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode ?? 500;
  
  reply.status(statusCode).send({
    error: {
      code: error.code ?? 'INTERNAL_ERROR',
      message: error.message,
    },
    requestId: request.id,
  });
});
```

## 7.3 Authentication & Authorization

```typescript
// JWT in HttpOnly cookies
fastify.register(fastifyCookie);
fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET,
  cookie: {
    cookieName: 'token',
    signed: false,
  },
});

// Middleware pentru setare context tenant
fastify.addHook('preHandler', async (request) => {
  if (request.user) {
    await fastify.pg.query(
      "SET LOCAL app.current_tenant = $1",
      [request.user.tenant_id]
    );
  }
});
```

---

## 8. BULLMQ WORKER STANDARDS

## 8.1 Worker Template

```typescript
import { Worker, Job } from 'bullmq';
import { trace } from '@opentelemetry/api';

interface EnrichmentJobData {
  companyId: string;
  tenantId: string;
  correlationId: string;
}

const enrichmentWorker = new Worker<EnrichmentJobData>(
  'enrich:anaf:fiscal-status',
  async (job: Job<EnrichmentJobData>) => {
    const span = trace.getActiveSpan();
    span?.setAttribute('job.id', job.id);
    span?.setAttribute('tenant.id', job.data.tenantId);
    
    await job.log(`Starting enrichment for company ${job.data.companyId}`);
    
    try {
      const result = await enrichFromAnaf(job.data.companyId);
      await job.updateProgress(100);
      return result;
    } catch (error) {
      span?.recordException(error as Error);
      throw error; // BullMQ will retry based on config
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 1,           // 1 request per second (ANAF limit)
      duration: 1000,
    },
  }
);

// Error handler obligatoriu
enrichmentWorker.on('error', (error) => {
  logger.error('Worker error', { error, queue: 'enrich:anaf:fiscal-status' });
});
```

## 8.2 Job Options Standard

```typescript
// Standard job options
const JOB_OPTIONS = {
  // Retry configuration
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,  // 1s, 2s, 4s
  },
  
  // Remove completed jobs after 24h
  removeOnComplete: {
    age: 86400,
    count: 1000,
  },
  
  // Keep failed jobs for debugging
  removeOnFail: {
    age: 604800,  // 7 days
  },
};
```

## 8.3 Idempotency Pattern

```typescript
async function processWithIdempotency(job: Job<JobData>) {
  const idempotencyKey = job.data.idempotencyKey;
  
  // Check if already processed
  const existing = await redis.get(`processed:${idempotencyKey}`);
  if (existing) {
    return JSON.parse(existing);
  }
  
  // Process
  const result = await doWork(job.data);
  
  // Mark as processed (with TTL)
  await redis.setex(
    `processed:${idempotencyKey}`,
    86400, // 24h TTL
    JSON.stringify(result)
  );
  
  return result;
}
```

---

## 9. FRONTEND STANDARDS

## 9.1 React 19 Patterns

```typescript
// Server Components (default)
// app/companies/page.tsx
async function CompaniesPage() {
  const companies = await fetchCompanies();
  return <CompanyList companies={companies} />;
}

// Client Components (when needed)
// components/CompanySearch.tsx
'use client';

import { useOptimistic, useTransition } from 'react';

export function CompanySearch() {
  const [isPending, startTransition] = useTransition();
  const [optimisticQuery, setOptimisticQuery] = useOptimistic('');
  
  return (
    <input
      onChange={(e) => {
        setOptimisticQuery(e.target.value);
        startTransition(() => search(e.target.value));
      }}
    />
  );
}
```

## 9.2 Tailwind CSS v4

```typescript
// ❌ INTERZIS - clasele vechi
<div className="bg-gray-100 dark:bg-gray-900">

// ✅ CORECT - design tokens
<div className="bg-surface dark:bg-surface-dark">

// Color tokens standard
const colors = {
  primary: '#0066CC',
  secondary: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  surface: '#F9FAFB',
  'surface-dark': '#111827',
};
```

## 9.3 Refine v5 Data Provider

```typescript
import { dataProvider } from '@refinedev/simple-rest';
import { Authenticated, Refine } from '@refinedev/core';

function App() {
  return (
    <Refine
      dataProvider={dataProvider('/api')}
      resources={[
        {
          name: 'companies',
          list: '/companies',
          show: '/companies/:id',
          create: '/companies/create',
          edit: '/companies/:id/edit',
        },
      ]}
    >
      {/* Routes */}
    </Refine>
  );
}
```

---

## 10. TESTING STANDARDS

## 10.1 Test Pyramid

```text
            ┌─────────────────────┐
            │    E2E Tests        │  ← 5% (Critical flows only)
            │   (Playwright)      │
            └─────────┬───────────┘
                      │
         ┌────────────┴────────────┐
         │    Integration Tests    │  ← 25%
         │ (API + DB + Queue)      │
         └────────────┬────────────┘
                      │
    ┌─────────────────┴─────────────────┐
    │           Unit Tests              │  ← 70%
    │  (Business logic, validators)     │
    └───────────────────────────────────┘
```

## 10.2 Minimum Coverage Requirements

| Component | Min Coverage | Critical Paths |
| ----------- | ------------- | ---------------- |
| **API Routes** | 80% | Auth, CRUD, Validation |
| **Workers** | 75% | Happy path + Error handling |
| **Event Handlers** | 90% | All event types |
| **HITL Logic** | 95% | Approval flows, Escalation, SLA |
| **DB Migrations** | 100% | All constraints tested |

## 10.3 Contract Tests

```typescript
// Event Schema Contract Test
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
    const key = generateIdempotencyKey('lead', 'uuid', 'STATE_CHANGE');
    expect(key).toMatch(/^[a-z]+:[a-f0-9-]+:[A-Z_]+:\d+$/);
  });
});
```

## 10.4 pgTAP Database Tests

```sql
-- /tests/db/multi-tenant.test.sql
BEGIN;
SELECT plan(3);

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

-- Test 3: RLS is enabled
SELECT policies_are('silver_companies', ARRAY['tenant_isolation_companies']);

SELECT * FROM finish();
ROLLBACK;
```

---

## 11. SECURITY STANDARDS

## 11.1 Authentication

```typescript
// JWT in HttpOnly cookies (NOT localStorage)
const authConfig = {
  cookie: {
    name: 'auth_token',
    httpOnly: true,
    secure: true,          // HTTPS only
    sameSite: 'strict',
    maxAge: 3600,          // 1 hour
  },
  refreshToken: {
    rotation: true,        // New refresh token on each use
    maxAge: 604800,        // 7 days
  },
};
```

## 11.2 Three-Layer Authorization

```typescript
// Layer 1: RBAC (Role-Based)
const roles = ['super_admin', 'tenant_admin', 'sales_manager', 'sales_rep', 'viewer'];

// Layer 2: ReBAC (Relationship-Based)
function canEdit(user: User, lead: Lead): boolean {
  return lead.owner_id === user.id || user.team_id === lead.team_id;
}

// Layer 3: ABAC (Attribute-Based)
function canApprove(user: User, task: ApprovalTask): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 9 && hour <= 18; // Business hours only
}
```

## 11.3 Input Validation

```typescript
// Validare CUI
function validateCui(cui: string): boolean {
  if (!/^\d{2,10}$/.test(cui)) return false;
  
  // Modulo-11 checksum
  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  const digits = cui.padStart(10, '0').split('').map(Number);
  const checkDigit = digits.pop()!;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i];
  }
  
  const expected = (sum * 10) % 11 % 10;
  return checkDigit === expected;
}
```

## 11.4 Audit Logging

```typescript
// Toate acțiunile HITL sunt auditate
interface AuditLogEntry {
  approval_task_id: string;
  event_type: string;
  event_timestamp: Date;
  actor_user_id: string;         // UUID, NU email
  source_ip: string;
  user_agent: string;
  previous_state: object;
  new_state: object;
  event_hash: string;            // Hash chain pentru tamper detection
  previous_hash: string;
}
```

---

## 12. ANTI-HALLUCINATION GUARDRAILS

## 12.1 Zero-Hallucination Policy

> **PRINCIPIU:** NICIUN output AI nu este trimis către client fără validare.

```typescript
// Guardrails OBLIGATORII pentru toate răspunsurile AI în E3 (Sales Agent)
interface GuardrailChecks {
  price_guard: boolean;      // preț_oferit >= preț_minim_aprobat
  stock_guard: boolean;      // stock_quantity > 0
  discount_guard: boolean;   // discount <= max_discount_aprobat
  product_exists: boolean;   // SKU există în catalog
  client_validated: boolean; // CUI valid + date fiscale OK
}

async function validateAIResponse(response: AIResponse): Promise<ValidatedResponse> {
  const guardrails: GuardrailChecks = {
    price_guard: response.price >= await getMinPrice(response.productId),
    stock_guard: await getStockQuantity(response.productId) > 0,
    discount_guard: response.discount <= await getMaxDiscount(response.productId),
    product_exists: await productExists(response.productId),
    client_validated: await validateClient(response.clientCui),
  };
  
  const allPassed = Object.values(guardrails).every(Boolean);
  
  if (!allPassed) {
    throw new GuardrailViolationError(guardrails);
  }
  
  return { ...response, validated: true, guardrails };
}
```

## 12.2 LLM Output Validation

```typescript
import { z } from 'zod';

// Schema strictă pentru output LLM
const SalesProposalSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  unit_price: z.number().positive(),
  quantity: z.number().int().positive(),
  discount_percent: z.number().min(0).max(30),
  total_price: z.number().positive(),
  delivery_date: z.string().datetime(),
});

async function generateProposal(request: ProposalRequest): Promise<SalesProposal> {
  const llmResponse = await callGrok(request);
  
  // 1. Parse și validare structură
  const proposal = SalesProposalSchema.parse(llmResponse);
  
  // 2. Validare business rules (vs database)
  const product = await db.gold_products.findUnique({ where: { id: proposal.product_id } });
  if (!product) throw new Error('Product not found in catalog');
  
  if (proposal.unit_price < product.min_price) {
    throw new Error(`Price below minimum: ${product.min_price}`);
  }
  
  if (proposal.discount_percent > product.max_discount) {
    throw new Error(`Discount exceeds maximum: ${product.max_discount}%`);
  }
  
  // 3. Recalculare preț (nu ne bazăm pe LLM pentru aritmetică)
  const calculatedTotal = proposal.unit_price * proposal.quantity * (1 - proposal.discount_percent / 100);
  proposal.total_price = Math.round(calculatedTotal * 100) / 100;
  
  return proposal;
}
```

## 12.3 Fact-Checking Pattern

```typescript
// Verificare fapte vs sursă de adevăr (database)
async function factCheck(aiClaims: AIClaim[]): Promise<FactCheckResult[]> {
  return Promise.all(aiClaims.map(async (claim) => {
    switch (claim.type) {
      case 'PRICE':
        const product = await db.gold_products.findUnique({ where: { id: claim.productId } });
        return {
          claim,
          verified: product?.current_price === claim.value,
          source: 'gold_products',
        };
      
      case 'STOCK':
        const stock = await db.inventory.findUnique({ where: { product_id: claim.productId } });
        return {
          claim,
          verified: stock?.quantity >= claim.value,
          source: 'inventory',
        };
      
      case 'COMPANY_STATUS':
        const company = await db.gold_companies.findUnique({ where: { cui: claim.cui } });
        return {
          claim,
          verified: company?.status_firma === claim.value,
          source: 'gold_companies + ANAF',
        };
      
      default:
        return { claim, verified: false, reason: 'Unknown claim type' };
    }
  }));
}
```

## 12.4 LLM Prompt Engineering for Accuracy

```typescript
const SYSTEM_PROMPT = `
You are a B2B sales assistant for agricultural products in Romania.

CRITICAL RULES:
1. NEVER invent product names, prices, or specifications
2. ONLY reference products from the catalog provided in context
3. If you don't know something, say "I need to check our catalog"
4. All prices must be validated against the product database
5. Never promise delivery dates without checking inventory

Output format: JSON only, matching the SalesProposalSchema

Available products in catalog:
{productCatalog}

Current inventory levels:
{inventoryLevels}
`;
```

---

## 13. AI AGENT CONFIGURATION

## 13.1 Cursor AI Rules Structure

```text
.cursor/
└── rules/
    ├── 00-global.mdc           # Standarde globale
    ├── 01-typescript.mdc       # TypeScript patterns
    ├── 02-python.mdc           # Python 3.14 patterns
    ├── 03-database.mdc         # PostgreSQL/multi-tenant
    ├── 04-workers.mdc          # BullMQ patterns
    ├── 05-api.mdc              # Fastify routes
    ├── 06-frontend.mdc         # React 19/Refine
    ├── 07-testing.mdc          # Test requirements
    └── 08-security.mdc         # Auth/RBAC/RLS
```

### 00-global.mdc

```markdown
---
description: Cerniq.app global coding standards governed by Master Spec v1.2
globs:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.py"
alwaysApply: true
---

# Cerniq.app Coding Standards

## Document Authority
- Master Spec v1.2 is the SINGLE SOURCE OF TRUTH
- When in doubt, search project docs before generating

## Technology Stack (MANDATORY VERSIONS)
- Node.js: 24.12.0 LTS "Krypton"
- Python: 3.14.2 Free-Threading
- PostgreSQL: 18.1
- React: 19.2.3
- Tailwind: 4.1.x
- Fastify: 5.6.2
- BullMQ: 5.66.4
- Redis: 7.4.7

## Architecture
- Vertical Slice Architecture (organize by feature, not layer)
- Medallion Data: Bronze → Silver → Gold
- Multi-tenant: EVERY query must include tenant_id
- Event-driven: All actions emit events with correlationId

## Forbidden Patterns
- NEVER use `any` type
- NEVER use default parameters
- NEVER use `shop_id` (use `tenant_id`)
- NEVER use `gold_hitl_tasks` (use `approval_tasks`)
- NEVER use email as user identifier (use UUID)
- NEVER create `UNIQUE(cui)` without tenant_id

## Anti-Hallucination
- ALWAYS validate AI outputs against database
- NEVER trust LLM for arithmetic - recalculate
- ALWAYS check product exists before offering
- ALWAYS verify stock > 0 before confirming
```

### 01-typescript.mdc

```markdown
---
description: TypeScript standards for Cerniq.app
globs:
  - "**/*.ts"
  - "**/*.tsx"
alwaysApply: false
---

# TypeScript Standards

## Strict Mode
- Enable all strict flags in tsconfig.json
- No implicit any, strict null checks, no unchecked indexed access

## Type Safety
- Explicit types for all function parameters and returns
- Use Zod for runtime validation
- Type guards instead of type assertions
- Derive types from Zod schemas: `type X = z.infer<typeof XSchema>`

## Error Handling
- Specific exception types, no catch-all
- Always re-throw unknown errors
- Use Result<T, E> pattern for expected failures

## Async
- async/await only, no callbacks or .then()
- Promise.all for parallel operations
- AbortController for cancellation
```

### 03-database.mdc

```markdown
---
description: PostgreSQL multi-tenant database standards
globs:
  - "**/*.sql"
  - "**/migrations/**"
  - "**/db/**"
alwaysApply: false
---

# Database Standards

## Multi-Tenant Contract
CRITICAL: Every tenant-scoped table MUST:
1. Have `tenant_id UUID NOT NULL` column
2. Use `UNIQUE(tenant_id, business_key)` NOT `UNIQUE(business_key)`
3. Have RLS policy: `USING (tenant_id = current_setting('app.current_tenant')::uuid)`

## Table Naming
- `bronze_*`: Raw ingestion data (append-only)
- `silver_*`: Validated/normalized data
- `gold_*`: Operational data
- `approval_*`: HITL tasks (centralized, NOT per-stage)

## Constraints
- Use descriptive names: `chk_status_valid`, `fk_company_tenant`
- Always add CHECK constraints for enums
- Foreign keys with ON DELETE policy

## Indexes
- Always index foreign keys
- Include tenant_id in all indexes for tenant queries
- Use partial indexes for active records
```

### 04-workers.mdc

```markdown
---
description: BullMQ worker standards
globs:
  - "**/workers/**"
  - "**/jobs/**"
  - "**/queues/**"
alwaysApply: false
---

# BullMQ Worker Standards

## Queue Naming
Pattern: `{layer}:{category}:{action}`
Examples:
- `bronze:ingest:csv-parser`
- `silver:validate:cui-anaf`
- `enrich:anaf:fiscal-status`
- `outreach:orchestrator:dispatch`

## Job Data
ALWAYS include:
- `tenantId`: string (UUID)
- `correlationId`: string (for tracing)
- `idempotencyKey`: string

## Worker Configuration
- Set concurrency based on rate limits
- Use limiter for external APIs
- Add error handler: `worker.on('error', ...)`
- Log job progress with `job.log()`

## Rate Limits
- ANAF: 1 req/sec
- Termene.ro: 20 req/sec
- Hunter.io: 15 req/sec
- TimelinesAI: 50 req/min per phone
- xAI Grok: 60 req/min
```

## 13.2 GitHub Copilot Instructions

### .github/copilot-instructions.md

```markdown
# Cerniq.app Copilot Instructions

## Project Context
B2B sales automation platform for Romanian agricultural market.
Master Spec v1.2 is the authoritative source for all decisions.

## Technology Stack (use these exact versions)
- Node.js 24.12.0, Python 3.14.2, PostgreSQL 18.1
- React 19.2.3, Tailwind 4.1.x, Fastify 5.6.2

## Architecture
- Vertical Slice: organize by feature (enrichment, outreach, sales-agent)
- Multi-tenant: ALL queries include tenant_id
- Event-driven: emit events with correlationId

## Code Style
- TypeScript: strict mode, no `any`, explicit types
- Python: type hints, Pydantic strict mode
- SQL: UNIQUE(tenant_id, key) NOT UNIQUE(key)

## Forbidden
- `shop_id` → use `tenant_id`
- `gold_hitl_tasks` → use `approval_tasks`
- email as user ID → use UUID
- default parameters
- catch-all exception handlers
```

### .github/instructions/workers.instructions.md

```markdown
---
applyTo: "**/workers/**"
---

# Worker-Specific Instructions

When writing BullMQ workers:

1. Queue name pattern: `{layer}:{category}:{action}`
2. Job data must include: tenantId, correlationId, idempotencyKey
3. Add rate limiter for external APIs
4. Log with job.log() and job.updateProgress()
5. Handle errors specifically, re-throw unknown
6. Set appropriate retry/backoff strategy

Rate limit reference:
- ANAF: 1/sec
- Termene: 20/sec
- xAI: 60/min
- TimelinesAI: 50/min per phone
```

---

## 14. CODE REVIEW CHECKLIST

## 14.1 Pre-Commit Checklist

```markdown
## Multi-Tenant
- [ ] No `UNIQUE(cui)` without tenant_id
- [ ] tenant_id included in all queries
- [ ] RLS policies defined for new tables

## Naming
- [ ] No `shop_id` (use `tenant_id`)
- [ ] No `gold_hitl_tasks` (use `approval_tasks`)
- [ ] No email as user identifier (use UUID)
- [ ] Queue names follow `{layer}:{category}:{action}` pattern

## Type Safety
- [ ] No `any` types
- [ ] Explicit parameter types
- [ ] Zod schemas for external input
- [ ] Return types specified

## Events
- [ ] correlationId in all jobs
- [ ] idempotencyKey for state changes
- [ ] Events emitted for relevant actions

## Testing
- [ ] Unit tests for new functions
- [ ] Contract tests for new events
- [ ] pgTAP tests for new constraints

## Security
- [ ] Input validation for user data
- [ ] CUI checksum verification
- [ ] Audit logging for HITL actions
```

## 14.2 Pull Request Template

```markdown
## Description
[Brief description of changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Checklist
- [ ] Tests pass locally
- [ ] Coverage maintained/improved
- [ ] No new TypeScript errors
- [ ] Follows naming conventions
- [ ] Multi-tenant contract respected
- [ ] Documentation updated

## Related Issues
Closes #XXX
```

---

## 15. DEPRECATED PATTERNS

## 15.1 Terminology Changes

| ❌ DEPRECATED | ✅ USE INSTEAD | Reason |
| --------------- | ---------------- | -------- |
| `shop_id` | `tenant_id` | Inconsistent naming |
| `gold_hitl_tasks` | `approval_tasks` | Per-stage → transversal |
| `assigned_to` (email) | `assigned_to` (UUID) | Identity contract |
| `current_stage` | `current_state` | FSM naming |
| `UNIQUE(cui)` | `UNIQUE(tenant_id, cui)` | Multi-tenant isolation |

## 15.2 Alias Mapping (pentru compatibilitate)

```typescript
// Pentru cod legacy - acceptă alias, scrie canonic
const LEGACY_ALIASES = {
  'shop_id': 'tenant_id',
  'current_stage': 'current_state',
  'assigned_phone_id': 'assigned_phone_number',
} as const;
```

## 15.3 Migration Path

```typescript
// Dacă găsești cod cu pattern-uri deprecated:
// 1. NU modifica inline
// 2. Creează migration dedicată
// 3. Testează în staging
// 4. Deploy cu feature flag dacă e necesar

// Exemplu migration pentru shop_id → tenant_id
ALTER TABLE legacy_table 
    RENAME COLUMN shop_id TO tenant_id;
```

---

## DOCUMENT CHANGELOG

| Version | Date | Author | Changes |
| --------- | ------ | -------- | --------- |
| 1.0 | 12 Jan 2026 | Alex | Initial version based on Master Spec v1.2 |

---

## END OF DOCUMENT

*Acest document este subordonat Master Spec v1.2 și trebuie actualizat la fiecare modificare a specificațiilor canonice.*
