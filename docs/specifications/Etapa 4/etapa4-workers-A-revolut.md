# CERNIQ.APP — ETAPA 4: WORKERS CATEGORIA A
## Revolut Webhook Workers (6 Workers)
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Overview Categoria A](#1-overview)
2. [Worker #1: revolut:webhook:ingest](#2-worker-1)
3. [Worker #2: revolut:transaction:process](#3-worker-2)
4. [Worker #3: revolut:payment:record](#4-worker-3)
5. [Worker #4: revolut:refund:process](#5-worker-4)
6. [Worker #5: revolut:balance:sync](#6-worker-5)
7. [Worker #6: revolut:webhook:validate](#7-worker-6)

---

## 1. Overview Categoria A {#1-overview}

Categoria A gestionează integrarea cu Revolut Business API pentru procesarea plăților în timp real.

### Webhook Flow
```
Revolut Webhook POST → A1 (Ingest) → A6 (Validate) → A2 (Process) → A3 (Record)
                                                                      ↓
                                                              Payment Recorded
                                                                      ↓
                                                              Trigger B7 (Reconcile)
```

### Revolut API Configuration
```typescript
const REVOLUT_CONFIG = {
  baseUrl: 'https://b2b.revolut.com/api/1.0',
  webhookVersion: 'v1',
  
  // Webhook Events
  events: [
    'TransactionCreated',
    'TransactionStateChanged',
    'PayoutLinkCreated',
    'PayoutLinkStateChanged'
  ],
  
  // Security
  hmacAlgorithm: 'sha256',
  signatureHeader: 'X-Revolut-Signature-V1',
  
  // Retry
  maxRetries: 3,
  retryBackoff: 'exponential'
};
```

---

## 2. Worker #1: revolut:webhook:ingest {#2-worker-1}

### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `revolut:webhook:ingest` |
| **Concurrency** | 10 |
| **Timeout** | 30000ms |
| **Max Attempts** | 1 (no retry, webhook redelivery) |
| **Critical** | ✅ YES |

### Job Input Schema
```typescript
interface RevolutWebhookIngestInput {
  correlationId: string;
  tenantId: string;
  
  // From Webhook
  headers: {
    'x-revolut-signature-v1': string;
    'x-webhook-id': string;
    'content-type': string;
  };
  rawPayload: string; // Raw JSON string for signature validation
  payload: RevolutWebhookPayload;
  
  // Metadata
  receivedAt: string;
  sourceIp: string;
}

interface RevolutWebhookPayload {
  event: 'TransactionCreated' | 'TransactionStateChanged';
  timestamp: string;
  data: {
    id: string;
    type: 'transfer' | 'card_payment' | 'atm' | 'fee';
    state: 'pending' | 'completed' | 'declined' | 'failed' | 'reverted';
    created_at: string;
    completed_at?: string;
    
    // Money
    legs: Array<{
      leg_id: string;
      amount: number;
      currency: string;
      account_id: string;
      counterparty?: {
        account_id: string;
        account_type: string;
        name: string;
      };
      description?: string;
      reference?: string;
    }>;
  };
}
```

### Job Output Schema
```typescript
interface RevolutWebhookIngestOutput {
  success: boolean;
  webhookId: string;
  eventType: string;
  transactionId: string;
  
  validation: {
    signatureValid: boolean;
    idempotencyChecked: boolean;
    isDuplicate: boolean;
  };
  
  // Next step
  nextQueue: 'revolut:transaction:process' | null;
  processData?: RevolutTransactionData;
}
```

### Implementare
```typescript
export async function revolutWebhookIngestProcessor(
  job: Job<RevolutWebhookIngestInput>
): Promise<RevolutWebhookIngestOutput> {
  const { correlationId, tenantId, headers, rawPayload, payload, receivedAt } = job.data;
  const span = tracer.startSpan('revolut:webhook:ingest');
  
  try {
    // 1. Validate HMAC signature
    const signatureValid = await validateRevolutSignature(
      headers['x-revolut-signature-v1'],
      rawPayload,
      process.env.REVOLUT_WEBHOOK_SECRET!
    );
    
    if (!signatureValid) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Invalid signature' });
      throw new Error('INVALID_WEBHOOK_SIGNATURE');
    }
    
    // 2. Idempotency check
    const webhookId = headers['x-webhook-id'];
    const isDuplicate = await redis.exists(`webhook:revolut:${webhookId}`);
    
    if (isDuplicate) {
      logger.info({ webhookId }, 'Duplicate webhook ignored');
      return {
        success: true,
        webhookId,
        eventType: payload.event,
        transactionId: payload.data.id,
        validation: { signatureValid: true, idempotencyChecked: true, isDuplicate: true },
        nextQueue: null
      };
    }
    
    // 3. Mark as processed (24h TTL)
    await redis.setex(`webhook:revolut:${webhookId}`, 86400, '1');
    
    // 4. Store raw webhook for audit
    await db.insert(revolutWebhooksRaw).values({
      tenantId,
      webhookId,
      eventType: payload.event,
      transactionId: payload.data.id,
      rawPayload: JSON.parse(rawPayload),
      receivedAt: new Date(receivedAt),
      processedAt: new Date()
    });
    
    // 5. Queue for processing
    const processData: RevolutTransactionData = {
      transactionId: payload.data.id,
      eventType: payload.event,
      state: payload.data.state,
      type: payload.data.type,
      createdAt: payload.data.created_at,
      completedAt: payload.data.completed_at,
      legs: payload.data.legs
    };
    
    await flowProducer.add({
      queueName: 'revolut:transaction:process',
      name: `txn-${payload.data.id}`,
      data: {
        correlationId,
        tenantId,
        ...processData
      }
    });
    
    span.setStatus({ code: SpanStatusCode.OK });
    
    return {
      success: true,
      webhookId,
      eventType: payload.event,
      transactionId: payload.data.id,
      validation: { signatureValid: true, idempotencyChecked: true, isDuplicate: false },
      nextQueue: 'revolut:transaction:process',
      processData
    };
    
  } finally {
    span.end();
  }
}

// HMAC Validation
async function validateRevolutSignature(
  signature: string,
  payload: string,
  secret: string
): Promise<boolean> {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## 3. Worker #2: revolut:transaction:process {#3-worker-2}

### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `revolut:transaction:process` |
| **Concurrency** | 5 |
| **Timeout** | 30000ms |
| **Max Attempts** | 3 |
| **Backoff** | Exponential, 5000ms |

### Job Input Schema
```typescript
interface RevolutTransactionProcessInput {
  correlationId: string;
  tenantId: string;
  
  transactionId: string;
  eventType: string;
  state: string;
  type: string;
  createdAt: string;
  completedAt?: string;
  
  legs: Array<{
    leg_id: string;
    amount: number;
    currency: string;
    account_id: string;
    counterparty?: {
      account_id: string;
      account_type: string;
      name: string;
    };
    description?: string;
    reference?: string;
  }>;
}
```

### Implementare
```typescript
export async function revolutTransactionProcessProcessor(
  job: Job<RevolutTransactionProcessInput>
): Promise<RevolutTransactionProcessOutput> {
  const { correlationId, tenantId, transactionId, state, type, legs } = job.data;
  
  // Only process completed incoming transfers
  if (state !== 'completed') {
    return { success: true, action: 'IGNORED', reason: 'Not completed' };
  }
  
  // Find incoming leg (credit to our account)
  const incomingLeg = legs.find(leg => leg.amount > 0);
  if (!incomingLeg) {
    return { success: true, action: 'IGNORED', reason: 'No incoming funds' };
  }
  
  // Extract payment info
  const paymentData = {
    externalId: transactionId,
    externalSource: 'REVOLUT',
    amount: incomingLeg.amount / 100, // Revolut amounts in minor units
    currency: incomingLeg.currency,
    counterpartyName: incomingLeg.counterparty?.name || 'Unknown',
    counterpartyAccount: incomingLeg.counterparty?.account_id,
    description: incomingLeg.description || '',
    reference: incomingLeg.reference || extractReference(incomingLeg.description || ''),
    transactionDate: job.data.completedAt || job.data.createdAt
  };
  
  // Queue for recording
  await flowProducer.add({
    queueName: 'revolut:payment:record',
    name: `record-${transactionId}`,
    data: {
      correlationId,
      tenantId,
      ...paymentData
    }
  });
  
  return {
    success: true,
    action: 'QUEUED_FOR_RECORD',
    paymentAmount: paymentData.amount,
    currency: paymentData.currency
  };
}

function extractReference(description: string): string | null {
  // Try to extract invoice reference from description
  // Common patterns: "INV-12345", "Factura 12345", "REF: 12345"
  const patterns = [
    /INV[-\s]?(\d+)/i,
    /FACTURA[-\s]?(\d+)/i,
    /REF[:\s]+([A-Z0-9-]+)/i,
    /(\d{6,})/
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}
```

---

## 4. Worker #3: revolut:payment:record {#4-worker-3}

### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `revolut:payment:record` |
| **Concurrency** | 10 |
| **Timeout** | 15000ms |
| **Max Attempts** | 3 |
| **Critical** | ✅ YES |

### Implementare
```typescript
export async function revolutPaymentRecordProcessor(
  job: Job<PaymentRecordInput>
): Promise<PaymentRecordOutput> {
  const { 
    correlationId, tenantId, externalId, externalSource,
    amount, currency, counterpartyName, counterpartyAccount,
    description, reference, transactionDate
  } = job.data;
  
  // 1. Record payment in database
  const [payment] = await db.insert(goldPayments).values({
    tenantId,
    externalId,
    externalSource,
    amount,
    currency,
    counterpartyName,
    counterpartyAccount,
    description,
    reference,
    paymentMethod: 'REVOLUT',
    status: 'CONFIRMED',
    reconciliationStatus: 'PENDING',
    transactionDate: new Date(transactionDate),
    rawPayload: job.data,
    correlationId
  }).returning();
  
  // 2. Queue for reconciliation
  await flowProducer.add({
    queueName: 'payment:reconcile:auto',
    name: `reconcile-${payment.id}`,
    data: {
      correlationId,
      tenantId,
      paymentId: payment.id,
      amount,
      currency,
      reference,
      counterpartyName,
      transactionDate
    }
  });
  
  // 3. Log audit
  await logAudit('PAYMENT_RECEIVED', 'gold_payments', payment.id, correlationId, {
    amount,
    currency,
    source: 'REVOLUT'
  });
  
  return {
    success: true,
    paymentId: payment.id,
    amount,
    currency,
    nextQueue: 'payment:reconcile:auto'
  };
}
```

---

## 5. Worker #4: revolut:refund:process {#5-worker-4}

### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `revolut:refund:process` |
| **Concurrency** | 3 |
| **Timeout** | 60000ms |
| **Max Attempts** | 3 |

### Implementare
```typescript
export async function revolutRefundProcessProcessor(
  job: Job<RefundProcessInput>
): Promise<RefundProcessOutput> {
  const { correlationId, tenantId, refundId, clientId, amount, currency } = job.data;
  
  // 1. Get client bank details
  const client = await db.query.goldClients.findFirst({
    where: eq(goldClients.id, clientId)
  });
  
  if (!client?.bankAccount) {
    throw new Error('CLIENT_NO_BANK_ACCOUNT');
  }
  
  // 2. Create Revolut payment
  const revolutPayment = await revolutClient.createPayment({
    account_id: process.env.REVOLUT_ACCOUNT_ID,
    receiver: {
      account_id: client.bankAccount,
      counterparty_id: client.revolutCounterpartyId
    },
    amount: Math.round(amount * 100), // Minor units
    currency,
    reference: `REFUND-${refundId}`,
    schedule_for: null // Immediate
  });
  
  // 3. Update refund record
  await db.update(goldRefunds)
    .set({
      status: 'PROCESSING',
      revolutRefundId: revolutPayment.id,
      revolutStatus: revolutPayment.state,
      updatedAt: new Date()
    })
    .where(eq(goldRefunds.id, refundId));
  
  return {
    success: true,
    refundId,
    revolutPaymentId: revolutPayment.id,
    status: revolutPayment.state
  };
}
```

---

## 6. Worker #5: revolut:balance:sync {#6-worker-5}

### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `revolut:balance:sync` |
| **Trigger** | Cron `*/30 * * * *` (every 30 min) |
| **Concurrency** | 1 |
| **Timeout** | 60000ms |

### Implementare
```typescript
export async function revolutBalanceSyncProcessor(
  job: Job<{correlationId: string}>
): Promise<BalanceSyncOutput> {
  const { correlationId } = job.data;
  
  // 1. Fetch all accounts
  const accounts = await revolutClient.getAccounts();
  
  // 2. Store balances
  for (const account of accounts) {
    await db.insert(revolutBalances)
      .values({
        accountId: account.id,
        currency: account.currency,
        balance: account.balance / 100,
        available: account.available / 100,
        syncedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [revolutBalances.accountId],
        set: {
          balance: account.balance / 100,
          available: account.available / 100,
          syncedAt: new Date()
        }
      });
  }
  
  // 3. Update metrics
  metrics.revolutBalance.set(
    accounts.find(a => a.currency === 'RON')?.balance || 0
  );
  
  return {
    success: true,
    accountsUpdated: accounts.length,
    totalBalanceRon: accounts.find(a => a.currency === 'RON')?.balance || 0
  };
}
```

---

## 7. Worker #6: revolut:webhook:validate {#7-worker-6}

### Specificații

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `revolut:webhook:validate` |
| **Concurrency** | 10 |
| **Timeout** | 5000ms |
| **Purpose** | Re-validate webhook data integrity |

### Implementare
```typescript
export async function revolutWebhookValidateProcessor(
  job: Job<WebhookValidateInput>
): Promise<WebhookValidateOutput> {
  const { correlationId, transactionId, expectedAmount, expectedCurrency } = job.data;
  
  // Fetch transaction from Revolut API to verify
  const transaction = await revolutClient.getTransaction(transactionId);
  
  const isValid = (
    transaction.state === 'completed' &&
    transaction.legs[0].amount === expectedAmount &&
    transaction.legs[0].currency === expectedCurrency
  );
  
  if (!isValid) {
    logger.warn({ correlationId, transactionId }, 'Transaction validation mismatch');
    // Queue for manual review
    await flowProducer.add({
      queueName: 'hitl:investigation:payment',
      data: {
        correlationId,
        reason: 'VALIDATION_MISMATCH',
        transactionId,
        expected: { amount: expectedAmount, currency: expectedCurrency },
        actual: { amount: transaction.legs[0].amount, currency: transaction.legs[0].currency }
      }
    });
  }
  
  return {
    success: true,
    isValid,
    validatedAt: new Date().toISOString()
  };
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
