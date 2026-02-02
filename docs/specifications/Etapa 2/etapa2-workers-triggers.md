# CERNIQ.APP — ETAPA 2: WORKERS TRIGGER RULES
## Inter-Worker Communication & Event Flow
### Versiunea 1.1 | 2 Februarie 2026

---

# 1. TRIGGER RULES MATRIX

## 1.1 Complete Trigger Map

| Source Worker | Condition | Target Queue | Priority |
|---------------|-----------|--------------|----------|
| **Quota Guardian** |
| `quota:guardian:check` | allowed=true | `q:wa:phone_{XX}` | 1 |
| `quota:guardian:check` | reason=QUOTA_EXCEEDED | `outreach:wa:delay` | 2 |
| `quota:guardian:check` | reason=OUTSIDE_BUSINESS_HOURS | `outreach:wa:reschedule` | 2 |
| `quota:guardian:check` | reason=PHONE_OFFLINE | `alert:phone:offline` | 1 |
| **Orchestrator** |
| `outreach:orchestrator:dispatch` | lead.hasPhone=true | `q:wa:phone_{XX}` | varies |
| `outreach:orchestrator:dispatch` | lead.hasEmail=true, stage=COLD | `q:email:cold` | 2 |
| `outreach:orchestrator:dispatch` | lead.hasEmail=true, stage≠COLD | `q:email:warm` | 2 |
| **WhatsApp Send** |
| `q:wa:phone_{XX}` | success=true | `sequence:schedule:followup` | 2 |
| `q:wa:phone_{XX}` | success=true | `lead:state:transition` | 1 |
| `q:wa:phone_{XX}` | error=PHONE_BANNED | `alert:phone:banned` | 1 |
| `q:wa:phone_{XX}` | error=PHONE_OFFLINE | `alert:phone:offline` | 1 |
| `q:wa:phone_{XX}` | error=retriable | `wa:message:retry` | 3 |
| **Webhook Ingest** |
| `webhook:timelinesai:ingest` | event=REPLY | `lead:state:transition` | 1 |
| `webhook:timelinesai:ingest` | event=REPLY | `sequence:stop` | 1 |
| `webhook:timelinesai:ingest` | event=REPLY | `ai:sentiment:analyze` | 2 |
| `webhook:instantly:ingest` | event=REPLY | `lead:state:transition` | 1 |
| `webhook:instantly:ingest` | event=BOUNCE | `email:cold:lead:status` | 1 |
| **Sentiment Analysis** |
| `ai:sentiment:analyze` | score>=50, !requiresHuman | `ai:response:generate` | 2 |
| `ai:sentiment:analyze` | score<50 OR requiresHuman | `human:review:queue` | 1 |
| `ai:sentiment:analyze` | score<0 | `human:review:queue` (URGENT) | 1 |
| **AI Response** |
| `ai:response:generate` | success=true | `q:wa:phone_{XX}:followup` | 2 |
| **State Transition** |
| `lead:state:transition` | newState=WARM_REPLY | `sequence:stop` | 1 |
| `lead:state:transition` | newState=CONVERTED | `lead:converted:notify` | 1 |
| **Monitoring** |
| `monitor:phone:health` | status=OFFLINE | `alert:phone:offline` | 1 |
| `monitor:email:deliverability` | bounceRate>3% | `email:cold:campaign:pause` | 1 |
| `monitor:email:deliverability` | bounceRate>3% | `alert:bounce:high` | 1 |

---

# 2. TRIGGER IMPLEMENTATION

## 2.1 Trigger Helper Functions

```typescript
// workers/shared/triggers.ts

import { Queue, FlowProducer } from 'bullmq';
import { REDIS_CONNECTION } from '@cerniq/config';
import { logger } from '@cerniq/logger';

const flowProducer = new FlowProducer({ connection: REDIS_CONNECTION });

interface TriggerOptions {
  priority?: number;
  delay?: number;
  jobId?: string;
  attempts?: number;
}

export async function triggerQueue<T>(
  queueName: string,
  data: T,
  options: TriggerOptions = {}
): Promise<string> {
  const jobId = options.jobId || `${queueName}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  await flowProducer.add({
    name: queueName.split(':').pop() || 'job',
    queueName,
    data,
    opts: {
      jobId,
      priority: options.priority || 2,
      delay: options.delay,
      attempts: options.attempts || 3,
    },
  });
  
  logger.debug({
    triggeredQueue: queueName,
    jobId,
    priority: options.priority,
  }, 'Queue triggered');
  
  return jobId;
}

export async function triggerMultiple(
  triggers: Array<{
    queue: string;
    data: any;
    options?: TriggerOptions;
  }>
): Promise<string[]> {
  const jobIds: string[] = [];
  
  for (const trigger of triggers) {
    const jobId = await triggerQueue(trigger.queue, trigger.data, trigger.options);
    jobIds.push(jobId);
  }
  
  return jobIds;
}

export async function triggerAlert(
  alertType: string,
  payload: Record<string, any>
): Promise<void> {
  await triggerQueue(`alert:${alertType}`, {
    alertType,
    payload,
    timestamp: new Date().toISOString(),
  }, { priority: 1 });
}
```

## 2.2 Conditional Trigger Logic

```typescript
// workers/shared/conditional-triggers.ts

interface TriggerCondition {
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'includes' | 'exists';
  value: any;
}

interface ConditionalTrigger {
  conditions: TriggerCondition[];
  queue: string;
  dataMapper: (sourceData: any) => any;
  options?: TriggerOptions;
}

export function evaluateCondition(data: any, condition: TriggerCondition): boolean {
  const fieldValue = getNestedValue(data, condition.field);
  
  switch (condition.operator) {
    case '==': return fieldValue === condition.value;
    case '!=': return fieldValue !== condition.value;
    case '>': return fieldValue > condition.value;
    case '<': return fieldValue < condition.value;
    case '>=': return fieldValue >= condition.value;
    case '<=': return fieldValue <= condition.value;
    case 'includes': return Array.isArray(fieldValue) && fieldValue.includes(condition.value);
    case 'exists': return fieldValue !== undefined && fieldValue !== null;
    default: return false;
  }
}

export async function executeConditionalTriggers(
  sourceData: any,
  triggers: ConditionalTrigger[]
): Promise<string[]> {
  const executedJobIds: string[] = [];
  
  for (const trigger of triggers) {
    const allConditionsMet = trigger.conditions.every(
      condition => evaluateCondition(sourceData, condition)
    );
    
    if (allConditionsMet) {
      const mappedData = trigger.dataMapper(sourceData);
      const jobId = await triggerQueue(trigger.queue, mappedData, trigger.options);
      executedJobIds.push(jobId);
    }
  }
  
  return executedJobIds;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
```

---

# 3. WORKER-SPECIFIC TRIGGER CONFIGURATIONS

## 3.1 Quota Guardian Triggers

```typescript
// workers/quota/triggers.config.ts

export const QUOTA_GUARDIAN_TRIGGERS: ConditionalTrigger[] = [
  // Success - proceed to phone queue
  {
    conditions: [
      { field: 'allowed', operator: '==', value: true }
    ],
    queue: 'dynamic', // Determined by phoneId
    dataMapper: (data) => ({
      leadId: data.leadId,
      phoneId: data.phoneId,
      recipientPhone: data.recipientPhone,
      isNewContact: data.isNewContact,
    }),
    options: { priority: 1 }
  },
  
  // Quota exceeded - delay to next day
  {
    conditions: [
      { field: 'allowed', operator: '==', value: false },
      { field: 'reason', operator: '==', value: 'QUOTA_EXCEEDED' }
    ],
    queue: 'outreach:wa:delay',
    dataMapper: (data) => ({
      leadId: data.leadId,
      originalPhoneId: data.phoneId,
      delayUntil: data.recommendation.delayUntil,
      alternativePhoneId: data.recommendation.alternativePhoneId,
    }),
    options: { priority: 2 }
  },
  
  // Outside business hours - reschedule
  {
    conditions: [
      { field: 'allowed', operator: '==', value: false },
      { field: 'reason', operator: '==', value: 'OUTSIDE_BUSINESS_HOURS' }
    ],
    queue: 'outreach:wa:reschedule',
    dataMapper: (data) => ({
      leadId: data.leadId,
      phoneId: data.phoneId,
      scheduledFor: data.recommendation.delayUntil,
    }),
    options: { priority: 2 }
  },
  
  // Phone offline - alert
  {
    conditions: [
      { field: 'reason', operator: '==', value: 'PHONE_OFFLINE' }
    ],
    queue: 'alert:phone:offline',
    dataMapper: (data) => ({
      phoneId: data.phoneId,
      detectedAt: new Date().toISOString(),
    }),
    options: { priority: 1 }
  },
];
```

## 3.2 Webhook Triggers

```typescript
// workers/webhook/triggers.config.ts

export const WEBHOOK_REPLY_TRIGGERS: ConditionalTrigger[] = [
  // Update lead state on reply
  {
    conditions: [
      { field: 'eventType', operator: '==', value: 'REPLY' },
      { field: 'leadId', operator: 'exists', value: true }
    ],
    queue: 'lead:state:transition',
    dataMapper: (data) => ({
      leadId: data.leadId,
      newState: 'WARM_REPLY',
      trigger: 'WEBHOOK_REPLY',
      timestamp: data.timestamp,
    }),
    options: { priority: 1 }
  },
  
  // Stop sequence on reply
  {
    conditions: [
      { field: 'eventType', operator: '==', value: 'REPLY' },
      { field: 'leadId', operator: 'exists', value: true }
    ],
    queue: 'sequence:stop',
    dataMapper: (data) => ({
      leadId: data.leadId,
      reason: 'LEAD_REPLIED',
    }),
    options: { priority: 1 }
  },
  
  // Analyze sentiment
  {
    conditions: [
      { field: 'eventType', operator: '==', value: 'REPLY' },
      { field: 'content', operator: 'exists', value: true }
    ],
    queue: 'ai:sentiment:analyze',
    dataMapper: (data) => ({
      leadId: data.leadId,
      content: data.content,
      source: data.channel,
    }),
    options: { priority: 2 }
  },
];

export const WEBHOOK_BOUNCE_TRIGGERS: ConditionalTrigger[] = [
  // Update lead status on bounce
  {
    conditions: [
      { field: 'eventType', operator: '==', value: 'BOUNCE' }
    ],
    queue: 'email:cold:lead:status',
    dataMapper: (data) => ({
      email: data.recipientEmail,
      status: 'BOUNCED',
      bounceType: data.metadata?.bounceType,
    }),
    options: { priority: 1 }
  },
];
```

## 3.3 Sentiment Analysis Triggers

```typescript
// workers/ai/triggers.config.ts

export const SENTIMENT_TRIGGERS: ConditionalTrigger[] = [
  // Positive sentiment - auto respond
  {
    conditions: [
      { field: 'score', operator: '>=', value: 50 },
      { field: 'requiresHuman', operator: '==', value: false }
    ],
    queue: 'ai:response:generate',
    dataMapper: (data) => ({
      leadId: data.leadId,
      originalContent: data.content,
      sentimentScore: data.score,
      intent: data.intent,
    }),
    options: { priority: 2 }
  },
  
  // Neutral/uncertain - medium priority review
  {
    conditions: [
      { field: 'score', operator: '>=', value: 0 },
      { field: 'score', operator: '<', value: 50 }
    ],
    queue: 'human:review:queue',
    dataMapper: (data) => ({
      leadId: data.leadId,
      reason: 'AI_UNCERTAIN',
      priority: 'MEDIUM',
      content: data.content,
      analysis: data,
    }),
    options: { priority: 2 }
  },
  
  // Negative sentiment - urgent review
  {
    conditions: [
      { field: 'score', operator: '<', value: 0 }
    ],
    queue: 'human:review:queue',
    dataMapper: (data) => ({
      leadId: data.leadId,
      reason: 'NEGATIVE_SENTIMENT',
      priority: 'URGENT',
      content: data.content,
      analysis: data,
    }),
    options: { priority: 1 }
  },
  
  // AI flagged for human
  {
    conditions: [
      { field: 'requiresHuman', operator: '==', value: true }
    ],
    queue: 'human:review:queue',
    dataMapper: (data) => ({
      leadId: data.leadId,
      reason: 'AI_FLAGGED',
      priority: data.urgency === 'HIGH' ? 'HIGH' : 'MEDIUM',
      content: data.content,
      analysis: data,
    }),
    options: { priority: 1 }
  },
];
```

---

# 4. FLOW DIAGRAMS

## 4.1 New Contact Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NEW WHATSAPP CONTACT FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. outreach:orchestrator:dispatch (Cron */5)                      │
│     │                                                               │
│     ▼                                                               │
│  2. quota:guardian:check ─────────────┬─────────────────────┐      │
│     │                                 │                     │      │
│     ▼ ALLOWED                         ▼ QUOTA_EXCEEDED      ▼      │
│  3. outreach:phone:allocator       delay 24h          PHONE_OFFLINE│
│     │                                 │                     │      │
│     ▼                                 │              alert:phone:  │
│  4. q:wa:phone_{XX}                   │                offline     │
│     ├─ Jitter 30-150s                 │                            │
│     ├─ template:spintax:process       │                            │
│     └─ TimelinesAI API ───────────────┤                            │
│     │                                 │                            │
│     ▼ SUCCESS                         ▼ FAILED                     │
│  5. gold_communication_log INSERT   wa:message:retry               │
│     │                                                               │
│     ▼                                                               │
│  6. lead:state:transition (COLD → CONTACTED_WA)                    │
│     │                                                               │
│     ▼                                                               │
│  7. sequence:schedule:followup                                      │
│     └─ Schedule step 2 for +24h                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 4.2 Reply Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     REPLY PROCESSING FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. POST /webhooks/timelinesai                                     │
│     │                                                               │
│     ▼                                                               │
│  2. webhook:timelinesai:ingest                                     │
│     ├─ Validate signature                                          │
│     ├─ Parse payload                                               │
│     └─ Find lead by chat_id                                        │
│     │                                                               │
│     ├────────────────────┬────────────────────┐                    │
│     ▼                    ▼                    ▼                    │
│  3. lead:state:      sequence:stop      ai:sentiment:              │
│     transition          │                   analyze                │
│     (→WARM_REPLY)       │                    │                     │
│                         │         ┌──────────┴──────────┐          │
│                         │         ▼                     ▼          │
│                         │    score ≥ 50           score < 50       │
│                         │         │                     │          │
│                         │         ▼                     ▼          │
│                         │    ai:response:         human:review:    │
│                         │       generate              queue        │
│                         │         │                     │          │
│                         │         ▼                     │          │
│                         │    q:wa:phone_{XX}:          │          │
│                         │       followup               │          │
│                         │         │                     │          │
│                         └─────────┴─────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

# 5. PRIORITY DEFINITIONS

| Priority | Value | Use Case |
|----------|-------|----------|
| **1 (Highest)** | Alerts, State changes, Stops | Critical operations that must execute immediately |
| **2 (Normal)** | Regular processing | Standard message sending, analysis |
| **3 (Low)** | Retries, Background tasks | Non-urgent operations |

---

**Document generat:** 15 Ianuarie 2026
**Total Trigger Rules:** 35+
**Conformitate:** Master Spec v1.2
