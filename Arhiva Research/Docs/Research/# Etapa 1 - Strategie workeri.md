# Cerniq.app Stage 1 Worker Architecture Documentation

**BullMQ v5.66.0 + Redis 7.4.7** powers the data enrichment pipeline for Romania's **2.86 million agricultural prospects**. This architecture deploys **granular workers**—one per field/data source—enabling independent scaling, rate limiting, and fault isolation. The system processes CUI validation through ANAF, company lookups via Lista Firme/Termene.ro, email discovery with Hunter.io, and agricultural registry data from APIA/MADR, all orchestrated through BullMQ's FlowProducer for complex dependency chains.

The architecture runs on Hetzner bare metal (20 cores, 128GB RAM) with Redis configured for **100GB maxmemory with noeviction policy**—critical for queue integrity. GDPR compliance under Article 6(1)(f) legitimate interest requires documented Legitimate Interest Assessments, with special attention to Romanian Legea 190/2018 which mandates DPO appointment for CNP data processing.

---

## BullMQ granular worker design enables field-level isolation

Each data enrichment field operates as an independent worker with dedicated queue, rate limits, and retry strategies. BullMQ v5.66.0 eliminates QueueScheduler dependency—delayed jobs are handled directly by workers.

### Queue naming follows domain-based hierarchy

```typescript
const ENRICHMENT_QUEUES = {
  // Romanian government data
  'enrichment:anaf:cui-validation': { concurrency: 50, limiter: { max: 100, duration: 1000 } },
  'enrichment:anaf:fiscal-status': { concurrency: 30, limiter: { max: 60, duration: 1000 } },
  'enrichment:onrc:company-lookup': { concurrency: 20, limiter: { max: 30, duration: 1000 } },
  'enrichment:termene:legal-data': { concurrency: 15, limiter: { max: 20, duration: 1000 } },
  
  // Agricultural registries
  'enrichment:apia:farmer-registry': { concurrency: 10, limiter: { max: 10, duration: 1000 } },
  'enrichment:anif:ouai-lookup': { concurrency: 5, limiter: { max: 5, duration: 1000 } },
  
  // Contact enrichment
  'enrichment:email:discovery': { concurrency: 30, limiter: { max: 300, duration: 60000 } },
  'enrichment:email:verification': { concurrency: 100, limiter: { max: 50000, duration: 3600000 } },
  'enrichment:phone:validation': { concurrency: 50, limiter: { max: 1000, duration: 1000 } },
  
  // Web scraping
  'enrichment:web:content-extraction': { concurrency: 20, limiter: { max: 100, duration: 1000 } },
  'enrichment:web:tech-detection': { concurrency: 10, limiter: { max: 50, duration: 1000 } },
  
  // Aggregation
  'enrichment:aggregation:merge': { concurrency: 50 },
  'enrichment:aggregation:quality-score': { concurrency: 30 },
} as const;
```

### Worker factory pattern standardizes configuration

```typescript
import { Worker, Queue, Job, FlowProducer } from 'bullmq';
import IORedis from 'ioredis';

interface WorkerConfig<T, R> {
  queueName: string;
  processor: (job: Job<T, R>) => Promise<R>;
  concurrency: number;
  limiter?: { max: number; duration: number };
  attempts?: number;
  backoffDelay?: number;
}

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: null, // Required for BullMQ workers
  enableOfflineQueue: true,
});

function createEnrichmentWorker<T, R>(config: WorkerConfig<T, R>): Worker<T, R> {
  const worker = new Worker<T, R>(
    config.queueName,
    config.processor,
    {
      connection,
      concurrency: config.concurrency,
      limiter: config.limiter,
      autorun: false,
      lockDuration: 60000,
      stalledInterval: 30000,
      maxStalledCount: 2,
    }
  );

  worker.on('error', (err) => logger.error({ queue: config.queueName, error: err }, 'Worker error'));
  worker.on('failed', (job, err) => logger.warn({ jobId: job?.id, error: err.message }, 'Job failed'));
  worker.on('stalled', (jobId) => metrics.increment('jobs.stalled', { queue: config.queueName }));

  return worker;
}
```

### FlowProducer orchestrates enrichment pipelines

The enrichment pipeline chains workers through parent-child relationships. Children must complete before the parent processes, enabling data aggregation from multiple sources.

```typescript
const flowProducer = new FlowProducer({ connection });

async function createEnrichmentFlow(prospect: ProspectInput) {
  return flowProducer.add({
    name: 'aggregate-enrichment',
    queueName: 'enrichment:aggregation:merge',
    data: { prospectId: prospect.id, cui: prospect.cui },
    children: [
      {
        name: 'anaf-validation',
        queueName: 'enrichment:anaf:cui-validation',
        data: { cui: prospect.cui },
        opts: { failParentOnFailure: true, attempts: 5 }
      },
      {
        name: 'company-lookup',
        queueName: 'enrichment:termene:legal-data',
        data: { cui: prospect.cui },
        opts: { failParentOnFailure: false }, // Optional enrichment
        children: [
          {
            name: 'email-discovery',
            queueName: 'enrichment:email:discovery',
            data: { domain: prospect.website },
            opts: { ignoreDependencyOnFailure: true }
          }
        ]
      },
      {
        name: 'agricultural-data',
        queueName: 'enrichment:apia:farmer-registry',
        data: { farmerId: prospect.farmerId },
        opts: { failParentOnFailure: false }
      }
    ]
  });
}
```

---

## Romanian government APIs provide authoritative business data

### ANAF API validates CUI and VAT status without authentication

The Romanian tax authority provides free REST API access for company validation—**100 CUIs per request, 1 request/second rate limit**.

```typescript
interface ANAFValidationJob {
  cui: number;
  date: string; // YYYY-MM-DD format
}

interface ANAFResponse {
  denumire: string;
  adresa: string;
  nrRegCom: string;
  scpTVA: boolean;
  statusInactivi: boolean;
  statusRO_e_Factura: boolean;
  stare_inregistrare: string;
}

const anafWorker = createEnrichmentWorker<ANAFValidationJob, ANAFResponse>({
  queueName: 'enrichment:anaf:cui-validation',
  concurrency: 50,
  limiter: { max: 1, duration: 1000 }, // 1 req/sec strict limit
  processor: async (job) => {
    const response = await axios.post(
      'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v9/ws/tva',
      [{ cui: job.data.cui, data: job.data.date }],
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (response.data.found.length === 0) {
      throw new Error('CUI_NOT_FOUND');
    }
    
    return response.data.found[0];
  }
});
```

### Commercial providers aggregate Romanian business intelligence

| Provider | Best For | Rate Limits | Pricing Model |
|----------|----------|-------------|---------------|
| **Lista Firme** | Comprehensive company data | Credit-based | 1-5 credits/query |
| **Termene.ro** | Legal/insolvency data | Subscription | Monthly plans |
| **Risco.ro** | Financial analysis | API key | Per-query |
| **OpenAPI.ro** | Developer-friendly | 100/mo free | 99-499 RON/mo |

```typescript
// Termene.ro worker for legal/financial data
const termeneWorker = createEnrichmentWorker({
  queueName: 'enrichment:termene:legal-data',
  concurrency: 15,
  limiter: { max: 20, duration: 1000 },
  processor: async (job) => {
    const response = await termeneClient.getCompanyInfo(job.data.cui);
    return {
      insolvencyStatus: response.bpiMentions,
      courtCases: response.courtCases,
      anafDebts: response.anafDebts,
      riskScore: response.riskIndicator,
      turnover: response.cifraAfaceri,
      employees: response.salariati,
    };
  }
});
```

### Agricultural registry access requires alternative approaches

APIA and MADR do not provide public APIs. Data access options:

- **APIA LPIS Portal**: Farmer-only access via lpis.apia.org.ro
- **ANIF Registry**: Monthly PDF exports of OUAI organizations by county
- **ONRC data.gov.ro**: CC-BY-4.0 licensed CSV exports of company registrations
- **FOIA Requests**: Law 544/2001 enables public data requests

```typescript
// OUAI lookup from pre-imported ANIF registry data
const ouaiWorker = createEnrichmentWorker({
  queueName: 'enrichment:anif:ouai-lookup',
  concurrency: 5,
  processor: async (job) => {
    // Query internal database populated from ANIF PDFs
    return db.ouaiRegistry.findFirst({
      where: { cui: job.data.cui, judet: job.data.county }
    });
  }
});
```

---

## Contact enrichment follows waterfall pattern with verification

### Email discovery chains Hunter.io → Snov.io → Apollo.io

Hunter.io provides **35-45% discovery rate** with GDPR compliance. Waterfall to secondary providers maximizes coverage.

```typescript
interface EmailDiscoveryResult {
  email: string | null;
  confidence: number;
  source: 'hunter' | 'snov' | 'apollo';
  position?: string;
  verified: boolean;
}

const emailDiscoveryWorker = createEnrichmentWorker({
  queueName: 'enrichment:email:discovery',
  concurrency: 30,
  limiter: { max: 15, duration: 1000 }, // Hunter.io: 15 req/sec
  processor: async (job): Promise<EmailDiscoveryResult> => {
    // Try Hunter.io first (1 credit)
    const hunterResult = await hunterClient.findEmail({
      domain: job.data.domain,
      first_name: job.data.firstName,
      last_name: job.data.lastName,
    });
    
    if (hunterResult.score >= 80) {
      return {
        email: hunterResult.email,
        confidence: hunterResult.score,
        source: 'hunter',
        position: hunterResult.position,
        verified: false, // Requires verification step
      };
    }
    
    // Fallback to Snov.io
    const snovResult = await snovClient.getEmailsByUrl(job.data.linkedinUrl);
    if (snovResult.emails.length > 0) {
      return {
        email: snovResult.emails[0].email,
        confidence: snovResult.emails[0].probability * 100,
        source: 'snov',
        verified: false,
      };
    }
    
    return { email: null, confidence: 0, source: 'hunter', verified: false };
  }
});
```

### ZeroBounce verification guarantees deliverability

**99.6% accuracy** with AI scoring for engagement prediction. Response categories: `valid`, `invalid`, `catch-all`, `spamtrap`, `abuse`, `do_not_mail`, `unknown`.

```typescript
interface EmailVerificationResult {
  status: 'valid' | 'invalid' | 'catch-all' | 'unknown' | 'spamtrap' | 'abuse';
  deliverable: boolean;
  freeEmail: boolean;
  mxFound: boolean;
  smtpProvider: string;
  aiScore?: number;
}

const emailVerificationWorker = createEnrichmentWorker({
  queueName: 'enrichment:email:verification',
  concurrency: 100,
  limiter: { max: 50000, duration: 3600000 }, // 50k/hour
  processor: async (job): Promise<EmailVerificationResult> => {
    const result = await zeroBounce.validate(job.data.email);
    
    return {
      status: result.status,
      deliverable: result.status === 'valid',
      freeEmail: result.free_email,
      mxFound: result.mx_found === 'true',
      smtpProvider: result.smtp_provider,
      aiScore: result.sub_status === '' ? undefined : parseFloat(result.sub_status),
    };
  }
});
```

### Twilio Lookup validates Romanian phone numbers

Basic validation is **free**; Line Type Intelligence costs **$0.008/request**.

```typescript
const phoneValidationWorker = createEnrichmentWorker({
  queueName: 'enrichment:phone:validation',
  concurrency: 50,
  limiter: { max: 1000, duration: 1000 },
  processor: async (job) => {
    const lookup = await twilioClient.lookups.v2
      .phoneNumbers(job.data.phone)
      .fetch({ fields: 'line_type_intelligence' });
    
    return {
      valid: lookup.valid,
      countryCode: lookup.countryCode, // 'RO' for Romania
      nationalFormat: lookup.nationalFormat,
      lineType: lookup.lineTypeIntelligence?.type, // 'mobile' | 'landline'
      carrier: lookup.lineTypeIntelligence?.carrier_name,
    };
  }
});
```

---

## Redis 7.4.7 configuration optimizes queue workloads

### Memory allocation reserves 100GB for queues with noeviction policy

```conf
# CRITICAL: BullMQ requires noeviction
maxmemory 100gb
maxmemory-policy noeviction

# Persistence: Hybrid AOF + RDB
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes
save 900 1
save 300 100
save 60 10000

# Performance tuning
tcp-backlog 65536
maxclients 50000
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
activedefrag yes
active-defrag-threshold-lower 10
active-defrag-threshold-upper 25

# Redis 7.4 feature: Hash field expiration for job metadata
# Use HEXPIRE for per-field TTLs on job metadata hashes

# Security
hide-user-data-from-log yes
```

### Connection pooling separates producers from workers

```typescript
// Producer connection: fail fast
const producerConnection = new IORedis({
  host: process.env.REDIS_HOST,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  connectTimeout: 10000,
});

// Worker connection: retry indefinitely
const workerConnection = new IORedis({
  host: process.env.REDIS_HOST,
  maxRetriesPerRequest: null, // CRITICAL for BullMQ
  enableOfflineQueue: true,
  retryStrategy: (times) => Math.min(Math.exp(times), 20000),
});
```

---

## Circuit breakers protect external API integrations

Opossum circuit breaker opens at **50% error threshold**, resets after **30 seconds**.

```typescript
import CircuitBreaker from 'opossum';

const createAPIBreaker = (apiCall: Function, name: string) => {
  const breaker = new CircuitBreaker(apiCall, {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
    rollingCountTimeout: 10000,
  });

  breaker.on('open', () => logger.warn({ api: name }, 'Circuit OPEN'));
  breaker.on('halfOpen', () => logger.info({ api: name }, 'Circuit HALF-OPEN'));
  breaker.on('close', () => logger.info({ api: name }, 'Circuit CLOSED'));

  breaker.fallback(() => ({ status: 'circuit_open', cached: true }));

  return breaker;
};

const anafBreaker = createAPIBreaker(callANAF, 'anaf');
const hunterBreaker = createAPIBreaker(callHunter, 'hunter');
const termeneBreaker = createAPIBreaker(callTermene, 'termene');
```

### Dynamic rate limiting handles 429 responses

```typescript
const rateLimitedWorker = new Worker('api-queue', async (job) => {
  const response = await apiBreaker.fire(job.data);
  
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers['retry-after']) * 1000 || 60000;
    await worker.rateLimit(retryAfter);
    throw Worker.RateLimitError();
  }
  
  return response.data;
}, {
  connection: workerConnection,
  limiter: { max: 100, duration: 1000 },
  settings: {
    backoffStrategy: (attempts, type, err) => {
      if (err.message.includes('RATE_LIMITED')) return 60000;
      return Math.min(attempts * 1000, 30000);
    }
  }
});
```

---

## Data quality tiers classify enrichment completeness

### Bronze/Silver/Gold scoring based on field coverage

```typescript
interface EnrichmentResult {
  prospect: Prospect;
  tier: 'bronze' | 'silver' | 'gold';
  score: number;
  fields: Record<string, FieldResult>;
}

interface FieldResult {
  value: any;
  source: string;
  confidence: number;
  verified: boolean;
  timestamp: string;
}

const TIER_THRESHOLDS = {
  gold: { minFields: 12, minConfidence: 0.85, requiresVerifiedEmail: true },
  silver: { minFields: 8, minConfidence: 0.70, requiresVerifiedEmail: false },
  bronze: { minFields: 4, minConfidence: 0.50, requiresVerifiedEmail: false },
};

function calculateQualityTier(result: EnrichmentResult): string {
  const filledFields = Object.values(result.fields).filter(f => f.value !== null).length;
  const avgConfidence = Object.values(result.fields)
    .reduce((sum, f) => sum + f.confidence, 0) / Object.keys(result.fields).length;
  const hasVerifiedEmail = result.fields.email?.verified === true;

  if (filledFields >= 12 && avgConfidence >= 0.85 && hasVerifiedEmail) return 'gold';
  if (filledFields >= 8 && avgConfidence >= 0.70) return 'silver';
  return 'bronze';
}
```

### JSON Schema validates worker outputs

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ANAFValidationResult",
  "type": "object",
  "required": ["cui", "denumire", "scpTVA", "statusInactivi"],
  "properties": {
    "cui": { "type": "string", "pattern": "^[0-9]{1,10}$" },
    "denumire": { "type": "string", "minLength": 1 },
    "adresa": { "type": "string" },
    "nrRegCom": { "type": "string", "pattern": "^J[0-9]{2}/[0-9]+/[0-9]{4}$" },
    "scpTVA": { "type": "boolean" },
    "statusInactivi": { "type": "boolean" },
    "statusRO_e_Factura": { "type": "boolean" },
    "stare_inregistrare": { "type": "string" }
  }
}
```

---

## OpenTelemetry integration enables distributed tracing

### BullMQ telemetry uses official bullmq-otel package

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BullMQOtel } from 'bullmq-otel';
import { Queue, Worker } from 'bullmq';

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'cerniq-enrichment-workers',
    'deployment.environment': process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://signoz:4318/v1/traces',
  }),
});

sdk.start();

const bullmqTelemetry = new BullMQOtel('cerniq-enrichment');

const queue = new Queue('enrichment:anaf:cui-validation', {
  connection,
  telemetry: bullmqTelemetry,
});

const worker = new Worker('enrichment:anaf:cui-validation', processor, {
  connection,
  telemetry: bullmqTelemetry,
  metrics: { maxDataPoints: MetricsTime.TWO_WEEKS },
});
```

### Structured logging with Pino includes trace context

```typescript
import pino from 'pino';
import { trace } from '@opentelemetry/api';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    log: (log) => {
      const span = trace.getActiveSpan();
      if (span) {
        const { traceId, spanId } = span.spanContext();
        return { ...log, trace_id: traceId, span_id: spanId };
      }
      return log;
    }
  },
  base: {
    service: 'cerniq-enrichment',
    environment: process.env.NODE_ENV,
  },
  redact: ['password', 'apiKey', 'token', '*.cnp'],
});
```

### Custom metrics track queue health

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('cerniq-enrichment');

const jobsProcessed = meter.createCounter('worker.jobs.processed');
const jobsFailed = meter.createCounter('worker.jobs.failed');
const jobDuration = meter.createHistogram('worker.job.duration', {
  unit: 'ms',
  advice: { explicitBucketBoundaries: [10, 50, 100, 250, 500, 1000, 2500, 5000] }
});

meter.createObservableGauge('worker.queue.depth', async (result) => {
  for (const [queueName, queue] of Object.entries(queues)) {
    const counts = await queue.getJobCounts();
    result.observe(counts.waiting, { queue: queueName, status: 'waiting' });
    result.observe(counts.active, { queue: queueName, status: 'active' });
    result.observe(counts.failed, { queue: queueName, status: 'failed' });
  }
});
```

---

## GDPR compliance requires documented legitimate interest

### Article 6(1)(f) justifies B2B agricultural prospecting

Processing business contact data for agricultural sales automation qualifies under legitimate interest when:

1. **Interest is lawful**: B2B prospecting to farms and cooperatives serves commercial purposes
2. **Processing is necessary**: No less intrusive means to reach Romanian agricultural businesses
3. **Balancing favors controller**: Business contacts reasonably expect professional communications

### Romanian Legea 190/2018 mandates DPO for CNP processing

**Critical requirement**: If processing CNP (Cod Numeric Personal) under legitimate interest, a Data Protection Officer must be appointed and registered with ANSPDCP. **Recommendation: Avoid CNP collection**—use CUI (company tax ID) instead.

### Data retention periods per field type

| Data Category | Retention Period | Legal Basis |
|---------------|-----------------|-------------|
| Active prospect data | 24 months from last interaction | Purpose limitation |
| Customer contacts | Business relationship + 6 years | Romanian civil code |
| Opt-out/suppression lists | Indefinite | Compliance requirement |
| Audit logs | 3 years | Security legitimate interest |
| Government registry data | Until outdated or objection | Purpose limitation |

### Audit logging tracks all data access

```typescript
interface AuditLogEntry {
  timestamp: string;
  userId: string;
  action: 'VIEW' | 'EDIT' | 'DELETE' | 'EXPORT' | 'ENRICH';
  dataCategory: string;
  dataSubjectId: string;
  legalBasis: 'LEGITIMATE_INTEREST' | 'CONTRACT' | 'CONSENT';
  ipAddress: string;
  correlationId: string;
}

async function logDataAccess(entry: Omit<AuditLogEntry, 'timestamp' | 'correlationId'>) {
  await auditQueue.add('audit-log', {
    ...entry,
    timestamp: new Date().toISOString(),
    correlationId: getCorrelationContext()?.correlationId,
  });
}
```

---

## Human-in-the-loop interfaces enable manual intervention

### Queue management API exposes worker controls

```typescript
// Fastify routes for queue management
fastify.get('/api/queues', async () => {
  const queueStats = await Promise.all(
    Object.entries(queues).map(async ([name, queue]) => ({
      name,
      counts: await queue.getJobCounts(),
      isPaused: await queue.isPaused(),
    }))
  );
  return { queues: queueStats };
});

fastify.post('/api/queues/:name/pause', async (req) => {
  const queue = queues[req.params.name];
  await queue.pause();
  return { success: true, status: 'paused' };
});

fastify.post('/api/queues/:name/resume', async (req) => {
  const queue = queues[req.params.name];
  await queue.resume();
  return { success: true, status: 'resumed' };
});

fastify.post('/api/jobs/:jobId/retry', async (req) => {
  const { queueName } = req.query;
  const job = await queues[queueName].getJob(req.params.jobId);
  await job.retry();
  return { success: true, jobId: job.id };
});

fastify.get('/api/jobs/failed', async (req) => {
  const { queueName, limit = 50 } = req.query;
  const jobs = await queues[queueName].getFailed(0, limit);
  return { jobs: jobs.map(j => ({ id: j.id, data: j.data, failedReason: j.failedReason })) };
});
```

### Approval workflows pause processing for review

```typescript
const approvalQueue = new Queue('enrichment:approval', { connection });

async function requestDataQualityReview(prospectId: string, reason: string) {
  return approvalQueue.add('review', {
    prospectId,
    reason,
    requestedAt: new Date().toISOString(),
    status: 'pending',
  }, {
    delay: 48 * 60 * 60 * 1000, // Auto-timeout after 48 hours
  });
}

fastify.post('/api/approvals/:jobId/approve', async (req) => {
  const job = await approvalQueue.getJob(req.params.jobId);
  
  // Continue enrichment pipeline
  await enrichmentQueue.add('continue', {
    prospectId: job.data.prospectId,
    approvedBy: req.body.approver,
    approvedAt: new Date().toISOString(),
  });
  
  await job.remove();
  await logDataAccess({ action: 'APPROVAL', dataSubjectId: job.data.prospectId });
  
  return { success: true };
});
```

---

## Rate limit configuration table for all external APIs

| API | Endpoint | Rate Limit | Worker Limiter Config | Credits/Cost |
|-----|----------|------------|----------------------|--------------|
| **ANAF** | CUI validation | 1 req/sec, 100 CUI/req | `{ max: 1, duration: 1000 }` | Free |
| **Hunter.io** | Email finder | 15 req/sec, 500/min | `{ max: 300, duration: 60000 }` | 1 credit |
| **Hunter.io** | Verifier | 15 req/sec | `{ max: 15, duration: 1000 }` | 0.5 credit |
| **ZeroBounce** | Validation | 50k/hour | `{ max: 50000, duration: 3600000 }` | $0.008/email |
| **Twilio** | Phone lookup | No strict limit | `{ max: 100, duration: 1000 }` | Free (basic) |
| **Termene.ro** | Company data | Subscription-based | `{ max: 20, duration: 1000 }` | Monthly |
| **Lista Firme** | Search | Credit-based | `{ max: 10, duration: 1000 }` | 1-5 credits |
| **ScrapingBee** | Web scraping | Plan-based | `{ max: 100, duration: 1000 }` | 1-25 credits |

---

## Conclusion: Architecture enables scalable Romanian agricultural prospecting

The granular worker architecture achieves **field-level isolation** with independent scaling and fault tolerance. BullMQ's FlowProducer orchestrates complex enrichment chains while circuit breakers protect external integrations. Key implementation priorities:

- **Deploy ANAF worker first**—it's free, authoritative, and required for CUI validation
- **Configure `noeviction` Redis policy**—queue integrity depends on it
- **Implement waterfall email discovery**—Hunter.io → Snov.io → Apollo.io maximizes coverage
- **Document LIA before processing**—GDPR Article 6(1)(f) requires written justification
- **Avoid CNP collection**—Romanian law mandates DPO appointment for legitimate interest processing
- **Monitor queue depth**—backpressure handling prevents system overload

The system scales horizontally by adding worker instances per queue, with Redis Sentinel providing high availability until data exceeds single-node capacity (~90GB), at which point Redis Cluster becomes necessary.