# CERNIQ.APP — ETAPA 2: WORKERS OVERVIEW

## Cold Outreach Pipeline - Worker Architecture

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 Worker Categories

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ETAPA 2 WORKERS (52 TOTAL)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   A: QUOTA      │  │ B: ORCHESTRATE  │  │  C: WHATSAPP    │                │
│  │   GUARDIAN      │  │                 │  │  (TimelinesAI)  │                │
│  │   (4 workers)   │  │   (4 workers)   │  │  (7+ workers)   │                │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                │
│           │                    │                    │                          │
│           └────────────────────┼────────────────────┘                          │
│                                │                                               │
│  ┌─────────────────┐  ┌───────┴────────┐  ┌─────────────────┐                │
│  │  D: EMAIL COLD  │  │   OUTREACH     │  │  E: EMAIL WARM  │                │
│  │  (Instantly.ai) │  │   PIPELINE     │  │    (Resend)     │                │
│  │   (5 workers)   │  │                │  │   (3 workers)   │                │
│  └────────┬────────┘  └───────┬────────┘  └────────┬────────┘                │
│           │                   │                    │                          │
│           └───────────────────┼────────────────────┘                          │
│                               │                                               │
│  ┌─────────────────┐  ┌───────┴────────┐  ┌─────────────────┐                │
│  │  F: TEMPLATES   │  │   FEEDBACK     │  │  G: WEBHOOKS    │                │
│  │  & CONTENT      │  │     LOOP       │  │   INGEST        │                │
│  │   (3 workers)   │  │                │  │   (4 workers)   │                │
│  └─────────────────┘  └───────┬────────┘  └─────────────────┘                │
│                               │                                               │
│  ┌─────────────────┐  ┌───────┴────────┐  ┌─────────────────┐                │
│  │  H: SEQUENCES   │  │   ANALYSIS &   │  │ I: STATE MACHINE│                │
│  │  MANAGEMENT     │  │   PROCESSING   │  │   LEAD          │                │
│  │   (4 workers)   │  │                │  │   (3 workers)   │                │
│  └─────────────────┘  └───────┬────────┘  └─────────────────┘                │
│                               │                                               │
│  ┌─────────────────┐  ┌───────┴────────┐  ┌─────────────────┐                │
│  │  J: AI &        │  │  MONITORING &  │  │  L: HUMAN       │                │
│  │  SENTIMENT      │  │    HEALTH      │  │  INTERVENTION   │                │
│  │   (3 workers)   │  │                │  │   (4 workers)   │                │
│  └─────────────────┘  └────────────────┘  └─────────────────┘                │
│                           K: (6 workers)                                      │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 1.2 Worker Inventory Summary

| Category | Workers | Queue Prefix | Key Responsibility |
| :--- | :--- | :--- | :--- |
| **A: Quota Guardian** | 4 | `quota:*` | Rate limiting, business hours |
| **B: Orchestration** | 4 | `outreach:*` | Dispatch, routing, allocation |
| **C: WhatsApp** | 7 | `q:wa:*` | TimelinesAI messaging |
| **D: Email Cold** | 5 | `email:cold:*` | Instantly.ai integration |
| **E: Email Warm** | 3 | `email:warm:*` | Resend integration |
| **F: Templates** | 3 | `template:*` | Spintax, personalization |
| **G: Webhooks** | 4 | `webhook:*` | Ingest, normalization |
| **H: Sequences** | 4 | `sequence:*` | Follow-up automation |
| **I: State Machine** | 3 | `lead:state:*` | State transitions |
| **J: AI/Sentiment** | 3 | `ai:*` | Analysis, response gen |
| **K: Monitoring** | 6 | `monitor:*`, `alert:*` | Health, alerts |
| **L: Human** | 4 | `human:*` | Review, takeover |
| **TOTAL** | **52** | - | - |

---

---

## 2. WORKER CONFIGURATION DEFAULTS

### 2.1 BullMQ Base Configuration

```typescript
// packages/queue/src/config/etapa2.config.ts

export const ETAPA2_QUEUE_CONFIG = {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '64039'),
    password: process.env.REDIS_PASSWORD,
    db: 2, // Separate DB for Etapa 2
  },
  
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600,      // 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 86400,     // 24 hours
    },
  },
};

export const RATE_LIMITS = {
  // WhatsApp
  WA_NEW_CONTACTS_PER_DAY: 200,
  WA_JITTER_MIN_MS: 30_000,
  WA_JITTER_MAX_MS: 150_000,
  
  // Email
  EMAIL_COLD_PER_HOUR: 100,
  EMAIL_WARM_PER_SECOND: 100,
  EMAIL_BOUNCE_THRESHOLD: 0.03,
  
  // AI
  AI_REQUESTS_PER_MINUTE: 60,
};

export const BUSINESS_HOURS = {
  START_HOUR: 9,
  END_HOUR: 18,
  TIMEZONE: 'Europe/Bucharest',
  WORKING_DAYS: [1, 2, 3, 4, 5], // Mon-Fri
};
```

### 2.2 Worker Factory

```typescript
// packages/queue/src/factory/worker.factory.ts

import { Worker, Queue, Job } from 'bullmq';
import { ETAPA2_QUEUE_CONFIG } from '../config/etapa2.config';
import { logger } from '@cerniq/logger';

interface WorkerConfig<T, R> {
  queueName: string;
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
  processor: (job: Job<T>) => Promise<R>;
  onCompleted?: (job: Job<T>, result: R) => Promise<void>;
  onFailed?: (job: Job<T>, error: Error) => Promise<void>;
}

export function createOutreachWorker<T = any, R = any>(
  config: WorkerConfig<T, R>
): Worker<T, R> {
  const worker = new Worker<T, R>(
    config.queueName,
    async (job) => {
      const startTime = Date.now();
      
      logger.info({
        worker: config.queueName,
        jobId: job.id,
        data: job.data,
      }, 'Job started');
      
      try {
        const result = await config.processor(job);
        
        logger.info({
          worker: config.queueName,
          jobId: job.id,
          duration: Date.now() - startTime,
        }, 'Job completed');
        
        return result;
      } catch (error) {
        logger.error({
          worker: config.queueName,
          jobId: job.id,
          error,
          duration: Date.now() - startTime,
        }, 'Job failed');
        
        throw error;
      }
    },
    {
      connection: ETAPA2_QUEUE_CONFIG.connection,
      concurrency: config.concurrency || 10,
      limiter: config.limiter,
    }
  );

  if (config.onCompleted) {
    worker.on('completed', config.onCompleted);
  }

  if (config.onFailed) {
    worker.on('failed', config.onFailed);
  }

  return worker;
}
```

---

---

## 3. QUEUE NAMING CONVENTIONS

### 3.1 Pattern

```text
{stage}:{category}:{action}[:{variant}]

Examples:
- quota:guardian:check
- outreach:orchestrator:dispatch
- q:wa:phone_01
- email:cold:campaign:create
- webhook:timelinesai:ingest
- ai:sentiment:analyze
```

### 3.2 Full Queue List

```typescript
export const ETAPA2_QUEUES = {
  // A: Quota Guardian
  QUOTA_CHECK: 'quota:guardian:check',
  QUOTA_INCREMENT: 'quota:guardian:increment',
  QUOTA_RESET: 'quota:guardian:reset',
  BUSINESS_HOURS_CHECK: 'quota:business-hours:check',
  
  // B: Orchestration
  ORCHESTRATOR_DISPATCH: 'outreach:orchestrator:dispatch',
  ORCHESTRATOR_ROUTER: 'outreach:orchestrator:router',
  PHONE_ALLOCATOR: 'outreach:phone:allocator',
  CHANNEL_SELECTOR: 'outreach:channel:selector',
  
  // C: WhatsApp (dynamic per phone)
  WA_PHONE_PREFIX: 'q:wa:phone_',        // + phone_id
  WA_FOLLOWUP_SUFFIX: ':followup',
  WA_REPLY: 'q:wa:reply',
  WA_MESSAGE_RETRY: 'wa:message:retry',
  WA_CHAT_HISTORY: 'wa:chat:history:fetch',
  WA_STATUS_SYNC: 'wa:status:sync',
  WA_MEDIA_SEND: 'wa:media:send',
  
  // D: Email Cold
  EMAIL_COLD: 'q:email:cold',
  EMAIL_COLD_CAMPAIGN_CREATE: 'email:cold:campaign:create',
  EMAIL_COLD_CAMPAIGN_PAUSE: 'email:cold:campaign:pause',
  EMAIL_COLD_ANALYTICS: 'email:cold:analytics:fetch',
  EMAIL_COLD_LEAD_STATUS: 'email:cold:lead:status',
  
  // E: Email Warm
  EMAIL_WARM: 'q:email:warm',
  EMAIL_WARM_PROFORMA: 'email:warm:proforma',
  EMAIL_WARM_DOCUMENT: 'email:warm:document',
  
  // F: Templates
  TEMPLATE_SPINTAX: 'template:spintax:process',
  TEMPLATE_PERSONALIZE: 'template:personalize',
  TEMPLATE_VALIDATE: 'template:validate',
  
  // G: Webhooks
  WEBHOOK_TIMELINESAI: 'webhook:timelinesai:ingest',
  WEBHOOK_INSTANTLY: 'webhook:instantly:ingest',
  WEBHOOK_RESEND: 'webhook:resend:ingest',
  WEBHOOK_NORMALIZE: 'webhook:normalize',
  
  // H: Sequences
  SEQUENCE_SCHEDULE_FOLLOWUP: 'sequence:schedule:followup',
  SEQUENCE_STOP: 'sequence:stop',
  SEQUENCE_ADVANCE: 'sequence:advance',
  SEQUENCE_CREATE: 'sequence:create',
  
  // I: Lead State
  LEAD_STATE_TRANSITION: 'lead:state:transition',
  LEAD_STATE_VALIDATE: 'lead:state:validate',
  LEAD_ASSIGN_USER: 'lead:assign:user',
  
  // J: AI/Sentiment
  AI_SENTIMENT_ANALYZE: 'ai:sentiment:analyze',
  AI_RESPONSE_GENERATE: 'ai:response:generate',
  AI_INTENT_CLASSIFY: 'ai:intent:classify',
  
  // K: Monitoring
  MONITOR_PHONE_HEALTH: 'monitor:phone:health',
  MONITOR_EMAIL_DELIVERABILITY: 'monitor:email:deliverability',
  MONITOR_QUOTA_USAGE: 'monitor:quota:usage',
  ALERT_PHONE_OFFLINE: 'alert:phone:offline',
  ALERT_PHONE_BANNED: 'alert:phone:banned',
  ALERT_BOUNCE_HIGH: 'alert:bounce:high',
  
  // L: Human
  HUMAN_REVIEW_QUEUE: 'human:review:queue',
  HUMAN_TAKEOVER_INITIATE: 'human:takeover:initiate',
  HUMAN_TAKEOVER_COMPLETE: 'human:takeover:complete',
  HUMAN_APPROVE_MESSAGE: 'human:approve:message',
  
  // Pipeline
  PIPELINE_HEALTH: 'pipeline:outreach:health',
  PIPELINE_METRICS: 'pipeline:outreach:metrics',
};
```

---

## 4. CONCURRENCY MATRIX

| Queue | Concurrency | Rate Limit | Notes |
| :--- | :--- | :--- | :--- |
| `quota:guardian:check` | 100 | - | Fast Redis lookup |
| `quota:guardian:increment` | 100 | - | Atomic operation |
| `quota:guardian:reset` | 1 | Cron 00:00 | Daily reset |
| `outreach:orchestrator:dispatch` | 20 | Cron */5 | Every 5 min |
| `outreach:orchestrator:router` | 50 | - | Fast routing |
| `q:wa:phone_{XX}` | **1** | Quota | Strict serialization |
| `q:wa:phone_{XX}:followup` | **1** | - | No quota cost |
| `q:email:cold` | 50 | Instantly | Provider managed |
| `q:email:warm` | 50 | 100/sec | High throughput |
| `template:spintax:process` | 100 | - | CPU only |
| `webhook:*:ingest` | 100 | - | Fast ingest |
| `ai:sentiment:analyze` | 20 | 60/min | LLM cost |
| `ai:response:generate` | 10 | 60/min | LLM cost |
| `human:review:queue` | 50 | - | Human paced |

---

---

## 5. CRITICAL FLOWS

### 5.1 New WhatsApp Contact Flow

```text
1. CRON: outreach:orchestrator:dispatch
   ├── SELECT leads WHERE stage='COLD' AND next_action_at <= NOW()
   └── For each lead:
       │
       ▼
2. quota:guardian:check (ATOMIC Lua)
   ├── ALLOWED → Continue
   └── REJECTED → Delay 24h
       │
       ▼
3. outreach:phone:allocator
   ├── If lead.assigned_phone_id → Use that phone
   └── Else → Round-robin allocate
       │
       ▼
4. q:wa:phone_{XX} (Concurrency: 1)
   ├── Jitter: sleep(30s + random(0, 120s))
   ├── template:spintax:process
   ├── TimelinesAI API → Send message
   └── quota:guardian:increment (cost=1)
       │
       ▼
5. gold_communication_log INSERT
       │
       ▼
6. lead:state:transition (COLD → CONTACTED_WA)
       │
       ▼
7. sequence:schedule:followup
   └── Schedule step 2 for +24h
```

### 5.2 Reply Processing Flow

```text
1. POST /webhooks/timelinesai
       │
       ▼
2. webhook:timelinesai:ingest
   ├── Validate signature
   ├── Parse payload
   └── Find lead by chat_id
       │
       ▼
3. webhook:normalize → SystemEvent
       │
       ▼
4. lead:state:transition (CONTACTED_* → WARM_REPLY)
       │
       ▼
5. sequence:stop (Cancel pending followups)
       │
       ▼
6. ai:sentiment:analyze
   ├── Score ≥ 50 → ai:response:generate
   ├── Score 0-49 → human:review:queue (MEDIUM)
   └── Score < 0 → human:review:queue (URGENT)
       │
       ▼
7a. [AI Path] ai:response:generate
    └── q:wa:phone_{XX}:followup
        
7b. [Human Path] human:review:queue
    └── Notify operator via UI/Slack
```

---

---

## 6. ERROR HANDLING STRATEGY

## 6.1 Retry Policy

| Error Type | Retries | Backoff | Action |
| :--- | :--- | :--- | :--- |
| Network timeout | 3 | Exponential | Retry |
| Rate limited | 5 | Fixed 60s | Retry |
| API error 4xx | 0 | - | Log, move to DLQ |
| API error 5xx | 3 | Exponential | Retry |
| Quota exceeded | 0 | - | Delay to next day |
| Phone banned | 0 | - | Alert + reassign |

## 6.2 Dead Letter Queue

```typescript
export const DLQ_CONFIG = {
  OUTREACH_DLQ: 'dlq:outreach',
  
  retentionDays: 7,
  
  alertThreshold: 100, // Alert if > 100 jobs in DLQ
  
  reviewRequired: [
    'PHONE_BANNED',
    'ACCOUNT_SUSPENDED',
    'INVALID_LEAD',
  ],
};
```

---

---

## 7. OBSERVABILITY

### 7.1 Metrics

```typescript
// OTel metrics for Etapa 2
import { metrics } from '@opentelemetry/api';
const meter = metrics.getMeter('cerniq-outreach');

// Message counters
const messagesTotal = meter.createCounter('cerniq_outreach_messages_total', {
  description: 'Total outreach messages sent',
});

// Quota usage
const quotaUsage = meter.createUpDownCounter('cerniq_wa_quota_usage', {
  description: 'Current WhatsApp quota usage',
  unit: '1'
});

// Reply rates
const replyRate = meter.createObservableGauge('cerniq_outreach_reply_rate', {
  description: 'Reply rate by channel',
});

// Note: Queue depth is handled by Monitoring API Sidecar
```

### 7.2 Logging Standards

```typescript
// Structured log format for outreach events
interface OutreachLogEvent {
  level: 'debug' | 'info' | 'warn' | 'error';
  worker: string;
  jobId: string;
  leadId?: string;
  phoneId?: string;
  channel?: string;
  action: string;
  duration?: number;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}
```

---

**Document generat:** 15 Ianuarie 2026
**Total Workers:** 52
**Conformitate:** Master Spec v1.2
