# CERNIQ.APP — WEBHOOKS API REFERENCE

## Documentație Completă Webhooks Externe

### Versiunea 1.0 | 19 Ianuarie 2026

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** Toate webhook endpoints primite de la terți și trimise către terți  
**AUTHOR:** AI Documentation System

---

## CUPRINS

1. [Overview](#1-overview)
2. [Webhooks Incoming (Primite)](#2-webhooks-incoming)
3. [Webhooks Outgoing (Trimise)](#3-webhooks-outgoing)
4. [Security & Validare](#4-security--validare)
5. [Procesare și Cozi BullMQ](#5-procesare-și-cozi-bullmq)
6. [Error Handling](#6-error-handling)
7. [Monitoring](#7-monitoring)

---

## 1. OVERVIEW

### 1.1 Fluxul Webhook

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  External API   │────▶│  Webhook Route  │────▶│  BullMQ Queue   │
│  (TimelinesAI,  │     │  (Signature     │     │  (Async         │
│   Revolut, etc) │     │   Validation)   │     │   Processing)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 1.2 Provideri Suportați

| Provider | Tip | Endpoint | Etapa |
| -------- | --- | -------- | ----- |
| **TimelinesAI** | WhatsApp Events | `/webhooks/timelinesai` | E2 |
| **Instantly.ai** | Email Events | `/webhooks/instantly` | E2 |
| **Revolut Business** | Payment Events | `/webhooks/revolut/business` | E4 |
| **Sameday** | Shipment Status | `/webhooks/sameday/status` | E4 |
| **DocuSign** | Contract Events | `/webhooks/docusign/connect` | E4 |

---

## 2. WEBHOOKS INCOMING (Primite)

### 2.1 TimelinesAI — WhatsApp Events (Etapa 2)

> 📖 **Referință:** [`etapa2-workers-overview.md`](../specifications/Etapa%202/etapa2-workers-overview.md) Categoria G

**Endpoint:** `POST /webhooks/timelinesai`

```typescript
// Headers obligatorii
interface TimelinesAIHeaders {
  'X-Timelines-Signature': string;  // HMAC-SHA256 signature
  'Content-Type': 'application/json';
}

// Payload pentru mesaj primit
interface TimelinesAIWebhookPayload {
  event: 'message_received' | 'message_status' | 'conversation_started';
  timestamp: string;
  data: {
    // Message received
    messageId: string;
    conversationId: string;
    phoneNumber: string;       // Format: +40...
    accountPhone: string;       // Our phone number
    content: string;
    contentType: 'text' | 'image' | 'document' | 'audio';
    mediaUrl?: string;
    
    // Message status
    status?: 'sent' | 'delivered' | 'read' | 'failed';
    errorCode?: string;
  };
}
```

**Queue Assignment:** `webhook:timelinesai:ingest`

### 2.2 Revolut Business — Payment Events (Etapa 4)

> 📖 **Referință:** [`etapa4-workers-A-revolut.md`](../specifications/Etapa%204/etapa4-workers-A-revolut.md)

**Endpoint:** `POST /webhooks/revolut/business`

```typescript
// Headers obligatorii
interface RevolutHeaders {
  'X-Revolut-Signature-V1': string;  // HMAC signature
}

// Transaction completed
interface RevolutWebhookPayload {
  event: 'TransactionCreated' | 'TransactionCompleted' | 'TransactionDeclined';
  timestamp: string;
  data: {
    id: string;                    // Transaction ID
    type: 'transfer' | 'card' | 'exchange';
    state: 'pending' | 'completed' | 'declined' | 'reverted';
    request_id?: string;           // Our reference
    created_at: string;
    updated_at: string;
    completed_at?: string;
    amount: number;
    currency: string;
    reference?: string;            // Payment reference (pentru reconciliere)
    legs: Array<{
      leg_id: string;
      counterparty: {
        name?: string;
        account_id?: string;
      };
    }>;
  };
}
```

**Queue Assignment:** `revolut:webhook:ingest`

**⚠️ Limite Revolut:**

- Maximum **10 webhooks** per account
- Webhooks pot fi livrate out-of-order
- Duplicate-uri posibile — necesită idempotency check

### 2.3 Sameday — Shipment Status (Etapa 4)

**Endpoint:** `POST /webhooks/sameday/status`

```typescript
interface SamedayWebhookPayload {
  awbNumber: string;             // AWB number
  status: string;                // Human-readable status
  statusCode: string;            // Numeric status code
  timestamp: string;             // ISO 8601
  location?: string;             // Current location
  signature?: {                  // For delivery confirmation
    name: string;
    imageUrl?: string;
  };
}
```

**Queue Assignment:** `e4:logistics:sameday`

### 2.4 DocuSign Connect — Contract Events (Etapa 4)

**Endpoint:** `POST /webhooks/docusign/connect`

```typescript
interface DocuSignConnectPayload {
  event: 'envelope-completed' | 'recipient-completed' | 'envelope-voided';
  data: {
    envelopeSummary: {
      envelopeId: string;
      status: 'sent' | 'delivered' | 'completed' | 'voided';
      emailSubject: string;
      recipientStatuses: Array<{
        recipientId: string;
        recipientEmail: string;
        status: 'sent' | 'delivered' | 'signed' | 'declined';
        signedAt?: string;
      }>;
      completedDateTime?: string;
    };
  };
}
```

**Queue Assignment:** `e4:contracts:docusign`

### 2.5 Instantly.ai — Email Events (Etapa 2)

**Endpoint:** `POST /webhooks/instantly`

```typescript
interface InstantlyWebhookPayload {
  event_type: 'email_opened' | 'email_clicked' | 'email_replied' | 'email_bounced';
  timestamp: string;
  data: {
    campaign_id: string;
    lead_email: string;
    email_id: string;
    link_clicked?: string;       // For click events
    reply_content?: string;      // For reply events (truncated)
    bounce_type?: 'hard' | 'soft';
  };
}
```

**Queue Assignment:** `email:cold:analytics:fetch`

---

## 3. WEBHOOKS OUTGOING (Trimise)

### 3.1 Alert Webhooks

Pentru alertare externă (Slack, PagerDuty, etc.):

```typescript
// Alert generic
interface CerniqAlertWebhook {
  type: 'ALERT' | 'RESOLVED';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  source: 'cerniq-api' | 'cerniq-workers';
  timestamp: string;
  message: string;
  details: Record<string, any>;
  runbook_url?: string;
}
```

### 3.2 Notification Webhooks (Client-side)

Pentru notificări în timp real:

```typescript
interface ClientNotificationWebhook {
  event: 'order.created' | 'payment.received' | 'shipment.delivered';
  tenantId: string;
  entityId: string;
  data: Record<string, any>;
  timestamp: string;
}
```

---

## 4. SECURITY & VALIDARE

### 4.1 Signature Verification

> 📖 **Referință:** [`etapa0-docker-secrets-guide.md`](../specifications/Etapa%200/etapa0-docker-secrets-guide.md)

```typescript
// Verificare semnătură HMAC-SHA256
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  provider: 'timelinesai' | 'revolut' | 'instantly'
): Promise<boolean> {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 4.2 Secrets pentru Webhook Validation

| Provider | Environment Variable | Docker Secret Path |
| -------- | -------------------- | ------------------ |
| TimelinesAI | `TIMELINES_WEBHOOK_SECRET` | `/run/secrets/timelines_webhook_secret` |
| Revolut | `REVOLUT_WEBHOOK_SECRET` | `/run/secrets/revolut_webhook_secret` |
| Instantly | `INSTANTLY_WEBHOOK_SECRET` | `/run/secrets/instantly_webhook_secret` |

### 4.3 IP Whitelisting (Opțional)

```typescript
// IPs permise per provider (exemplu)
const ALLOWED_IPS = {
  'timelinesai': ['52.17.X.X', '52.48.X.X'],  // Verifică docs oficiale
  'revolut': ['35.X.X.X'],
  'sameday': ['213.X.X.X'],
};
```

---

## 5. PROCESARE ȘI COZI BULLMQ

### 5.1 Cozi Dedicate per Webhook Type

> 📖 **Referință:** [`master-specification.md`](../specifications/master-specification.md) § 4.1

| Queue Name | Provider | Workers | Rate Limit |
| ---------- | -------- | ------- | ---------- |
| `webhook:timelinesai:ingest` | TimelinesAI | G.1-G.4 | N/A |
| `revolut:webhook:ingest` | Revolut | A.1 | N/A |
| `e4:logistics:sameday` | Sameday | E.1-E.6 | N/A |
| `e4:contracts:docusign` | DocuSign | G.1-G.5 | N/A |

### 5.2 Idempotency Pattern

```typescript
// Idempotency check în worker
async function processWebhook(job: Job) {
  const idempotencyKey = `webhook:${job.data.provider}:${job.data.eventId}`;
  
  const processed = await redis.setnx(idempotencyKey, Date.now());
  if (!processed) {
    logger.info('Duplicate webhook ignored', { eventId: job.data.eventId });
    return { skipped: true, reason: 'duplicate' };
  }
  
  // Set TTL pentru cleanup
  await redis.expire(idempotencyKey, 86400); // 24 hours
  
  // Process webhook...
}
```

### 5.3 Retry Strategy

```typescript
const WEBHOOK_WORKER_CONFIG: WorkerConfig = {
  concurrency: 10,
  limiter: {
    max: 100,
    duration: 1000,
  },
  settings: {
    backoffStrategy: 'exponential',
    maxRetries: 5,
    retryDelay: 1000,
  },
};
```

---

## 6. ERROR HANDLING

### 6.1 Response Codes

| Status | Semnificație | Acțiune Provider |
| ------ | ------------ | ---------------- |
| `200 OK` | Webhook primit și înregistrat | Nu re-trimite |
| `400 Bad Request` | Payload invalid | Nu re-trimite |
| `401 Unauthorized` | Semnătură invalidă | Nu re-trimite |
| `429 Too Many Requests` | Rate limited | Retry cu backoff |
| `500 Internal Error` | Eroare procesare | Retry |

### 6.2 Dead Letter Queue

```typescript
// Webhooks eșuate merg în DLQ pentru investigare
const DLQ_CONFIG = {
  queueName: 'webhook:dlq',
  maxRetentionDays: 7,
  alertThreshold: 10, // Alert dacă > 10 în DLQ
};
```

---

## 7. MONITORING

### 7.1 Metrici Webhook

| Metric | Type | Labels |
| ------ | ---- | ------ |
| `webhook_received_total` | Counter | provider, event_type |
| `webhook_processed_total` | Counter | provider, status |
| `webhook_processing_duration_seconds` | Histogram | provider |
| `webhook_dlq_size` | Gauge | provider |

### 7.2 Alerting

```yaml
# SigNoz Alert pentru webhook failures
alerts:
  - name: HighWebhookFailureRate
    condition: |
      rate(webhook_processed_total{status="failed"}[5m]) 
      / rate(webhook_received_total[5m]) > 0.1
    severity: critical
    
  - name: WebhookDLQBacklog
    condition: webhook_dlq_size > 10
    severity: warning
```

### 7.3 Logging

```typescript
// Log obligatoriu pentru fiecare webhook
logger.info('Webhook received', {
  provider: 'timelinesai',
  eventType: payload.event,
  eventId: payload.messageId || generateId(),
  signature: 'valid',
  timestamp: new Date().toISOString(),
});
```

---

## REFERINȚE ÎNCRUCIȘATE

| Document | Secțiuni Relevante |
| -------- | ------------------ |
| [`master-specification.md`](../specifications/master-specification.md) | § 2.7 Rate Limiting, § 4.1 Cozi |
| [`etapa2-workers-overview.md`](../specifications/Etapa%202/etapa2-workers-overview.md) | Categoria G (Webhooks) |
| [`etapa4-api-endpoints.md`](../specifications/Etapa%204/etapa4-api-endpoints.md) | § 9 Webhooks API |
| [`etapa4-workers-A-revolut.md`](../specifications/Etapa%204/etapa4-workers-A-revolut.md) | Revolut Webhook Workers |

---

**Generat:** 19 Ianuarie 2026  
**Bazat pe:** etapa2-workers-overview, etapa4-workers-A-revolut, etapa4-api-endpoints  
**Canonical:** Da — Subordonat Master Spec v1.2
