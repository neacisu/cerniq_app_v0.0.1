# CERNIQ.APP — ETAPA 2: DEVELOPMENT STANDARDS

## Coding Standards, Best Practices & Procedures for Cold Outreach System

### Versiunea 1.1 | 18 Ianuarie 2026

> **Notă:** Acest document consolidează `etapa2-standards.md` și `etapa2-standards-procedures.md` într-un singur ghid complet de dezvoltare.

---

## CUPRINS

1. [Code Organization](#1-code-organization)
2. [Worker Implementation Standards](#2-worker-implementation-standards)
3. [Database Standards](#3-database-standards)
4. [API Standards](#4-api-standards)
5. [Spintax Standards](#5-spintax-standards)
6. [Error Handling](#6-error-handling)
7. [Frontend Standards](#7-frontend-standards)
8. [Testing Standards](#8-testing-standards)
9. [Logging Standards](#9-logging-standards)
10. [Security Standards](#10-security-standards)

---

## 1. CODE ORGANIZATION

### 1.1 Worker File Structure

```text
workers/
├── outreach/
│   ├── index.ts                    # Worker registration
│   ├── quota/
│   │   ├── guardian-check.worker.ts
│   │   ├── guardian-increment.worker.ts
│   │   ├── guardian-reset.worker.ts
│   │   └── lua/
│   │       └── quota_check.lua
│   ├── orchestration/
│   │   ├── dispatch.worker.ts
│   │   ├── router.worker.ts
│   │   ├── phone-allocator.worker.ts
│   │   └── channel-selector.worker.ts
│   ├── whatsapp/
│   │   ├── send-initial.worker.ts
│   │   ├── send-followup.worker.ts
│   │   ├── reply-handler.worker.ts
│   │   └── status-sync.worker.ts
│   ├── email/
│   │   ├── cold-send.worker.ts
│   │   ├── warm-send.worker.ts
│   │   └── analytics-fetch.worker.ts
│   ├── webhook/
│   │   ├── timelinesai-ingest.worker.ts
│   │   ├── instantly-ingest.worker.ts
│   │   └── resend-ingest.worker.ts
│   ├── sequence/
│   │   ├── schedule-followup.worker.ts
│   │   ├── stop.worker.ts
│   │   └── advance.worker.ts
│   ├── ai/
│   │   ├── sentiment-analyze.worker.ts
│   │   ├── response-generate.worker.ts
│   │   └── intent-classify.worker.ts
│   ├── human/
│   │   ├── review-queue.worker.ts
│   │   ├── takeover-initiate.worker.ts
│   │   └── takeover-complete.worker.ts
│   └── monitoring/
│       ├── phone-health.worker.ts
│       ├── email-deliverability.worker.ts
│       └── quota-usage.worker.ts
```

### 1.2 Naming Conventions

#### 1.2.1 Worker File Naming

```typescript
// File naming: {action}-{subject}.worker.ts
// Examples:
// - send-initial.worker.ts ✓
// - initialSend.worker.ts ✗
// - SendInitialWorker.ts ✗
```

#### 1.2.2 Queue Naming

```typescript
// Queue naming: {stage}:{category}:{action}[:{variant}]
// Examples:
'quota:guardian:check'           // Etapa 2, Quota category, Check action
'outreach:orchestrator:dispatch' // Orchestrator dispatch
'q:wa:phone_01'                  // WhatsApp queue for phone 01 (special case)
'q:wa:phone_01:followup'         // Follow-up variant
'webhook:timelinesai:ingest'     // Webhook category, TimelinesAI source

// AVOID:
'outreachDispatch'               // ✗ No colons
'wa-phone-01'                    // ✗ Wrong separator
```

#### 1.2.3 TypeScript Interface Naming

```typescript
// Job data interface naming: {WorkerName}JobData
interface QuotaGuardianCheckJobData {
  correlationId: string;         // Always include for tracing
  tenantId: string;              // Always include for multi-tenant
  // ... specific fields
}

// Result interface naming: {WorkerName}Result
interface QuotaGuardianCheckResult {
  allowed: boolean;
  reason: string;
  // ... specific fields
}

// Use strict types, avoid `any`
// Use enums for fixed value sets
// Export all interfaces for reuse
```

---

## 2. WORKER IMPLEMENTATION STANDARDS

### 2.1 Standard Worker Template

```typescript
// workers/outreach/{category}/{action}.worker.ts

import { Job } from 'bullmq';
import { db } from '@cerniq/db';
import { logger } from '@cerniq/logger';
import { metrics } from '@cerniq/metrics';

// 1. TYPES - Always define explicit types
interface MyWorkerJobData {
  correlationId: string;
  tenantId: string;
  // ... specific fields
}

interface MyWorkerResult {
  success: boolean;
  // ... result fields
}

// 2. CONSTANTS - Define at top
const TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

// 3. PROCESSOR FUNCTION - Named export, descriptive name
export async function myActionProcessor(
  job: Job<MyWorkerJobData>
): Promise<MyWorkerResult> {
  const startTime = Date.now();
  const { correlationId, tenantId } = job.data;

  // 4. STRUCTURED LOGGING - Always include context
  logger.info({
    jobId: job.id,
    correlationId,
    tenantId,
    action: 'my-action:start',
  }, 'Processing started');

  try {
    // 5. PRE-VALIDATION
    validateJobData(job.data);
    
    // 6. BUSINESS LOGIC
    const result = await performAction(job.data);

    // 7. METRICS
    metrics.workerDuration.observe(
      { worker: 'my-action', status: 'success' },
      (Date.now() - startTime) / 1000
    );
    metrics.workerTotal.inc({ worker: 'my-action', status: 'success' });

    // 8. SUCCESS LOGGING
    logger.info({
      jobId: job.id,
      correlationId,
      durationMs: Date.now() - startTime,
      action: 'my-action:complete',
    }, 'Processing completed');

    return result;

  } catch (error) {
    // 9. ERROR HANDLING - Structured with classification
    const errorType = classifyError(error);
    
    metrics.workerTotal.inc({ worker: 'my-action', status: 'failed' });
    
    logger.error({
      jobId: job.id,
      correlationId,
      errorType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: 'my-action:error',
    }, 'Processing failed');

    // 10. RETRYABLE VS NON-RETRYABLE
    if (errorType === 'RETRYABLE') {
      throw error; // BullMQ will retry
    } else {
      // Non-retryable: move to DLQ or return failure
      await moveToDeadLetterQueue(job, error);
      return { success: false, error: errorType };
    }
  }
}

// 11. HELPER FUNCTIONS - Private, below processor
function classifyError(error: unknown): string {
  // Network errors - retry
  if (error instanceof Error) {
    if ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ETIMEDOUT') {
      return 'RETRYABLE';
    }
    // Rate limit - retry with backoff
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return 'RETRYABLE';
    }
  }
  if (error instanceof NetworkError) return 'RETRYABLE';
  if (error instanceof ValidationError) return 'VALIDATION_ERROR';
  if (error instanceof RateLimitError) return 'RATE_LIMITED';
  // Database constraint - don't retry
  if ((error as any)?.code === '23505' || (error as any)?.code === '23503') {
    return 'DB_CONSTRAINT';
  }
  return 'UNKNOWN';
}
```

### 2.2 Worker Registration

```typescript
// workers/outreach/index.ts

import { Worker, Queue, Job } from 'bullmq';
import { REDIS_CONNECTION } from '@cerniq/config';
import { logger } from '@cerniq/logger';

// Import all processors
import { quotaGuardianCheckProcessor } from './quota/guardian-check.worker';
import { sendInitialProcessor } from './whatsapp/send-initial.worker';
// ... all other processors

interface WorkerConfig {
  name: string;
  processor: (job: Job) => Promise<any>;
  concurrency: number;
  limiter?: { max: number; duration: number };
}

const WORKER_CONFIGS: WorkerConfig[] = [
  // Quota Guardian
  {
    name: 'quota:guardian:check',
    processor: quotaGuardianCheckProcessor,
    concurrency: 100,
  },
  // WhatsApp per-phone queues (CRITICAL: concurrency=1)
  ...Array.from({ length: 20 }, (_, i) => ({
    name: `q:wa:phone_${String(i + 1).padStart(2, '0')}`,
    processor: sendInitialProcessor,
    concurrency: 1, // CRITICAL: Must be 1 to prevent race conditions
  })),
  // ... other workers
];

export function startOutreachWorkers(): Worker[] {
  const workers: Worker[] = [];

  for (const config of WORKER_CONFIGS) {
    const worker = new Worker(
      config.name,
      config.processor,
      {
        connection: REDIS_CONNECTION,
        concurrency: config.concurrency,
        limiter: config.limiter,
      }
    );

    // Event handlers
    worker.on('completed', (job) => {
      logger.debug({ queue: config.name, jobId: job.id }, 'Job completed');
    });

    worker.on('failed', (job, error) => {
      logger.error({ queue: config.name, jobId: job?.id, error: error.message }, 'Job failed');
    });

    worker.on('error', (error) => {
      logger.error({ queue: config.name, error: error.message }, 'Worker error');
    });

    workers.push(worker);
    logger.info({ queue: config.name, concurrency: config.concurrency }, 'Worker started');
  }

  return workers;
}
```

---

## 3. DATABASE STANDARDS

### 3.1 Column Naming Conventions

```sql
-- Use snake_case for all columns
-- Prefix with table context if ambiguous

-- Standard columns for all tables:
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id UUID NOT NULL REFERENCES tenants(id)
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()

-- Foreign keys: {referenced_table_singular}_id
lead_id UUID REFERENCES gold_companies(id)
phone_id UUID REFERENCES wa_phone_numbers(id)

-- Boolean columns: is_{adjective} or has_{noun}
is_new_contact BOOLEAN DEFAULT true
has_media BOOLEAN DEFAULT false

-- Timestamp columns: {action}_at
sent_at TIMESTAMPTZ
delivered_at TIMESTAMPTZ
first_contact_at TIMESTAMPTZ

-- Count columns: {noun}_count
reply_count INTEGER DEFAULT 0
open_count INTEGER DEFAULT 0
```

### 3.2 Query Patterns

```typescript
// ALWAYS use tenant filtering
// BAD:
const leads = await db.select().from(goldLeadJourney);

// GOOD:
const leads = await db.select()
  .from(goldLeadJourney)
  .where(eq(goldLeadJourney.tenantId, tenantId));

// Use transactions for multi-table updates
await db.transaction(async (tx) => {
  await tx.update(goldLeadJourney)
    .set({ currentState: 'WARM_REPLY' })
    .where(eq(goldLeadJourney.leadId, leadId));
    
  await tx.insert(goldCommunicationLog).values({ ... });
});

// Use prepared statements for repeated queries
const getLeadByIdStmt = db.select()
  .from(goldLeadJourney)
  .where(eq(goldLeadJourney.leadId, sql.placeholder('leadId')))
  .prepare('get_lead_by_id');

const lead = await getLeadByIdStmt.execute({ leadId });
```

### 3.3 Index Standards

```sql
-- Always index foreign keys
CREATE INDEX idx_lead_journey_lead ON gold_lead_journey(lead_id);
CREATE INDEX idx_lead_journey_phone ON gold_lead_journey(assigned_phone_id);

-- Composite indexes for common query patterns
-- Most selective column first
CREATE INDEX idx_lead_journey_tenant_state ON gold_lead_journey(tenant_id, current_state);

-- Partial indexes for filtered queries
CREATE INDEX idx_lead_journey_review ON gold_lead_journey(tenant_id, requires_human_review)
  WHERE requires_human_review = TRUE;

-- Index naming conventions:
-- idx_{table}_{columns}
-- idx_unique_{table}_{columns} for unique indexes
```

**Index Usage Rules:**

```typescript
// Composite indexes follow left-most prefix rule
// Index on (tenant_id, current_state) supports:
// - WHERE tenant_id = X
// - WHERE tenant_id = X AND current_state = Y
// Does NOT support:
// - WHERE current_state = Y (alone)

// Always check query plans for new queries
// In development, log slow queries (>100ms)
```

### 3.4 Migration Standards

```typescript
// Drizzle migration file naming: {sequence}_{description}.ts (Etapa 2: 0200–0299)
// 0200_outreach_enums.ts
// 0201_gold_lead_journey.ts

// Always include rollback comments
// -- Rollback: DROP TABLE gold_lead_journey;

// Test migrations on staging before production
// Never modify existing migrations, create new ones
```

---

## 4. API STANDARDS

### 4.1 Endpoint Naming (RESTful)

```typescript
// Standard CRUD operations
GET    /api/v1/outreach/leads          // List
POST   /api/v1/outreach/leads          // Create
GET    /api/v1/outreach/leads/:id      // Get one
PATCH  /api/v1/outreach/leads/:id      // Partial update
DELETE /api/v1/outreach/leads/:id      // Delete

// Actions on resources
POST   /api/v1/outreach/leads/:id/send-message
POST   /api/v1/outreach/leads/:id/takeover
POST   /api/v1/outreach/sequences/:id/enroll

// Nested resources
GET    /api/v1/outreach/leads/:id/communications
GET    /api/v1/outreach/sequences/:id/steps
```

### 4.2 Request Validation

```typescript
// ALWAYS validate with Zod
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  channel: z.enum(['WHATSAPP', 'EMAIL']),
  content: z.string().min(10).max(5000),
  variables: z.array(z.object({
    name: z.string(),
    required: z.boolean().default(true),
  })).optional(),
});

// In route handler
fastify.post('/templates', {
  schema: {
    body: createTemplateSchema,
  },
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  const validated = request.body; // Already validated by Fastify
  // ...
});
```

### 4.3 Response Format

```typescript
// Success response interface
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;           // Machine-readable
    message: string;        // Human-readable
    details?: Record<string, any>;
    field?: string;         // For validation errors
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  requestId?: string;       // For tracing
  timestamp?: string;
}

// Success
return reply.code(200).send({
  success: true,
  data: result,
});

// Error
return reply.code(400).send({
  success: false,
  error: {
    code: 'INVALID_TRANSITION',
    message: 'Cannot transition from COLD to CONVERTED',
  },
  requestId: request.id,
});

// List with pagination
return reply.code(200).send({
  success: true,
  data: { leads },
  meta: { page: 1, limit: 20, total: 150, totalPages: 8 },
});

// Validation error (400)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "companyId": "Invalid UUID format"
    }
  },
  "requestId": "req-123"
}
```

---

## 5. SPINTAX STANDARDS

### 5.1 Template Format

```typescript
// Valid spintax patterns
const validTemplates = [
  // Simple alternatives
  "{Bună ziua|Salut|Hello} {{contactName}}!",
  
  // Nested alternatives
  "{Vă contactez|Scriu} {pentru|referitor la} {{companyName}}.",
  
  // Variables (double braces)
  "{{companyName}} din {{judet}}",
  
  // Mixed
  "{Bună ziua|Salut}, {{contactName}}! {Suntem|Reprezentăm} Cerniq.",
];

// Invalid patterns (AVOID)
const invalidTemplates = [
  "{ Bună ziua | Salut }", // Spaces inside braces
  "{Bună ziua}",           // Single option (useless)
  "{{contact Name}}",      // Space in variable name
];
```

### 5.2 Spintax Processor

```typescript
// utils/spintax.ts

export function processSpintax(
  template: string,
  variables: Record<string, string>
): string {
  // 1. Replace variables first
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  
  // 2. Process spintax (random selection)
  const spintaxRegex = /\{([^{}]+)\}/g;
  result = result.replace(spintaxRegex, (match, options) => {
    const choices = options.split('|');
    return choices[Math.floor(Math.random() * choices.length)];
  });
  
  // 3. Clean up extra whitespace
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

// ALWAYS use seeded random for testing
export function processSpintaxDeterministic(
  template: string,
  variables: Record<string, string>,
  seed: number
): string {
  // Use seed for reproducible tests
  const rng = seedrandom(seed.toString());
  // ... same logic but use rng() instead of Math.random()
}
```

---

## 6. ERROR HANDLING

### 6.1 Error Classes

```typescript
// errors/outreach.errors.ts

export class OutreachError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'OutreachError';
  }
}

// Specific error types
export class QuotaExceededError extends OutreachError {
  constructor(phoneId: string, currentUsage: number) {
    super(
      `Quota exceeded for phone ${phoneId}`,
      'QUOTA_EXCEEDED',
      false, // Not retryable
      { phoneId, currentUsage, limit: 200 }
    );
  }
}

export class PhoneOfflineError extends OutreachError {
  constructor(phoneId: string) {
    super(
      `Phone ${phoneId} is offline`,
      'PHONE_OFFLINE',
      true, // Retryable after phone reconnects
      { phoneId }
    );
  }
}

export class RateLimitedError extends OutreachError {
  constructor(service: string, retryAfter: number) {
    super(
      `${service} rate limited`,
      'RATE_LIMITED',
      true,
      { service, retryAfter }
    );
  }
}
```

### 6.2 Error Handling in Workers

```typescript
export async function sendInitialProcessor(job: Job<T>): Promise<R> {
  try {
    // ... business logic
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      // Don't retry, move to delayed queue
      await triggerQueue('outreach:wa:delay', {
        leadId: job.data.leadId,
        delayUntil: getNextBusinessDay(),
      });
      return { success: false, reason: 'QUOTA_EXCEEDED' };
    }
    
    if (error instanceof PhoneOfflineError) {
      // Trigger alert, let BullMQ retry
      await triggerAlert('phone:offline', { phoneId: error.details.phoneId });
      throw error; // Will retry
    }
    
    if (error instanceof RateLimitedError) {
      // Throw with custom backoff
      throw new Error('RATE_LIMITED'); // BullMQ will use configured backoff
    }
    
    // Unknown error - log and fail
    logger.error({ error }, 'Unexpected error');
    throw error;
  }
}
```

---

## 7. FRONTEND STANDARDS

### 7.1 Component Standards

```tsx
// File naming: PascalCase for components
// QuotaUsageGrid.tsx
// StageBadge.tsx
// ConversationTimeline.tsx

// Props interface naming: {ComponentName}Props
interface QuotaUsageGridProps {
  phones: Phone[];
  onPhoneClick?: (phoneId: string) => void;
}

// Use Shadcn/ui components as base
// Extend with Tailwind classes
// Never use inline styles or CSS files
```

### 7.2 State Management

```typescript
// Use React Query for server state
const { data: leads, isLoading } = useQuery({
  queryKey: ['leads', filters],
  queryFn: () => fetchLeads(filters),
  staleTime: 30_000,       // 30 seconds
  refetchInterval: 60_000, // 1 minute for dashboard
});

// Use React state for UI state
const [filters, setFilters] = useState<LeadFilters>({});
const [selectedLead, setSelectedLead] = useState<string | null>(null);

// Use URL params for shareable state
const [searchParams, setSearchParams] = useSearchParams();
const stage = searchParams.get('stage');
```

### 7.3 Error Handling

```tsx
// Always handle loading and error states
function LeadsPage() {
  const { data, isLoading, error } = useLeads(filters);

  if (isLoading) {
    return <LeadsTableSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load leads. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return <LeadsTable data={data} />;
}
```

---

## 8. TESTING STANDARDS

### 8.1 Test File Naming

```typescript
// Unit tests: {source}.test.ts
// quota-check.worker.test.ts

// Integration tests: {feature}.integration.test.ts
// outreach-flow.integration.test.ts
```

### 8.2 Unit Tests

```typescript
// workers/outreach/whatsapp/__tests__/send-initial.worker.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendInitialProcessor } from '../send-initial.worker';
import { createMockJob } from '@cerniq/testing';

describe('sendInitialProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send message and update lead state', async () => {
    const job = createMockJob<WaSendInitialJobData>({
      correlationId: 'test-123',
      leadId: 'lead-uuid',
      phoneId: 'phone-uuid',
      recipientPhone: '+40712345678',
      isNewContact: true,
    });

    const result = await sendInitialProcessor(job);

    expect(result.success).toBe(true);
    expect(result.quotaCost).toBe(1);
    expect(result.messageId).toBeDefined();
  });

  it('should throw on quota exceeded', async () => {
    // Mock quota check to return exceeded
    vi.mocked(redisClient.evalsha).mockResolvedValueOnce(
      JSON.stringify({ allowed: false, reason: 'QUOTA_EXCEEDED' })
    );

    const job = createMockJob({ /* ... */ });

    await expect(sendInitialProcessor(job)).rejects.toThrow(QuotaExceededError);
  });
});
```

### 8.3 Integration Tests

```typescript
// tests/integration/outreach/phone-flow.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from '@cerniq/testing';

describe('WhatsApp Phone Flow', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    await seedTestData();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should process new contact flow end-to-end', async () => {
    // 1. Create lead
    const lead = await createTestLead({ stage: 'COLD' });

    // 2. Trigger dispatch
    await triggerQueue('outreach:orchestrator:dispatch', {
      tenantId: testTenantId,
      batchSize: 1,
    });

    // 3. Wait for processing
    await waitForJobCompletion('q:wa:phone_01');

    // 4. Verify lead state changed
    const updatedLead = await db.query.goldLeadJourney.findFirst({
      where: eq(goldLeadJourney.leadId, lead.id),
    });

    expect(updatedLead?.currentState).toBe('CONTACTED_WA');
    expect(updatedLead?.isNewContact).toBe(false);
    
    // 5. Verify communication logged
    const logs = await db.query.goldCommunicationLog.findMany({
      where: eq(goldCommunicationLog.leadJourneyId, lead.id),
    });
    
    expect(logs).toHaveLength(1);
    expect(logs[0].quotaCost).toBe(1);
  });
});
```

---

## 9. LOGGING STANDARDS

### 9.1 Log Levels

```typescript
// ERROR: System errors, failed operations
logger.error({ err, jobId }, 'Failed to send WhatsApp message');

// WARN: Recoverable issues, degraded state
logger.warn({ phoneId, quota }, 'Phone quota nearly exhausted');

// INFO: Important business events
logger.info({ leadId, stage }, 'Lead transitioned to WARM_REPLY');

// DEBUG: Detailed diagnostic info (production: disabled)
logger.debug({ payload }, 'TimelinesAI webhook received');
```

### 9.2 Structured Logging

```typescript
// Always use structured logging
// Include: correlationId, tenantId, action, duration

logger.info({
  correlationId: job.data.correlationId,
  tenantId: job.data.tenantId,
  action: 'WHATSAPP_SEND',
  leadId: job.data.leadId,
  phoneId: job.data.phoneId,
  duration: Date.now() - startTime,
  quotaCost: 1,
}, 'WhatsApp message sent successfully');
```

### 9.3 Sensitive Data

```typescript
// Never log sensitive data:
// - Full phone numbers (mask: +40****1234)
// - Email addresses (mask: t***@example.com)
// - Message content (use hash or preview only)
// - API keys or tokens

function maskPhone(phone: string): string {
  return phone.slice(0, 4) + '****' + phone.slice(-4);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return local[0] + '***@' + domain;
}
```

---

## 10. SECURITY STANDARDS

### 10.1 Input Validation

```typescript
// Validate all external input:
// - API request bodies
// - Query parameters
// - Webhook payloads
// - File uploads

// Use Zod schemas
// Sanitize HTML content
// Validate UUID formats
```

### 10.2 Rate Limiting

```typescript
// API rate limits per tenant
const RATE_LIMITS = {
  default: { max: 100, window: '1m' },
  webhooks: { max: 1000, window: '1m' },
  heavy: { max: 10, window: '1m' },
};

// Apply at route level
fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.tenantId,
});
```

### 10.3 Secrets Management

```typescript
// Never commit secrets to git
// Use Docker secrets in production
// Environment variables for development

// Required secrets for Etapa 2:
// - TIMELINESAI_API_KEY
// - TIMELINESAI_WEBHOOK_SECRET
// - INSTANTLY_API_KEY
// - RESEND_API_KEY
// - ANTHROPIC_API_KEY (for sentiment)
```

---

## Document History

| Versiune | Data | Modificări |
| -------- | ---- | ---------- |
| 1.0 | 15 Ianuarie 2026 | Versiune inițială (2 documente separate) |
| 1.1 | 18 Ianuarie 2026 | Consolidare `etapa2-standards.md` + `etapa2-standards-procedures.md` |

---

**Document generat:** 18 Ianuarie 2026  
**Consolidat din:** `etapa2-standards.md` + `etapa2-standards-procedures.md`  
**Conformitate:** Master Spec v1.2
