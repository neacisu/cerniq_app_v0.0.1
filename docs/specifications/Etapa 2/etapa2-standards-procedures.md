# CERNIQ.APP — ETAPA 2: STANDARDS & PROCEDURES
## Development Standards for Cold Outreach Module
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. CODE STANDARDS

## 1.1 Worker Naming Convention

```typescript
// Queue naming: {stage}:{category}:{action}[:{variant}]
// Examples:
'quota:guardian:check'           // Etapa 2, Quota category, Check action
'q:wa:phone_01'                  // WhatsApp queue for phone 01
'q:wa:phone_01:followup'         // Follow-up variant
'webhook:timelinesai:ingest'     // Webhook category, TimelinesAI source

// Worker file naming:
// workers/{category}/{action}.worker.ts
// workers/quota/guardian-check.worker.ts
// workers/whatsapp/send-initial.worker.ts
```

## 1.2 TypeScript Interface Standards

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

## 1.3 Error Handling Standard

```typescript
// All workers must follow this pattern:
export async function workerProcessor(job: Job<TJobData>): Promise<TResult> {
  const startTime = Date.now();
  const { correlationId, tenantId } = job.data;

  try {
    // Pre-validation
    validateJobData(job.data);
    
    // Main logic
    const result = await processJob(job.data);
    
    // Post-processing logging
    logger.info({
      correlationId,
      tenantId,
      jobId: job.id,
      duration: Date.now() - startTime,
    }, 'Job completed successfully');
    
    return result;
    
  } catch (error) {
    // Classify error for retry decision
    const isRetryable = classifyError(error);
    
    logger.error({
      correlationId,
      tenantId,
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      isRetryable,
    }, 'Job failed');
    
    if (!isRetryable) {
      // Move to DLQ
      await moveToDeadLetterQueue(job, error);
    }
    
    throw error; // BullMQ handles retry
  }
}

// Error classification
function classifyError(error: Error): boolean {
  // Network errors - retry
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return true;
  }
  
  // Rate limit - retry with backoff
  if (error.message.includes('429') || error.message.includes('rate limit')) {
    return true;
  }
  
  // Validation errors - don't retry
  if (error instanceof ValidationError) {
    return false;
  }
  
  // Database constraint - don't retry
  if (error.code === '23505' || error.code === '23503') {
    return false;
  }
  
  // Default: retry once
  return true;
}
```

---

# 2. DATABASE STANDARDS

## 2.1 Column Naming

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

## 2.2 Index Standards

```sql
-- Always index foreign keys
CREATE INDEX idx_lead_journey_lead ON gold_lead_journey(lead_id);
CREATE INDEX idx_lead_journey_phone ON gold_lead_journey(assigned_phone_id);

-- Composite indexes for common query patterns
-- Most selective column first
CREATE INDEX idx_lead_journey_tenant_stage ON gold_lead_journey(tenant_id, engagement_stage);

-- Partial indexes for filtered queries
CREATE INDEX idx_lead_journey_review ON gold_lead_journey(tenant_id, requires_human_review)
  WHERE requires_human_review = TRUE;

-- Index naming: idx_{table}_{columns}
-- Unique index naming: idx_unique_{table}_{columns}
```

## 2.3 Migration Standards

```typescript
// Drizzle migration file naming: {sequence}_{description}.ts
// 0050_outreach_enums.ts
// 0051_gold_lead_journey.ts

// Always include rollback comments
// -- Rollback: DROP TABLE gold_lead_journey;

// Test migrations on staging before production
// Never modify existing migrations, create new ones
```

---

# 3. API STANDARDS

## 3.1 Response Format

```typescript
// Success response
interface SuccessResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
}

// Error response
interface ErrorResponse {
  error: {
    code: string;           // Machine-readable
    message: string;        // Human-readable
    details?: Record<string, any>;
    field?: string;         // For validation errors
  };
  requestId: string;
  timestamp: string;
}

// Always include requestId for tracing
// Use appropriate HTTP status codes
```

## 3.2 Endpoint Naming

```typescript
// RESTful conventions
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

## 3.3 Validation Standards

```typescript
// Use Zod for all validation
const createLeadSchema = z.object({
  companyId: z.string().uuid(),
  channel: z.enum(['WHATSAPP', 'EMAIL']),
  sequenceId: z.string().uuid().optional(),
  tags: z.array(z.string()).max(10).optional(),
});

// Validate at route level
fastify.post('/leads', {
  schema: {
    body: createLeadSchema,
  },
}, handler);

// Return 400 with field-level errors
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "companyId": "Invalid UUID format"
    }
  }
}
```

---

# 4. FRONTEND STANDARDS

## 4.1 Component Standards

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

## 4.2 State Management

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

## 4.3 Error Handling

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

# 5. TESTING STANDARDS

## 5.1 Unit Tests

```typescript
// Test file naming: {source}.test.ts
// quota-check.worker.test.ts

// Use Vitest
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('QuotaGuardianCheck', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should allow follow-up messages without quota check', async () => {
    const result = await quotaCheck({
      isNewContact: false,
      phoneId: 'test-phone',
    });
    
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('QUOTA_OK');
  });

  it('should reject when quota exceeded', async () => {
    // Setup: set quota to 200
    await redis.set('quota:wa:test-phone:2026-01-15', '200');
    
    const result = await quotaCheck({
      isNewContact: true,
      phoneId: 'test-phone',
    });
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('QUOTA_EXCEEDED');
  });
});
```

## 5.2 Integration Tests

```typescript
// Test file naming: {feature}.integration.test.ts
// outreach-flow.integration.test.ts

describe('Outreach Flow Integration', () => {
  it('should complete full new contact flow', async () => {
    // 1. Create lead
    const lead = await createTestLead();
    
    // 2. Dispatch
    await triggerDispatch(lead.id);
    
    // 3. Wait for queue processing
    await waitForJob('q:wa:phone_01');
    
    // 4. Verify state change
    const updatedLead = await db.query.goldLeadJourney.findFirst({
      where: eq(goldLeadJourney.leadId, lead.id),
    });
    
    expect(updatedLead.engagementStage).toBe('CONTACTED_WA');
    expect(updatedLead.isNewContact).toBe(false);
    
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

# 6. LOGGING STANDARDS

## 6.1 Log Levels

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

## 6.2 Structured Logging

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

// Never log sensitive data
// - Full phone numbers (mask: +40****)
// - Email addresses (mask: t***@example.com)
// - Message content (use hash or preview only)
```

---

# 7. SECURITY STANDARDS

## 7.1 Input Validation

```typescript
// Validate all external input
// - API request bodies
// - Query parameters
// - Webhook payloads
// - File uploads

// Use Zod schemas
// Sanitize HTML content
// Validate UUID formats
```

## 7.2 Rate Limiting

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

## 7.3 Secrets Management

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

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2, Coding Standards
