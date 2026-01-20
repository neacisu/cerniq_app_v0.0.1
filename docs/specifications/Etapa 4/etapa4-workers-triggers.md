# CERNIQ.APP — ETAPA 4: WORKER TRIGGERS
## Trigger Patterns și Flow Orchestration
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Trigger Overview](#1-overview)
2. [Webhook Triggers](#2-webhooks)
3. [Cron Triggers](#3-cron)
4. [Event-Based Triggers](#4-events)
5. [Flow Dependencies](#5-flows)
6. [Complete Trigger Matrix](#6-matrix)

---

## 1. Trigger Overview {#1-overview}

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGER SOURCES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   WEBHOOKS   │  │    CRON      │  │   EVENTS     │          │
│  │              │  │              │  │              │          │
│  │ • Revolut    │  │ • Daily      │  │ • DB Trigger │          │
│  │ • Sameday    │  │ • Hourly     │  │ • Worker Out │          │
│  │ • DocuSign   │  │ • Periodic   │  │ • API Call   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
│         └─────────────────┼─────────────────┘                    │
│                           ▼                                      │
│              ┌────────────────────────┐                         │
│              │     BullMQ Queues      │                         │
│              │    (67 Workers)        │                         │
│              └────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Webhook Triggers {#2-webhooks}

### Revolut Business Webhooks
```typescript
// POST /webhooks/revolut/business
const REVOLUT_WEBHOOK_EVENTS = {
  'TransactionCreated': {
    queue: 'revolut:webhook:ingest',
    filters: { type: ['transfer'], direction: 'incoming' }
  },
  'TransactionStateChanged': {
    queue: 'revolut:webhook:ingest',
    filters: { state: ['completed', 'declined', 'failed'] }
  }
};

// Fastify route
app.post('/webhooks/revolut/business', async (req, reply) => {
  // 1. Validate HMAC
  const signature = req.headers['x-revolut-signature-v1'];
  const isValid = await validateRevolutHmac(signature, JSON.stringify(req.body));
  if (!isValid) return reply.code(401).send({ error: 'Invalid signature' });
  
  // 2. Idempotency
  const webhookId = req.headers['x-webhook-id'];
  if (await redis.exists(`webhook:revolut:${webhookId}`)) {
    return reply.code(200).send({ status: 'already_processed' });
  }
  
  // 3. Queue processing
  await flowProducer.add({
    queueName: 'revolut:webhook:ingest',
    name: `revolut-${webhookId}`,
    data: {
      correlationId: uuidv4(),
      tenantId: req.tenant.id,
      headers: req.headers,
      rawPayload: JSON.stringify(req.body),
      payload: req.body,
      receivedAt: new Date().toISOString(),
      sourceIp: req.ip
    }
  });
  
  return reply.code(200).send({ status: 'queued' });
});
```

### Sameday Webhooks
```typescript
// POST /webhooks/sameday/status
app.post('/webhooks/sameday/status', async (req, reply) => {
  const { awbNumber, status, timestamp, location } = req.body;
  
  // Find shipment
  const shipment = await db.query.goldShipments.findFirst({
    where: eq(goldShipments.awbNumber, awbNumber)
  });
  
  if (!shipment) {
    return reply.code(404).send({ error: 'Shipment not found' });
  }
  
  // Queue status update
  await flowProducer.add({
    queueName: 'sameday:status:process',
    name: `sameday-${awbNumber}-${timestamp}`,
    data: {
      shipmentId: shipment.id,
      oldStatus: shipment.status,
      newStatus: mapSamedayStatus(status),
      tracking: { status, timestamp, location }
    }
  });
  
  return reply.code(200).send({ status: 'processed' });
});
```

### DocuSign Connect
```typescript
// POST /webhooks/docusign/connect
app.post('/webhooks/docusign/connect', async (req, reply) => {
  const { envelopeId, status, recipientStatuses } = req.body.data.envelopeSummary;
  
  await flowProducer.add({
    queueName: 'contract:sign:complete',
    name: `docusign-${envelopeId}`,
    data: {
      envelopeId,
      status: status.toLowerCase(),
      recipientStatuses
    }
  });
  
  return reply.code(200).send({ status: 'processed' });
});
```

---

## 3. Cron Triggers {#3-cron}

```typescript
// Cron job registration
const ETAPA4_CRON_JOBS: CronJobConfig[] = [
  // Daily jobs
  { name: 'credit:refresh:all', pattern: '0 3 * * *', queue: 'pipeline:credit:refresh-all' },
  { name: 'overdue:detect', pattern: '0 9 * * *', queue: 'payment:overdue:detect' },
  { name: 'compliance:check', pattern: '0 6 * * *', queue: 'audit:compliance:check' },
  { name: 'daily:summary', pattern: '0 18 * * 1-5', queue: 'alert:internal:daily-summary' },
  { name: 'contract:expire', pattern: '0 1 * * *', queue: 'pipeline:contract:expire' },
  
  // Periodic jobs
  { name: 'stock:sync', pattern: '*/15 * * * *', queue: 'stock:sync:oblio' },
  { name: 'reservation:expire', pattern: '*/15 * * * *', queue: 'pipeline:reservation:expire' },
  { name: 'balance:sync', pattern: '*/30 * * * *', queue: 'revolut:balance:sync' },
  
  // Weekly jobs
  { name: 'data:anonymize', pattern: '0 2 * * 0', queue: 'audit:data:anonymize' },
  
  // Specific time
  { name: 'pickup:schedule', pattern: '0 14 * * 1-5', queue: 'sameday:pickup:schedule' }
];

// Registration
export async function registerCronJobs() {
  for (const job of ETAPA4_CRON_JOBS) {
    const queue = new Queue(job.queue, { connection: redis });
    await queue.add(
      job.name,
      { scheduled: true, correlationId: `cron-${job.name}` },
      {
        repeat: { pattern: job.pattern },
        jobId: `cron:${job.name}`
      }
    );
    logger.info({ job: job.name, pattern: job.pattern }, 'Cron job registered');
  }
}
```

---

## 4. Event-Based Triggers {#4-events}

### Order State Changes
```typescript
// Trigger chain for order state changes
const ORDER_STATE_TRIGGERS: Record<string, TriggerConfig[]> = {
  'CREDIT_APPROVED': [
    { queue: 'contract:template:select', condition: 'requiresContract' },
    { queue: 'stock:reserve:order', condition: 'always' }
  ],
  'CONTRACT_SIGNED': [
    { queue: 'sameday:awb:create', condition: 'always' }
  ],
  'PICKED_UP': [
    { queue: 'alert:client:shipped', condition: 'always' }
  ],
  'DELIVERED': [
    { queue: 'alert:client:delivered', condition: 'always' },
    { queue: 'stock:deduct:delivered', condition: 'always' },
    { queue: 'sameday:cod:process', condition: 'isCod' }
  ],
  'CANCELLED': [
    { queue: 'stock:release:order', condition: 'hasStockReserved' },
    { queue: 'credit:limit:release', condition: 'hasCreditReserved' }
  ],
  'PAYMENT_RECEIVED': [
    { queue: 'alert:client:payment-received', condition: 'always' },
    { queue: 'credit:limit:release', condition: 'hasCreditUsed' }
  ]
};

// Trigger executor
async function executeOrderStateTriggers(
  orderId: string, 
  oldStatus: string, 
  newStatus: string
): Promise<void> {
  const triggers = ORDER_STATE_TRIGGERS[newStatus] || [];
  const order = await db.query.goldOrders.findFirst({ where: eq(goldOrders.id, orderId) });
  
  for (const trigger of triggers) {
    const shouldTrigger = evaluateCondition(trigger.condition, order);
    if (shouldTrigger) {
      await flowProducer.add({
        queueName: trigger.queue,
        name: `${trigger.queue}-${orderId}`,
        data: { orderId, tenantId: order.tenantId, correlationId: uuidv4() }
      });
    }
  }
}
```

### Payment Events
```typescript
const PAYMENT_EVENT_TRIGGERS = {
  'PAYMENT_CONFIRMED': [
    { queue: 'payment:reconcile:auto' },
    { queue: 'alert:client:payment-received', after: 'reconcile' }
  ],
  'PAYMENT_RECONCILED': [
    { queue: 'payment:balance:update' }
  ],
  'PAYMENT_OVERDUE': [
    { queue: 'payment:overdue:escalate' },
    { queue: 'alert:client:payment-reminder' }
  ]
};
```

---

## 5. Flow Dependencies {#5-flows}

### Complete Payment Flow
```
Revolut Webhook
      │
      ▼
┌─────────────────┐
│ A1: webhook:    │
│     ingest      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ A2: transaction:│
│     process     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ A3: payment:    │
│     record      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ B7: reconcile:  │────▶│ B8: reconcile:  │
│     auto        │ NO  │     fuzzy       │
└────────┬────────┘     └────────┬────────┘
         │ YES                   │ NO
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ B10: balance:   │     │ K51: HITL       │
│      update     │     │ investigation   │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ I39: alert:     │
│ payment-received│
└─────────────────┘
```

### Complete Credit Flow
```
New Client / Order
      │
      ▼
┌─────────────────┐
│ C13: profile:   │
│      create     │
└────────┬────────┘
         │
    ┌────┴────┬─────────┐
    ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐
│ C14   │ │ C15   │ │ C16   │
│ ANAF  │ │Bilant │ │ BPI   │
└───┬───┘ └───┬───┘ └───┬───┘
    │         │         │
    └────┬────┴─────────┘
         │
         ▼
┌─────────────────┐
│ C17: score:     │
│      calculate  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ C18: limit:     │────▶│ K49: HITL       │
│      calculate  │>50K │ credit-limit    │
└────────┬────────┘     └─────────────────┘
         │
    [Order Created]
         │
         ▼
┌─────────────────┐
│ D19: limit:     │
│      check      │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
APPROVED  BLOCKED
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ D20   │ │ K48   │
│Reserve│ │ HITL  │
└───────┘ └───────┘
```

---

## 6. Complete Trigger Matrix {#6-matrix}

| Source | Event | Target Queue | Priority |
|--------|-------|--------------|----------|
| Webhook | Revolut Transaction | `revolut:webhook:ingest` | HIGH |
| Webhook | Sameday Status | `sameday:status:process` | NORMAL |
| Webhook | DocuSign Complete | `contract:sign:complete` | HIGH |
| Cron | 03:00 daily | `pipeline:credit:refresh-all` | LOW |
| Cron | 09:00 daily | `payment:overdue:detect` | HIGH |
| Cron | 14:00 weekdays | `sameday:pickup:schedule` | NORMAL |
| Cron | 18:00 weekdays | `alert:internal:daily-summary` | LOW |
| Cron | */15 min | `stock:sync:oblio` | NORMAL |
| Event | Order CREDIT_APPROVED | `contract:template:select` | HIGH |
| Event | Order CONTRACT_SIGNED | `sameday:awb:create` | HIGH |
| Event | Order DELIVERED | `alert:client:delivered` | NORMAL |
| Event | Payment Confirmed | `payment:reconcile:auto` | HIGH |
| Event | Credit Score Change | `credit:limit:calculate` | NORMAL |
| Worker | A3 onComplete | `payment:reconcile:auto` | HIGH |
| Worker | B7 noMatch | `payment:reconcile:fuzzy` | NORMAL |
| Worker | B8 noMatch | `hitl:investigation:payment` | LOW |
| Worker | C17 onComplete | `credit:limit:calculate` | NORMAL |
| Worker | D19 blocked | `hitl:approval:credit-override` | HIGH |
| Worker | E24 DELIVERED | `alert:client:delivered` | NORMAL |
| Worker | G34 onComplete | `contract:sign:request` | HIGH |
| Worker | HITL timeout | `hitl:escalation:overdue` | CRITICAL |

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
