# CERNIQ.APP — ETAPA 2: CODING STANDARDS & BEST PRACTICES
## Development Guidelines for Cold Outreach System
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. CODE ORGANIZATION

## 1.1 Worker File Structure

```
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

## 1.2 Worker Naming Conventions

```typescript
// File naming: {action}-{subject}.worker.ts
// Examples:
// - send-initial.worker.ts ✓
// - initialSend.worker.ts ✗
// - SendInitialWorker.ts ✗

// Queue naming: {stage}:{category}:{action}
// Examples:
// - outreach:orchestrator:dispatch ✓
// - q:wa:phone_01 ✓ (special case for per-phone)
// - outreachDispatch ✗

// Job naming in code:
export async function sendInitialProcessor(job: Job<T>): Promise<R> { }
// NOT: export async function processor(job: Job<T>): Promise<R> { }
```

---

# 2. WORKER IMPLEMENTATION STANDARDS

## 2.1 Standard Worker Template

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
    // 5. BUSINESS LOGIC
    const result = await performAction(job.data);

    // 6. METRICS
    metrics.workerDuration.observe(
      { worker: 'my-action', status: 'success' },
      (Date.now() - startTime) / 1000
    );
    metrics.workerTotal.inc({ worker: 'my-action', status: 'success' });

    // 7. SUCCESS LOGGING
    logger.info({
      jobId: job.id,
      correlationId,
      durationMs: Date.now() - startTime,
      action: 'my-action:complete',
    }, 'Processing completed');

    return result;

  } catch (error) {
    // 8. ERROR HANDLING - Structured with classification
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

    // 9. RETRYABLE VS NON-RETRYABLE
    if (errorType === 'RETRYABLE') {
      throw error; // BullMQ will retry
    } else {
      // Non-retryable: return failure result instead of throwing
      return { success: false, error: errorType };
    }
  }
}

// 10. HELPER FUNCTIONS - Private, below processor
function classifyError(error: unknown): string {
  if (error instanceof NetworkError) return 'RETRYABLE';
  if (error instanceof ValidationError) return 'VALIDATION_ERROR';
  if (error instanceof RateLimitError) return 'RATE_LIMITED';
  return 'UNKNOWN';
}
```

## 2.2 Worker Registration

```typescript
// workers/outreach/index.ts

import { Worker, Queue } from 'bullmq';
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
  // WhatsApp per-phone queues
  ...Array.from({ length: 20 }, (_, i) => ({
    name: `q:wa:phone_${String(i + 1).padStart(2, '0')}`,
    processor: sendInitialProcessor,
    concurrency: 1, // CRITICAL: Must be 1
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

# 3. DATABASE STANDARDS

## 3.1 Query Patterns

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
    .set({ engagementStage: 'WARM_REPLY' })
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

## 3.2 Index Usage

```typescript
// Always check query plans for new queries
// In development, log slow queries (>100ms)

// Composite indexes follow left-most prefix rule
// Index on (tenant_id, engagement_stage) supports:
// - WHERE tenant_id = X
// - WHERE tenant_id = X AND engagement_stage = Y
// Does NOT support:
// - WHERE engagement_stage = Y (alone)
```

---

# 4. API STANDARDS

## 4.1 Request Validation

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

## 4.2 Response Format

```typescript
// ALWAYS return consistent format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
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
});

// List with pagination
return reply.code(200).send({
  success: true,
  data: { leads },
  meta: { page: 1, limit: 20, total: 150, totalPages: 8 },
});
```

---

# 5. SPINTAX STANDARDS

## 5.1 Template Format

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

// Invalid patterns (avoid)
const invalidTemplates = [
  "{ Bună ziua | Salut }", // Spaces inside braces
  "{Bună ziua}",           // Single option (useless)
  "{{contact Name}}",      // Space in variable name
];
```

## 5.2 Spintax Processor

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

# 6. ERROR HANDLING STANDARDS

## 6.1 Error Classification

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

## 6.2 Error Handling in Workers

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

# 7. TESTING STANDARDS

## 7.1 Worker Unit Tests

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

    const job = createMockJob({ ... });

    await expect(sendInitialProcessor(job)).rejects.toThrow(QuotaExceededError);
  });
});
```

## 7.2 Integration Tests

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

    expect(updatedLead?.engagementStage).toBe('CONTACTED_WA');
  });
});
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2
