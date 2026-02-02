# CERNIQ.APP — ETAPA 3: WORKERS TRIGGERS
## Inter-Worker Communication & Event-Driven Architecture
### Versiunea 2.0 | 01 Februarie 2026

**Sprint Plan:** Triggers implementate transversal în toate sprint-urile (vezi [etapa3-sprint-plan.md](etapa3-sprint-plan.md))

---

# CUPRINS

1. [Arhitectură Event-Driven](#1-arhitectură-event-driven)
2. [BullMQ Flow Patterns](#2-bullmq-flow-patterns)
3. [Trigger Matrix](#3-trigger-matrix)
4. [Event Definitions](#4-event-definitions)
5. [Cross-Stage Triggers](#5-cross-stage-triggers)
6. [Workflow Orchestration](#6-workflow-orchestration)
7. [Error Propagation](#7-error-propagation)
8. [Circuit Breakers](#8-circuit-breakers)
9. [Monitoring & Tracing](#9-monitoring--tracing)
10. [Implementation Examples](#10-implementation-examples)

---

# 1. ARHITECTURĂ EVENT-DRIVEN

## 1.1 Principii de Design

Etapa 3 folosește o arhitectură complet event-driven, unde fiecare worker:
- Ascultă evenimente specifice pe queue-uri dedicate
- Publică evenimente pentru următorii consumatori
- Nu cunoaște direct ceilalți workers (loose coupling)
- Folosește Redis pub/sub pentru notificări realtime

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ETAPA 3 EVENT ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐            │
│  │   ETAPA 2   │        │   ETAPA 3   │        │   ETAPA 4   │            │
│  │  (Outreach) │───────►│ (AI Sales)  │───────►│(Monitoring) │            │
│  └─────────────┘        └─────────────┘        └─────────────┘            │
│         │                     │                      ▲                     │
│         │                     │                      │                     │
│         │    ┌────────────────┴────────────────┐     │                     │
│         │    │                                 │     │                     │
│         ▼    ▼                                 ▼     │                     │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │                    REDIS EVENT BUS                              │      │
│  │  ┌───────────┬───────────┬───────────┬───────────┬──────────┐  │      │
│  │  │ handover: │negotiation│  pricing: │  fiscal:  │ guardrail│  │      │
│  │  │    *      │    *      │     *     │     *     │    *     │  │      │
│  │  └───────────┴───────────┴───────────┴───────────┴──────────┘  │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│         │              │              │              │                     │
│         ▼              ▼              ▼              ▼                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │ Worker A  │  │ Worker B  │  │ Worker C  │  │ Worker N  │              │
│  │ (Product) │  │ (Search)  │  │ (AI Core) │  │  (Human)  │              │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1.2 Queue Naming Convention

Format: `{stage}:{category}:{action}`

```typescript
// Queue naming patterns pentru Etapa 3
const ETAPA3_QUEUES = {
  // Product Knowledge (A)
  PRODUCT_SYNC: 'etapa3:product:sync',
  PRODUCT_EMBED: 'etapa3:product:embed',
  PRODUCT_CHUNK: 'etapa3:product:chunk',
  PRODUCT_INDEX: 'etapa3:product:index',
  PRODUCT_VALIDATE: 'etapa3:product:validate',
  PRODUCT_PRICE_UPDATE: 'etapa3:product:price-update',
  
  // Hybrid Search (B)
  SEARCH_SEMANTIC: 'etapa3:search:semantic',
  SEARCH_KEYWORD: 'etapa3:search:keyword',
  SEARCH_HYBRID: 'etapa3:search:hybrid',
  SEARCH_RERANK: 'etapa3:search:rerank',
  SEARCH_CACHE: 'etapa3:search:cache',
  SEARCH_ANALYTICS: 'etapa3:search:analytics',
  
  // AI Agent Core (C)
  AI_ORCHESTRATOR: 'etapa3:ai:orchestrator',
  AI_INTENT: 'etapa3:ai:intent',
  AI_RESPONSE: 'etapa3:ai:response',
  AI_TOOL_CALL: 'etapa3:ai:tool-call',
  AI_STREAM: 'etapa3:ai:stream',
  AI_FALLBACK: 'etapa3:ai:fallback',
  
  // Negotiation FSM (D)
  NEGOTIATION_CREATE: 'etapa3:negotiation:create',
  NEGOTIATION_TRANSITION: 'etapa3:negotiation:transition',
  NEGOTIATION_VALIDATE: 'etapa3:negotiation:validate',
  NEGOTIATION_TIMEOUT: 'etapa3:negotiation:timeout',
  NEGOTIATION_HISTORY: 'etapa3:negotiation:history',
  NEGOTIATION_COMPLETE: 'etapa3:negotiation:complete',
  NEGOTIATION_CANCEL: 'etapa3:negotiation:cancel',
  NEGOTIATION_ITEM: 'etapa3:negotiation:item',
  
  // Pricing & Discount (E)
  PRICING_CALCULATE: 'etapa3:pricing:calculate',
  PRICING_DISCOUNT: 'etapa3:pricing:discount',
  PRICING_VALIDATE: 'etapa3:pricing:validate',
  PRICING_APPROVAL: 'etapa3:pricing:approval',
  PRICING_RULE_UPDATE: 'etapa3:pricing:rule-update',
  PRICING_BULK: 'etapa3:pricing:bulk',
  
  // Stock & Inventory (F)
  STOCK_CHECK: 'etapa3:stock:check',
  STOCK_RESERVE: 'etapa3:stock:reserve',
  STOCK_RELEASE: 'etapa3:stock:release',
  STOCK_UPDATE: 'etapa3:stock:update',
  STOCK_ALERT: 'etapa3:stock:alert',
  STOCK_SYNC: 'etapa3:stock:sync',
  
  // Oblio Integration (G)
  OBLIO_PROFORMA: 'etapa3:oblio:proforma',
  OBLIO_INVOICE: 'etapa3:oblio:invoice',
  OBLIO_CANCEL: 'etapa3:oblio:cancel',
  OBLIO_SYNC: 'etapa3:oblio:sync',
  OBLIO_WEBHOOK: 'etapa3:oblio:webhook',
  OBLIO_RETRY: 'etapa3:oblio:retry',
  OBLIO_STORNO: 'etapa3:oblio:storno',
  
  // e-Factura SPV (H)
  EINVOICE_GENERATE: 'etapa3:einvoice:generate',
  EINVOICE_SUBMIT: 'etapa3:einvoice:submit',
  EINVOICE_STATUS: 'etapa3:einvoice:status',
  EINVOICE_DOWNLOAD: 'etapa3:einvoice:download',
  EINVOICE_DEADLINE: 'etapa3:einvoice:deadline',
  
  // Document Generation (I)
  DOCUMENT_PROFORMA_PDF: 'etapa3:document:proforma-pdf',
  DOCUMENT_INVOICE_PDF: 'etapa3:document:invoice-pdf',
  DOCUMENT_CONTRACT: 'etapa3:document:contract',
  DOCUMENT_STORAGE: 'etapa3:document:storage',
  DOCUMENT_CLEANUP: 'etapa3:document:cleanup',
  
  // Handover & Channel (J)
  HANDOVER_RECEIVE: 'etapa3:handover:receive',
  HANDOVER_PREPARE: 'etapa3:handover:prepare',
  HANDOVER_COMPLETE: 'etapa3:handover:complete',
  CHANNEL_WHATSAPP: 'etapa3:channel:whatsapp',
  CHANNEL_EMAIL: 'etapa3:channel:email',
  
  // Sentiment & Intent (K)
  SENTIMENT_ANALYZE: 'etapa3:sentiment:analyze',
  SENTIMENT_AGGREGATE: 'etapa3:sentiment:aggregate',
  INTENT_CLASSIFY: 'etapa3:intent:classify',
  INTENT_ENTITIES: 'etapa3:intent:entities',
  INTENT_URGENCY: 'etapa3:intent:urgency',
  
  // MCP Server (L)
  MCP_SESSION: 'etapa3:mcp:session',
  MCP_TOOL_EXECUTE: 'etapa3:mcp:tool-execute',
  MCP_RESOURCE_FETCH: 'etapa3:mcp:resource-fetch',
  MCP_CACHE: 'etapa3:mcp:cache',
  MCP_CLEANUP: 'etapa3:mcp:cleanup',
  
  // Guardrails (M)
  GUARDRAIL_PRICE: 'etapa3:guardrail:price',
  GUARDRAIL_STOCK: 'etapa3:guardrail:stock',
  GUARDRAIL_DISCOUNT: 'etapa3:guardrail:discount',
  GUARDRAIL_CONTENT: 'etapa3:guardrail:content',
  GUARDRAIL_FINAL: 'etapa3:guardrail:final',
  
  // Human Intervention (N)
  HUMAN_ESCALATION: 'etapa3:human:escalation',
  HUMAN_TAKEOVER: 'etapa3:human:takeover',
  HUMAN_APPROVAL: 'etapa3:human:approval',
  HUMAN_REVIEW: 'etapa3:human:review',
} as const;
```

## 1.3 Event Envelope Standard

```typescript
interface EventEnvelope<T = unknown> {
  // Identity
  eventId: string;           // ULID
  eventType: string;         // e.g., 'NEGOTIATION_CREATED'
  version: '1.0';
  
  // Context
  tenantId: string;
  correlationId: string;     // traces across workers
  causationId: string;       // parent event that caused this
  
  // Timing
  timestamp: string;         // ISO 8601
  scheduledFor?: string;     // pentru delayed jobs
  
  // Payload
  payload: T;
  
  // Metadata
  metadata: {
    source: string;          // worker name
    sourceVersion: string;   // worker version
    retryCount: number;
    maxRetries: number;
    priority: 'critical' | 'high' | 'normal' | 'low';
    ttl?: number;            // ms until expiration
  };
  
  // Tracing
  trace?: {
    traceId: string;         // OpenTelemetry
    spanId: string;
    parentSpanId?: string;
  };
}
```


---

# 2. BULLMQ FLOW PATTERNS

## 2.1 Flow Producer pentru Pipeline-uri Complexe

BullMQ Flows permit orchestrarea job-urilor cu dependențe:

```typescript
import { FlowProducer, Queue, Worker, Job } from 'bullmq';
import { redis } from '@/lib/redis';

// Flow Producer singleton
export const flowProducer = new FlowProducer({ connection: redis });

// AI Response Flow - orchestrează tot procesul de răspuns
export async function createAIResponseFlow(params: {
  tenantId: string;
  negotiationId: string;
  messageId: string;
  userMessage: string;
}): Promise<string> {
  const correlationId = ulid();
  
  const flow = await flowProducer.add({
    name: 'ai-response-complete',
    queueName: ETAPA3_QUEUES.AI_ORCHESTRATOR,
    data: {
      eventType: 'AI_RESPONSE_COMPLETE',
      correlationId,
      ...params,
    },
    children: [
      // Level 1: Parallel preprocessing
      {
        name: 'intent-classification',
        queueName: ETAPA3_QUEUES.AI_INTENT,
        data: {
          eventType: 'INTENT_CLASSIFY',
          correlationId,
          message: params.userMessage,
        },
      },
      {
        name: 'sentiment-analysis',
        queueName: ETAPA3_QUEUES.SENTIMENT_ANALYZE,
        data: {
          eventType: 'SENTIMENT_ANALYZE',
          correlationId,
          message: params.userMessage,
        },
      },
      {
        name: 'context-retrieval',
        queueName: ETAPA3_QUEUES.SEARCH_HYBRID,
        data: {
          eventType: 'SEARCH_HYBRID',
          correlationId,
          query: params.userMessage,
          negotiationId: params.negotiationId,
        },
        children: [
          // Level 2: MCP resources for context
          {
            name: 'load-negotiation-context',
            queueName: ETAPA3_QUEUES.MCP_RESOURCE_FETCH,
            data: {
              eventType: 'MCP_RESOURCE_FETCH',
              correlationId,
              resourceUri: `negotiation://${params.negotiationId}`,
            },
          },
        ],
      },
    ],
  });
  
  return flow.job.id!;
}
```

## 2.2 Parent-Child Job Relationships

```typescript
// Exemplu: Negotiation Complete Flow
// Parent: NEGOTIATION_COMPLETE
// Children: OBLIO_INVOICE, STOCK_RELEASE, EINVOICE_GENERATE (parallel)

export async function createNegotiationCompleteFlow(params: {
  tenantId: string;
  negotiationId: string;
  finalPrice: number;
  items: Array<{ sku: string; quantity: number; price: number }>;
}): Promise<string> {
  const correlationId = ulid();
  
  const flow = await flowProducer.add({
    name: 'negotiation-complete-orchestrator',
    queueName: ETAPA3_QUEUES.NEGOTIATION_COMPLETE,
    data: {
      eventType: 'NEGOTIATION_COMPLETED',
      correlationId,
      ...params,
    },
    children: [
      // Parallel: Generate invoice and release stock
      {
        name: 'generate-oblio-invoice',
        queueName: ETAPA3_QUEUES.OBLIO_INVOICE,
        data: {
          eventType: 'OBLIO_INVOICE_CREATE',
          correlationId,
          negotiationId: params.negotiationId,
          amount: params.finalPrice,
          items: params.items,
        },
        children: [
          // After invoice: Generate PDF
          {
            name: 'generate-invoice-pdf',
            queueName: ETAPA3_QUEUES.DOCUMENT_INVOICE_PDF,
            data: {
              eventType: 'DOCUMENT_INVOICE_PDF',
              correlationId,
            },
          },
          // After invoice: Submit to e-Factura
          {
            name: 'submit-einvoice',
            queueName: ETAPA3_QUEUES.EINVOICE_GENERATE,
            data: {
              eventType: 'EINVOICE_GENERATE',
              correlationId,
            },
          },
        ],
      },
      // Parallel: Release all stock reservations
      {
        name: 'release-stock-reservations',
        queueName: ETAPA3_QUEUES.STOCK_RELEASE,
        data: {
          eventType: 'STOCK_RELEASE_ALL',
          correlationId,
          negotiationId: params.negotiationId,
          items: params.items.map(i => ({
            sku: i.sku,
            quantity: i.quantity,
            action: 'COMMIT', // Convert reservation to sale
          })),
        },
      },
      // Parallel: Update negotiation state
      {
        name: 'finalize-negotiation',
        queueName: ETAPA3_QUEUES.NEGOTIATION_TRANSITION,
        data: {
          eventType: 'NEGOTIATION_STATE_TRANSITION',
          correlationId,
          negotiationId: params.negotiationId,
          toState: 'COMPLETED',
          metadata: {
            finalPrice: params.finalPrice,
            completedAt: new Date().toISOString(),
          },
        },
      },
    ],
  });
  
  return flow.job.id!;
}
```

## 2.3 Job Dependencies with `waitChildrenOnFailed`

```typescript
// Flow options pentru handling failures
const flowOptions = {
  // Don't fail parent if child fails - allow partial completion
  waitChildrenOnFailed: false,
  
  // Custom failure handling
  failParentOnFailure: false,
  
  // Remove child results after parent completes
  removeDependencyOnFailure: false,
};

// Exemplu: Discount Approval Flow cu fallback
export async function createDiscountApprovalFlow(params: {
  tenantId: string;
  negotiationId: string;
  requestedDiscount: number;
  productSku: string;
}): Promise<string> {
  const correlationId = ulid();
  const discountPercent = params.requestedDiscount;
  
  // Decide flow based on discount level
  if (discountPercent <= 15) {
    // Auto-approve
    return flowProducer.add({
      name: 'discount-auto-approve',
      queueName: ETAPA3_QUEUES.PRICING_VALIDATE,
      data: {
        eventType: 'DISCOUNT_AUTO_APPROVED',
        correlationId,
        ...params,
        approvalType: 'AUTO',
      },
    }).then(f => f.job.id!);
  }
  
  if (discountPercent <= 30) {
    // Manager approval required
    return flowProducer.add({
      name: 'discount-manager-approval',
      queueName: ETAPA3_QUEUES.HUMAN_APPROVAL,
      data: {
        eventType: 'DISCOUNT_APPROVAL_REQUIRED',
        correlationId,
        ...params,
        approvalType: 'MANAGER',
        requiredRole: 'SALES_MANAGER',
        slaMinutes: 60,
      },
      children: [
        {
          name: 'validate-discount-rules',
          queueName: ETAPA3_QUEUES.GUARDRAIL_DISCOUNT,
          data: {
            eventType: 'GUARDRAIL_DISCOUNT_CHECK',
            correlationId,
            discount: discountPercent,
            productSku: params.productSku,
          },
        },
      ],
    }).then(f => f.job.id!);
  }
  
  // Director approval (> 30%)
  return flowProducer.add({
    name: 'discount-director-approval',
    queueName: ETAPA3_QUEUES.HUMAN_APPROVAL,
    data: {
      eventType: 'DISCOUNT_APPROVAL_REQUIRED',
      correlationId,
      ...params,
      approvalType: 'DIRECTOR',
      requiredRole: 'DIRECTOR',
      escalationChain: ['SALES_MANAGER', 'DIRECTOR', 'CEO'],
      slaMinutes: 120,
    },
  }).then(f => f.job.id!);
}
```

## 2.4 Repeatable Jobs (Cron-like)

```typescript
// Scheduled jobs pentru Etapa 3
export async function setupScheduledJobs() {
  const queues = {
    stockSync: new Queue(ETAPA3_QUEUES.STOCK_SYNC, { connection: redis }),
    oblioSync: new Queue(ETAPA3_QUEUES.OBLIO_SYNC, { connection: redis }),
    einvoiceDeadline: new Queue(ETAPA3_QUEUES.EINVOICE_DEADLINE, { connection: redis }),
    negotiationTimeout: new Queue(ETAPA3_QUEUES.NEGOTIATION_TIMEOUT, { connection: redis }),
    mcpCleanup: new Queue(ETAPA3_QUEUES.MCP_CLEANUP, { connection: redis }),
    documentCleanup: new Queue(ETAPA3_QUEUES.DOCUMENT_CLEANUP, { connection: redis }),
  };
  
  // Stock sync every 5 minutes
  await queues.stockSync.add(
    'stock-sync-periodic',
    { eventType: 'STOCK_SYNC_ALL' },
    {
      repeat: {
        pattern: '*/5 * * * *', // Every 5 minutes
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );
  
  // Oblio sync every 15 minutes
  await queues.oblioSync.add(
    'oblio-sync-periodic',
    { eventType: 'OBLIO_SYNC_STATUS' },
    {
      repeat: {
        pattern: '*/15 * * * *', // Every 15 minutes
      },
    }
  );
  
  // e-Factura deadline check every hour
  await queues.einvoiceDeadline.add(
    'einvoice-deadline-check',
    { eventType: 'EINVOICE_CHECK_DEADLINES' },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
    }
  );
  
  // Negotiation timeout check every minute
  await queues.negotiationTimeout.add(
    'negotiation-timeout-check',
    { eventType: 'NEGOTIATION_CHECK_TIMEOUTS' },
    {
      repeat: {
        pattern: '* * * * *', // Every minute
      },
    }
  );
  
  // MCP session cleanup every 30 minutes
  await queues.mcpCleanup.add(
    'mcp-session-cleanup',
    { eventType: 'MCP_CLEANUP_STALE_SESSIONS' },
    {
      repeat: {
        pattern: '*/30 * * * *',
      },
    }
  );
  
  // Document cleanup daily at 3 AM
  await queues.documentCleanup.add(
    'document-cleanup-daily',
    { eventType: 'DOCUMENT_CLEANUP_EXPIRED' },
    {
      repeat: {
        pattern: '0 3 * * *', // 3 AM daily
      },
    }
  );
  
  console.log('Scheduled jobs configured for Etapa 3');
}
```

---

# 3. TRIGGER MATRIX

## 3.1 Complete Trigger Map - Workers A-N

Această matrice definește TOATE trigger-urile între workers:

```
LEGEND:
→ = triggers (produces event)
← = triggered by (consumes event)
↔ = bidirectional
[P] = Primary trigger
[S] = Secondary/conditional trigger
[F] = Failure/fallback trigger
```

### A: Product Knowledge Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| A1: ProductSyncWorker | External webhook, Manual | A2, A3 | PRODUCT_SYNCED |
| A2: ProductEmbedWorker | A1 completion | A4 | PRODUCT_EMBEDDED |
| A3: ProductChunkWorker | A1 completion | A4 | PRODUCT_CHUNKED |
| A4: ProductIndexWorker | A2, A3 completion | - | PRODUCT_INDEXED |
| A5: ProductValidateWorker | A1 (parallel) | A1 retry on fail | PRODUCT_VALIDATED |
| A6: PriceUpdateWorker | External/Manual | E1 | PRICE_UPDATED |

```typescript
// A1 → A2, A3 trigger
worker_A1.on('completed', async (job, result) => {
  const { tenantId, productId, sku } = job.data;
  
  // Trigger embedding generation
  await queue_A2.add('embed-product', {
    eventType: 'PRODUCT_EMBED_REQUEST',
    tenantId,
    productId,
    sku,
    text: result.productDescription,
    causationId: job.id,
  });
  
  // Trigger chunking for RAG
  await queue_A3.add('chunk-product', {
    eventType: 'PRODUCT_CHUNK_REQUEST',
    tenantId,
    productId,
    sku,
    fullText: result.fullProductText,
    causationId: job.id,
  });
});
```

### B: Hybrid Search Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| B1: SemanticSearchWorker | C1 AI Agent | B3 Hybrid | SEMANTIC_RESULTS |
| B2: KeywordSearchWorker | C1 AI Agent | B3 Hybrid | KEYWORD_RESULTS |
| B3: HybridSearchWorker | B1+B2 completion | B4 Rerank | HYBRID_RESULTS |
| B4: RerankWorker | B3 completion | C1 return | RERANKED_RESULTS |
| B5: SearchCacheWorker | B4 completion | - | SEARCH_CACHED |
| B6: SearchAnalyticsWorker | B4 completion | - | SEARCH_LOGGED |

```typescript
// B3 waits for both B1 and B2 (parallel execution, combined results)
const hybridSearchFlow = await flowProducer.add({
  name: 'hybrid-search',
  queueName: ETAPA3_QUEUES.SEARCH_HYBRID,
  data: { eventType: 'SEARCH_HYBRID_COMBINE' },
  children: [
    {
      name: 'semantic-search',
      queueName: ETAPA3_QUEUES.SEARCH_SEMANTIC,
      data: { eventType: 'SEARCH_SEMANTIC', query },
    },
    {
      name: 'keyword-search',
      queueName: ETAPA3_QUEUES.SEARCH_KEYWORD,
      data: { eventType: 'SEARCH_KEYWORD', query },
    },
  ],
});
```

### C: AI Agent Core Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| C1: AIOrchestrator | J1 Handover, Webhook | K1, K3, B3, L2 | AI_PROCESS_MESSAGE |
| C2: IntentClassifier | C1 parallel | C1 return | INTENT_CLASSIFIED |
| C3: ResponseGenerator | C1 after guards | M1-M4 | RESPONSE_GENERATED |
| C4: ToolCallExecutor | C3 tool calls | L2 MCP | TOOL_EXECUTED |
| C5: StreamProcessor | C3 streaming | J4, J5 Channel | STREAM_CHUNK |
| C6: FallbackHandler | C1/C3 failure | N2 Human | FALLBACK_TRIGGERED |

```typescript
// C1 Orchestrator - main entry point
worker_C1.process(async (job) => {
  const { tenantId, negotiationId, message, messageId } = job.data;
  
  // Step 1: Parallel intent + sentiment
  const [intent, sentiment] = await Promise.all([
    queue_K3.add('classify-intent', { message }).then(j => j.waitUntilFinished()),
    queue_K1.add('analyze-sentiment', { message }).then(j => j.waitUntilFinished()),
  ]);
  
  // Step 2: Hybrid search for context
  const searchResults = await queue_B3.add('hybrid-search', {
    query: message,
    negotiationId,
  }).then(j => j.waitUntilFinished());
  
  // Step 3: Generate response with guardrails
  const response = await queue_C3.add('generate-response', {
    intent,
    sentiment,
    context: searchResults,
    negotiationId,
  }).then(j => j.waitUntilFinished());
  
  // Step 4: Send to channel
  await queue_J4.add('send-whatsapp', {
    negotiationId,
    response: response.text,
  });
  
  return { success: true, responseId: response.id };
});
```

### D: Negotiation FSM Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| D1: NegotiationCreateWorker | J1 Handover | D2 Validate | NEGOTIATION_CREATED |
| D2: NegotiationTransitionWorker | D1, C1 actions | D5 History | STATE_TRANSITIONED |
| D3: NegotiationValidateWorker | D2 pre-transition | D2 allow/deny | TRANSITION_VALIDATED |
| D4: NegotiationTimeoutWorker | Cron every minute | D2 transition | TIMEOUT_DETECTED |
| D5: NegotiationHistoryWorker | D2 post-transition | - | HISTORY_RECORDED |
| D6: NegotiationCompleteWorker | D2 to COMPLETED | G2, F3, H1 | NEGOTIATION_COMPLETED |
| D7: NegotiationCancelWorker | User/Timeout | F3 release | NEGOTIATION_CANCELLED |
| D8: NegotiationItemWorker | C1 product add | F1 stock check | ITEM_ADDED |

```typescript
// D2 State Transition - triggers multiple downstream
worker_D2.on('completed', async (job, result) => {
  const { negotiationId, fromState, toState, tenantId } = result;
  
  // Always record history
  await queue_D5.add('record-history', {
    eventType: 'RECORD_STATE_HISTORY',
    negotiationId,
    fromState,
    toState,
    timestamp: new Date().toISOString(),
  });
  
  // Conditional triggers based on new state
  switch (toState) {
    case 'QUOTE_SENT':
      // Start validity timer
      await queue_D4.add('quote-timeout', {
        eventType: 'SCHEDULE_QUOTE_TIMEOUT',
        negotiationId,
        timeoutMinutes: 7 * 24 * 60, // 7 days
      }, { delay: 7 * 24 * 60 * 60 * 1000 });
      break;
      
    case 'PROFORMA_SENT':
      // Generate proforma in Oblio
      await queue_G1.add('create-proforma', {
        eventType: 'OBLIO_CREATE_PROFORMA',
        negotiationId,
      });
      break;
      
    case 'INVOICE_SENT':
      // Full completion flow
      await queue_D6.add('complete-negotiation', {
        eventType: 'NEGOTIATION_COMPLETE_FLOW',
        negotiationId,
      });
      break;
      
    case 'CANCELLED':
      // Release all stock
      await queue_D7.add('cancel-negotiation', {
        eventType: 'NEGOTIATION_CANCEL_FLOW',
        negotiationId,
      });
      break;
  }
});
```

### E: Pricing & Discount Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| E1: PriceCalculateWorker | C1 quote request | M1 Guardrail | PRICE_CALCULATED |
| E2: DiscountRequestWorker | C1 discount ask | E3 Validate | DISCOUNT_REQUESTED |
| E3: DiscountValidateWorker | E2 | N3 Approval or E4 | DISCOUNT_VALIDATED |
| E4: DiscountApprovalWorker | N3 approved | D8 update | DISCOUNT_APPROVED |
| E5: PriceRuleUpdateWorker | Manual/Import | A6 | PRICE_RULE_UPDATED |
| E6: BulkPriceWorker | Import | E1 batch | BULK_PRICE_PROCESSED |

```typescript
// E3 Validate → conditional trigger
worker_E3.process(async (job) => {
  const { discountPercent, productSku, negotiationId, tenantId } = job.data;
  
  // Get price rules
  const rules = await db.query.priceRules.findFirst({
    where: and(
      eq(priceRules.tenantId, tenantId),
      eq(priceRules.productSku, productSku)
    )
  });
  
  const maxAutoApprove = rules?.maxAutoDiscount ?? 15;
  const maxManagerApprove = rules?.maxManagerDiscount ?? 30;
  
  if (discountPercent <= maxAutoApprove) {
    // Auto-approve
    await queue_E4.add('auto-approve-discount', {
      eventType: 'DISCOUNT_AUTO_APPROVED',
      negotiationId,
      discountPercent,
      approvedBy: 'SYSTEM',
    });
    return { approved: true, type: 'AUTO' };
  }
  
  if (discountPercent <= maxManagerApprove) {
    // Require manager approval
    await queue_N3.add('request-manager-approval', {
      eventType: 'HITL_DISCOUNT_APPROVAL',
      negotiationId,
      discountPercent,
      requiredRole: 'SALES_MANAGER',
      slaMinutes: 60,
    });
    return { approved: false, type: 'PENDING_MANAGER' };
  }
  
  // Require director approval
  await queue_N3.add('request-director-approval', {
    eventType: 'HITL_DISCOUNT_APPROVAL',
    negotiationId,
    discountPercent,
    requiredRole: 'DIRECTOR',
    slaMinutes: 120,
  });
  return { approved: false, type: 'PENDING_DIRECTOR' };
});
```


### F: Stock & Inventory Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| F1: StockCheckWorker | C1 quote, B1 search | F2 Reserve | STOCK_CHECKED |
| F2: StockReserveWorker | F1 available | D4 quote | STOCK_RESERVED |
| F3: StockReleaseWorker | D7 cancel, timeout | - | STOCK_RELEASED |
| F4: StockUpdateWorker | G3 invoice | - | STOCK_UPDATED |
| F5: StockAlertWorker | F4 low stock | Notification | STOCK_ALERT |
| F6: StockSyncWorker | External ERP | F4 | STOCK_SYNCED |

```typescript
// F1 Stock Check → Reserve Flow
worker_F1.process(async (job) => {
  const { productSku, quantity, negotiationId, tenantId } = job.data;
  
  // Check available stock
  const stock = await db.query.stockInventory.findFirst({
    where: and(
      eq(stockInventory.tenantId, tenantId),
      eq(stockInventory.productSku, productSku)
    )
  });
  
  const available = (stock?.quantityAvailable ?? 0) - (stock?.quantityReserved ?? 0);
  
  if (available >= quantity) {
    // Reserve stock
    await queue_F2.add('reserve-stock', {
      eventType: 'STOCK_RESERVE_REQUEST',
      negotiationId,
      productSku,
      quantity,
      reservationDuration: 24 * 60 * 60 * 1000, // 24 hours
    });
    return { available: true, quantity: available };
  }
  
  // Insufficient stock - notify AI
  await redis.publish(`ai:stock:${tenantId}`, JSON.stringify({
    type: 'INSUFFICIENT_STOCK',
    productSku,
    requested: quantity,
    available,
    negotiationId,
  }));
  
  return { available: false, quantity: available };
});

// F2 Reserve → Update negotiation
worker_F2.process(async (job) => {
  const { negotiationId, productSku, quantity, tenantId } = job.data;
  
  // Create reservation
  const reservation = await db.insert(stockReservations).values({
    tenantId,
    negotiationId,
    productSku,
    quantity,
    status: 'ACTIVE',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }).returning();
  
  // Update stock counts
  await db.update(stockInventory)
    .set({ quantityReserved: sql`quantity_reserved + ${quantity}` })
    .where(and(
      eq(stockInventory.tenantId, tenantId),
      eq(stockInventory.productSku, productSku)
    ));
  
  // Schedule expiry check
  await queue_F3.add('release-expired', {
    eventType: 'STOCK_RESERVATION_EXPIRY',
    reservationId: reservation[0].id,
  }, { delay: 24 * 60 * 60 * 1000 });
  
  return { reserved: true, reservationId: reservation[0].id };
});

// F5 Stock Alert → Notification
worker_F5.process(async (job) => {
  const { productSku, currentStock, minThreshold, tenantId } = job.data;
  
  if (currentStock <= minThreshold) {
    // Get product details
    const product = await db.query.goldProducts.findFirst({
      where: eq(goldProducts.sku, productSku)
    });
    
    // Send notification to managers
    await notificationService.send({
      tenantId,
      type: 'STOCK_LOW_ALERT',
      priority: currentStock <= 0 ? 'CRITICAL' : 'HIGH',
      title: `Stoc scăzut: ${product?.name}`,
      body: `Stoc curent: ${currentStock} (minim: ${minThreshold})`,
      recipients: ['WAREHOUSE_MANAGER', 'SALES_MANAGER'],
      metadata: { productSku, currentStock, minThreshold },
    });
  }
});
```

### G: Oblio Integration Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| G1: OblioProformaWorker | D4 quote approved | G2 Sync | PROFORMA_CREATED |
| G2: OblioSyncWorker | G1, G3 | - | OBLIO_SYNCED |
| G3: OblioInvoiceWorker | D5 proforma paid | G4 Check, H1 SPV | INVOICE_CREATED |
| G4: OblioStatusWorker | G3 | D6 complete | INVOICE_STATUS_CHECKED |
| G5: OblioWebhookWorker | Oblio callback | G4 | OBLIO_WEBHOOK_RECEIVED |
| G6: OblioRetryWorker | G1-G3 failed | Original queue | OBLIO_RETRY_PROCESSED |
| G7: OblioReconcileWorker | Daily cron | G2 | OBLIO_RECONCILED |

```typescript
// G1 Create Proforma → Oblio API
worker_G1.process(async (job) => {
  const { negotiationId, tenantId } = job.data;
  
  // Get negotiation with items and client
  const negotiation = await db.query.goldNegotiations.findFirst({
    where: eq(goldNegotiations.id, negotiationId),
    with: {
      items: true,
      client: true,
    }
  });
  
  // Build Oblio proforma payload
  const oblioPayload = {
    cif: negotiation.client.cui,
    client: {
      name: negotiation.client.name,
      cui: negotiation.client.cui,
      address: negotiation.client.address,
      county: negotiation.client.county,
    },
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    products: negotiation.items.map(item => ({
      name: item.productName,
      code: item.productSku,
      measuringUnit: item.unit,
      quantity: item.quantity,
      price: item.unitPrice,
      vatPercent: item.vatRate,
      discount: item.discountPercent,
    })),
    currency: 'RON',
    language: 'RO',
    observations: `Negociere #${negotiation.id}`,
  };
  
  // Call Oblio API
  const oblioResponse = await oblioClient.createProforma(oblioPayload);
  
  // Store proforma
  await db.insert(oblioDocuments).values({
    tenantId,
    negotiationId,
    documentType: 'PROFORMA',
    oblioSeriesName: oblioResponse.seriesName,
    oblioNumber: oblioResponse.number,
    oblioId: oblioResponse.id,
    totalWithoutVat: negotiation.totalWithoutVat,
    totalVat: negotiation.totalVat,
    totalWithVat: negotiation.totalWithVat,
    status: 'CREATED',
  });
  
  // Trigger sync
  await queue_G2.add('sync-proforma', {
    eventType: 'OBLIO_SYNC_PROFORMA',
    oblioId: oblioResponse.id,
    tenantId,
  });
  
  // Update negotiation state
  await queue_D8.add('update-state', {
    eventType: 'NEGOTIATION_PROFORMA_CREATED',
    negotiationId,
    oblioProformaId: oblioResponse.id,
    toState: 'PROFORMA_SENT',
  });
  
  return { oblioId: oblioResponse.id, series: oblioResponse.seriesName };
});

// G3 Create Invoice → also triggers e-Factura
worker_G3.process(async (job) => {
  const { negotiationId, proformaId, tenantId } = job.data;
  
  // Convert proforma to invoice in Oblio
  const oblioResponse = await oblioClient.convertProformaToInvoice(proformaId);
  
  // Store invoice
  const invoice = await db.insert(oblioDocuments).values({
    tenantId,
    negotiationId,
    documentType: 'INVOICE',
    oblioSeriesName: oblioResponse.seriesName,
    oblioNumber: oblioResponse.number,
    oblioId: oblioResponse.id,
    linkedProformaId: proformaId,
    status: 'CREATED',
  }).returning();
  
  // Trigger e-Factura SPV submission (legally required)
  await queue_H1.add('submit-einvoice', {
    eventType: 'EINVOICE_SUBMIT_SPV',
    invoiceId: invoice[0].id,
    oblioInvoiceId: oblioResponse.id,
    tenantId,
  }, { 
    priority: 2, // High priority - legal deadline
  });
  
  // Update stock (reduce available)
  await queue_F4.add('update-stock-after-sale', {
    eventType: 'STOCK_UPDATE_SOLD',
    negotiationId,
    tenantId,
  });
  
  return { invoiceId: invoice[0].id, oblioId: oblioResponse.id };
});

// G7 Daily Reconciliation
worker_G7.process(async (job) => {
  const { tenantId, date } = job.data;
  
  // Get all Oblio documents for the day
  const localDocs = await db.query.oblioDocuments.findMany({
    where: and(
      eq(oblioDocuments.tenantId, tenantId),
      gte(oblioDocuments.createdAt, new Date(date)),
      lt(oblioDocuments.createdAt, new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000))
    )
  });
  
  // Get Oblio API documents for same period
  const oblioApiDocs = await oblioClient.listDocuments({
    startDate: date,
    endDate: date,
  });
  
  // Compare and reconcile
  const missingInLocal = oblioApiDocs.filter(
    od => !localDocs.find(ld => ld.oblioId === od.id)
  );
  
  const missingInOblio = localDocs.filter(
    ld => !oblioApiDocs.find(od => od.id === ld.oblioId)
  );
  
  // Log discrepancies
  if (missingInLocal.length > 0 || missingInOblio.length > 0) {
    await db.insert(oblioSyncLog).values({
      tenantId,
      reconciliationDate: new Date(date),
      missingInLocal: JSON.stringify(missingInLocal),
      missingInOblio: JSON.stringify(missingInOblio.map(d => d.id)),
      status: 'DISCREPANCY',
    });
    
    // Alert
    await notificationService.send({
      tenantId,
      type: 'OBLIO_RECONCILIATION_DISCREPANCY',
      priority: 'HIGH',
      title: 'Discrepanță reconciliere Oblio',
      body: `${missingInLocal.length} documente lipsă local, ${missingInOblio.length} lipsă în Oblio`,
      recipients: ['ACCOUNTANT', 'FINANCE_MANAGER'],
    });
  }
  
  return { 
    reconciled: true, 
    missingInLocal: missingInLocal.length,
    missingInOblio: missingInOblio.length 
  };
});
```

### H: e-Factura SPV Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| H1: EinvoiceSubmitWorker | G3 invoice | H2 Status | SPV_SUBMITTED |
| H2: EinvoiceStatusWorker | H1, webhook | H3 or H4 | SPV_STATUS_CHECKED |
| H3: EinvoiceSuccessWorker | H2 success | D6 complete | SPV_ACCEPTED |
| H4: EinvoiceErrorWorker | H2 error | H5 or N4 | SPV_REJECTED |
| H5: EinvoiceRetryWorker | H4 | H1 | SPV_RETRY |

```typescript
// H1 Submit to SPV → ANAF e-Factura
worker_H1.process(async (job) => {
  const { invoiceId, oblioInvoiceId, tenantId } = job.data;
  
  // Get invoice details from Oblio
  const oblioInvoice = await oblioClient.getInvoice(oblioInvoiceId);
  
  // Generate XML in CIUS-RO format
  const xmlContent = generateCiusRoXml(oblioInvoice);
  
  // Submit to SPV
  const spvResponse = await spvClient.upload({
    standard: 'UBL',
    cif: oblioInvoice.cif,
    xml: xmlContent,
  });
  
  // Store submission
  await db.insert(einvoiceSubmissions).values({
    tenantId,
    invoiceId,
    oblioInvoiceId,
    spvUploadIndex: spvResponse.upload_index,
    xmlContent,
    status: 'SUBMITTED',
    submittedAt: new Date(),
    // Legal deadline: 5 calendar days from invoice issue
    legalDeadline: new Date(oblioInvoice.issueDate.getTime() + 5 * 24 * 60 * 60 * 1000),
  });
  
  // Schedule status check (ANAF processes in ~30 minutes)
  await queue_H2.add('check-spv-status', {
    eventType: 'EINVOICE_CHECK_STATUS',
    uploadIndex: spvResponse.upload_index,
    tenantId,
    invoiceId,
  }, { delay: 30 * 60 * 1000 }); // 30 minutes
  
  return { uploadIndex: spvResponse.upload_index };
});

// H2 Check Status → conditional routing
worker_H2.process(async (job) => {
  const { uploadIndex, invoiceId, tenantId, checkCount = 0 } = job.data;
  
  // Check SPV status
  const status = await spvClient.checkStatus(uploadIndex);
  
  // Update record
  await db.update(einvoiceSubmissions)
    .set({
      spvStatus: status.stare,
      spvMessage: status.mesaj,
      spvDownloadId: status.id_descarcare,
      lastCheckedAt: new Date(),
    })
    .where(eq(einvoiceSubmissions.spvUploadIndex, uploadIndex));
  
  switch (status.stare) {
    case 'ok':
      // Success - trigger completion flow
      await queue_H3.add('einvoice-success', {
        eventType: 'EINVOICE_ACCEPTED',
        invoiceId,
        tenantId,
        spvDownloadId: status.id_descarcare,
      });
      return { status: 'ACCEPTED' };
      
    case 'in prelucrare':
    case 'in asteptare':
      // Still processing - recheck later
      if (checkCount < 20) { // Max 20 retries (10 hours)
        await queue_H2.add('recheck-spv-status', {
          eventType: 'EINVOICE_CHECK_STATUS',
          uploadIndex,
          tenantId,
          invoiceId,
          checkCount: checkCount + 1,
        }, { delay: 30 * 60 * 1000 });
      }
      return { status: 'PENDING', checkCount };
      
    case 'nok':
    default:
      // Error - trigger error handling
      await queue_H4.add('einvoice-error', {
        eventType: 'EINVOICE_REJECTED',
        invoiceId,
        tenantId,
        errorCode: status.cod_eroare,
        errorMessage: status.mesaj,
      });
      return { status: 'REJECTED', error: status.mesaj };
  }
});

// H4 Handle Error → decide retry or HITL
worker_H4.process(async (job) => {
  const { invoiceId, tenantId, errorCode, errorMessage, retryCount = 0 } = job.data;
  
  // Categorize error
  const isRetryable = [
    'TIMEOUT', 'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR'
  ].some(e => errorCode?.includes(e));
  
  if (isRetryable && retryCount < 3) {
    // Retry submission
    await queue_H5.add('retry-einvoice', {
      eventType: 'EINVOICE_RETRY_SUBMISSION',
      invoiceId,
      tenantId,
      retryCount: retryCount + 1,
    }, { delay: (retryCount + 1) * 15 * 60 * 1000 }); // Exponential backoff
    
    return { action: 'RETRY', retryCount: retryCount + 1 };
  }
  
  // Non-retryable or max retries - need human review
  await queue_N4.add('review-einvoice-error', {
    eventType: 'HITL_EINVOICE_REVIEW',
    invoiceId,
    tenantId,
    errorCode,
    errorMessage,
    slaMinutes: 240, // 4 hours - legal deadline approaching
    requiredRole: 'ACCOUNTANT',
  });
  
  // Alert
  await notificationService.send({
    tenantId,
    type: 'EINVOICE_ERROR_HITL',
    priority: 'HIGH',
    title: 'e-Factura respinsă - necesită intervenție',
    body: `Eroare: ${errorMessage}`,
    recipients: ['ACCOUNTANT', 'FINANCE_MANAGER'],
    metadata: { invoiceId, errorCode },
  });
  
  return { action: 'HITL', errorCode };
});
```

### I: Document Generation Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| I1: DocTemplateWorker | Setup/Update | - | TEMPLATE_LOADED |
| I2: DocGenerateWorker | D4 quote, G1 | I3 | DOCUMENT_GENERATED |
| I3: DocRenderWorker | I2 | I4 | DOCUMENT_RENDERED |
| I4: DocStoreWorker | I3 | Channel send | DOCUMENT_STORED |
| I5: DocArchiveWorker | Monthly cron | - | DOCUMENT_ARCHIVED |

```typescript
// I2 Generate Document → Puppeteer PDF
worker_I2.process(async (job) => {
  const { 
    documentType, // 'QUOTE' | 'PROFORMA' | 'INVOICE'
    negotiationId, 
    templateId,
    tenantId 
  } = job.data;
  
  // Get template
  const template = await db.query.documentTemplates.findFirst({
    where: and(
      eq(documentTemplates.tenantId, tenantId),
      eq(documentTemplates.id, templateId),
      eq(documentTemplates.active, true)
    )
  });
  
  // Get negotiation data
  const negotiation = await db.query.goldNegotiations.findFirst({
    where: eq(goldNegotiations.id, negotiationId),
    with: {
      items: true,
      client: true,
      assignedUser: true,
    }
  });
  
  // Get tenant/company info
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId)
  });
  
  // Build template context
  const context = {
    document: {
      type: documentType,
      number: await generateDocumentNumber(tenantId, documentType),
      date: new Date().toLocaleDateString('ro-RO'),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ro-RO'),
    },
    seller: {
      name: tenant.companyName,
      cui: tenant.cui,
      regCom: tenant.registrationNumber,
      address: tenant.address,
      bank: tenant.bankName,
      iban: tenant.iban,
      email: tenant.email,
      phone: tenant.phone,
    },
    buyer: {
      name: negotiation.client.name,
      cui: negotiation.client.cui,
      regCom: negotiation.client.registrationNumber,
      address: negotiation.client.address,
      email: negotiation.client.email,
      phone: negotiation.client.phone,
    },
    items: negotiation.items.map((item, idx) => ({
      nr: idx + 1,
      name: item.productName,
      sku: item.productSku,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: formatCurrency(item.unitPrice),
      discount: item.discountPercent,
      totalWithoutVat: formatCurrency(item.totalWithoutVat),
      vatRate: item.vatRate,
      vatAmount: formatCurrency(item.vatAmount),
      totalWithVat: formatCurrency(item.totalWithVat),
    })),
    totals: {
      subtotal: formatCurrency(negotiation.totalWithoutVat),
      vat: formatCurrency(negotiation.totalVat),
      total: formatCurrency(negotiation.totalWithVat),
    },
    salesPerson: {
      name: negotiation.assignedUser?.name,
      email: negotiation.assignedUser?.email,
      phone: negotiation.assignedUser?.phone,
    },
  };
  
  // Render HTML from template
  const html = await renderTemplate(template.htmlContent, context);
  
  // Queue PDF rendering
  await queue_I3.add('render-pdf', {
    eventType: 'DOCUMENT_RENDER_PDF',
    html,
    documentType,
    negotiationId,
    tenantId,
    documentNumber: context.document.number,
  });
  
  return { documentNumber: context.document.number };
});

// I3 Render PDF → Puppeteer
worker_I3.process(async (job) => {
  const { html, documentType, documentNumber, negotiationId, tenantId } = job.data;
  
  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm',
    },
  });
  
  await browser.close();
  
  // Queue storage
  await queue_I4.add('store-document', {
    eventType: 'DOCUMENT_STORE',
    pdfBuffer: pdfBuffer.toString('base64'),
    documentType,
    documentNumber,
    negotiationId,
    tenantId,
    filename: `${documentType}_${documentNumber}.pdf`,
  });
  
  return { rendered: true, size: pdfBuffer.length };
});

// I4 Store Document → MinIO/S3
worker_I4.process(async (job) => {
  const { 
    pdfBuffer, 
    documentType, 
    documentNumber, 
    negotiationId, 
    tenantId,
    filename 
  } = job.data;
  
  // Store in MinIO
  const objectKey = `tenants/${tenantId}/documents/${documentType.toLowerCase()}/${filename}`;
  
  await minioClient.putObject(
    process.env.MINIO_BUCKET,
    objectKey,
    Buffer.from(pdfBuffer, 'base64'),
    {
      'Content-Type': 'application/pdf',
      'x-amz-meta-document-type': documentType,
      'x-amz-meta-document-number': documentNumber,
      'x-amz-meta-negotiation-id': negotiationId,
    }
  );
  
  // Store reference in DB
  const doc = await db.insert(generatedDocuments).values({
    tenantId,
    negotiationId,
    documentType,
    documentNumber,
    filename,
    storageKey: objectKey,
    storageBucket: process.env.MINIO_BUCKET,
    sizeBytes: Buffer.from(pdfBuffer, 'base64').length,
    mimeType: 'application/pdf',
    status: 'STORED',
  }).returning();
  
  // Publish event for channel delivery
  await redis.publish(`document:ready:${tenantId}`, JSON.stringify({
    type: 'DOCUMENT_READY_FOR_DELIVERY',
    documentId: doc[0].id,
    negotiationId,
    documentType,
    storageKey: objectKey,
  }));
  
  return { documentId: doc[0].id, storageKey: objectKey };
});
```

### J: Handover & Channel Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| J1: HandoverOrchestrator | Etapa 2 WARM_REPLY | J2 Load, C1 | HANDOVER_INITIATED |
| J2: ConversationLoadWorker | J1 | C1 AI | CONVERSATION_LOADED |
| J3: WhatsAppSendWorker | C3 response | - | WHATSAPP_SENT |
| J4: EmailSendWorker | C3 response | - | EMAIL_SENT |
| J5: ChannelRouterWorker | C3 | J3 or J4 | CHANNEL_ROUTED |

```typescript
// J1 Handover Orchestrator - entry point from Etapa 2
worker_J1.process(async (job) => {
  const { 
    leadId, 
    contactId,
    currentStage, // 'WARM_REPLY'
    channelType,  // 'WHATSAPP' | 'EMAIL'
    lastMessageId,
    tenantId 
  } = job.data;
  
  // Stop any active Etapa 2 sequences
  const activeSequences = await db.query.outreachSequences.findMany({
    where: and(
      eq(outreachSequences.contactId, contactId),
      eq(outreachSequences.status, 'ACTIVE')
    )
  });
  
  for (const seq of activeSequences) {
    await db.update(outreachSequences)
      .set({ status: 'PAUSED', pausedReason: 'HANDOVER_TO_ETAPA3' })
      .where(eq(outreachSequences.id, seq.id));
    
    // Cancel scheduled jobs
    await bullmqUtils.cancelDelayedJobs(`outreach:${seq.id}`);
  }
  
  // Create negotiation
  const negotiation = await db.insert(goldNegotiations).values({
    tenantId,
    leadId,
    contactId,
    sourceChannel: channelType,
    status: 'INITIATED',
    currentState: 'INITIAL_CONTACT',
    handoverAt: new Date(),
    handoverFromStage: currentStage,
  }).returning();
  
  // Load conversation history
  await queue_J2.add('load-conversation', {
    eventType: 'CONVERSATION_LOAD',
    negotiationId: negotiation[0].id,
    contactId,
    channelType,
    tenantId,
  });
  
  // Publish handover event
  await redis.publish(`handover:${tenantId}`, JSON.stringify({
    type: 'HANDOVER_INITIATED',
    negotiationId: negotiation[0].id,
    contactId,
    channelType,
  }));
  
  return { negotiationId: negotiation[0].id };
});

// J2 Load Conversation History
worker_J2.process(async (job) => {
  const { negotiationId, contactId, channelType, tenantId } = job.data;
  
  // Get all messages from Etapa 2
  const messages = await db.query.communicationLog.findMany({
    where: and(
      eq(communicationLog.contactId, contactId),
      eq(communicationLog.channelType, channelType)
    ),
    orderBy: [asc(communicationLog.sentAt)],
  });
  
  // Store in AI conversation format
  const conversationHistory = messages.map(msg => ({
    role: msg.direction === 'OUTBOUND' ? 'assistant' : 'user',
    content: msg.content,
    timestamp: msg.sentAt,
    metadata: {
      originalId: msg.id,
      source: 'ETAPA2',
    }
  }));
  
  await db.insert(aiConversations).values({
    tenantId,
    negotiationId,
    channelType,
    history: conversationHistory,
    tokensUsed: 0,
    status: 'ACTIVE',
  });
  
  // Now trigger AI to continue conversation
  await queue_C1.add('continue-conversation', {
    eventType: 'AI_CONTINUE_CONVERSATION',
    negotiationId,
    tenantId,
    context: 'WARM_LEAD_HANDOVER',
    previousMessages: conversationHistory.length,
  });
  
  return { messagesLoaded: conversationHistory.length };
});

// J3 WhatsApp Send - via TimelinesAI
worker_J3.process(async (job) => {
  const { 
    negotiationId, 
    phoneNumber, 
    message, 
    attachments,
    tenantId 
  } = job.data;
  
  // Get assigned WhatsApp number for sticky session
  const negotiation = await db.query.goldNegotiations.findFirst({
    where: eq(goldNegotiations.id, negotiationId)
  });
  
  // Send via TimelinesAI
  const response = await timelinesAiClient.sendMessage({
    phone: phoneNumber,
    message,
    from: negotiation.assignedPhoneNumber,
    attachments: attachments?.map(a => ({
      type: a.type,
      url: a.url,
    })),
  });
  
  // Log message
  await db.insert(aiMessageLog).values({
    tenantId,
    negotiationId,
    direction: 'OUTBOUND',
    channelType: 'WHATSAPP',
    content: message,
    externalMessageId: response.messageId,
    status: 'SENT',
    sentAt: new Date(),
    attachments: attachments ? JSON.stringify(attachments) : null,
  });
  
  return { messageId: response.messageId, status: 'SENT' };
});

// J4 Email Send - via Resend
worker_J4.process(async (job) => {
  const { 
    negotiationId, 
    recipientEmail, 
    subject,
    htmlContent,
    textContent,
    attachments,
    tenantId 
  } = job.data;
  
  // Get tenant email config
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId)
  });
  
  // Send via Resend
  const response = await resendClient.emails.send({
    from: `${tenant.companyName} <${tenant.salesEmail}>`,
    to: recipientEmail,
    subject,
    html: htmlContent,
    text: textContent,
    attachments: attachments?.map(a => ({
      filename: a.filename,
      content: a.content, // base64
    })),
    tags: [
      { name: 'negotiation_id', value: negotiationId },
      { name: 'tenant_id', value: tenantId },
      { name: 'type', value: 'AI_SALES' },
    ],
  });
  
  // Log message
  await db.insert(aiMessageLog).values({
    tenantId,
    negotiationId,
    direction: 'OUTBOUND',
    channelType: 'EMAIL',
    content: textContent,
    htmlContent,
    subject,
    externalMessageId: response.id,
    status: 'SENT',
    sentAt: new Date(),
    attachments: attachments ? JSON.stringify(attachments) : null,
  });
  
  return { messageId: response.id, status: 'SENT' };
});

// J5 Channel Router - decide delivery channel
worker_J5.process(async (job) => {
  const { 
    negotiationId, 
    message, 
    attachments,
    preferredChannel,
    tenantId 
  } = job.data;
  
  // Get negotiation and contact
  const negotiation = await db.query.goldNegotiations.findFirst({
    where: eq(goldNegotiations.id, negotiationId),
    with: { contact: true }
  });
  
  // Determine channel
  const channel = preferredChannel || negotiation.sourceChannel;
  
  if (channel === 'WHATSAPP' && negotiation.contact.whatsappPhone) {
    await queue_J3.add('send-whatsapp', {
      eventType: 'WHATSAPP_SEND',
      negotiationId,
      phoneNumber: negotiation.contact.whatsappPhone,
      message,
      attachments,
      tenantId,
    });
  } else if (negotiation.contact.email) {
    await queue_J4.add('send-email', {
      eventType: 'EMAIL_SEND',
      negotiationId,
      recipientEmail: negotiation.contact.email,
      subject: `Re: Negociere #${negotiation.id}`,
      htmlContent: generateEmailHtml(message),
      textContent: message,
      attachments,
      tenantId,
    });
  } else {
    // No valid channel - escalate
    await queue_N1.add('escalate-no-channel', {
      eventType: 'HITL_NO_DELIVERY_CHANNEL',
      negotiationId,
      tenantId,
    });
  }
  
  return { channel, negotiationId };
});
```

### K: Sentiment & Intent Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| K1: SentimentAnalyzeWorker | Incoming message | K2 | SENTIMENT_ANALYZED |
| K2: IntentClassifyWorker | K1 | C1 AI | INTENT_CLASSIFIED |
| K3: UrgencyDetectWorker | K1 high neg | N1 escalate | URGENCY_DETECTED |
| K4: LanguageDetectWorker | Incoming | C1 | LANGUAGE_DETECTED |
| K5: ToneAdaptWorker | K1 | C3 | TONE_ADAPTED |

```typescript
// K1 Sentiment Analysis - first in pipeline for incoming messages
worker_K1.process(async (job) => {
  const { 
    messageId, 
    messageText, 
    negotiationId,
    tenantId 
  } = job.data;
  
  // Call xAI for sentiment analysis
  const sentimentPrompt = `
Analyze the sentiment and emotional state of this Romanian/English message.
Return ONLY valid JSON with:
- score: number from -1.0 (very negative) to 1.0 (very positive)
- label: "VERY_NEGATIVE" | "NEGATIVE" | "NEUTRAL" | "POSITIVE" | "VERY_POSITIVE"
- emotions: array of detected emotions ["anger", "frustration", "satisfaction", "interest", "urgency", "confusion"]
- signals: array of buying/rejection signals detected

Message: "${messageText}"
`;

  const response = await xaiClient.chat.completions.create({
    model: 'grok-4',
    messages: [{ role: 'user', content: sentimentPrompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });
  
  const sentiment = JSON.parse(response.choices[0].message.content);
  
  // Store sentiment
  await db.update(aiMessageLog)
    .set({
      sentimentScore: sentiment.score,
      sentimentLabel: sentiment.label,
      detectedEmotions: sentiment.emotions,
      buyingSignals: sentiment.signals,
    })
    .where(eq(aiMessageLog.id, messageId));
  
  // Check for urgency/escalation needs
  if (sentiment.score < -0.6 || sentiment.emotions.includes('anger')) {
    await queue_K3.add('detect-urgency', {
      eventType: 'URGENCY_CHECK',
      negotiationId,
      sentimentScore: sentiment.score,
      emotions: sentiment.emotions,
      tenantId,
    });
  }
  
  // Continue to intent classification
  await queue_K2.add('classify-intent', {
    eventType: 'INTENT_CLASSIFY',
    messageId,
    messageText,
    negotiationId,
    sentiment,
    tenantId,
  });
  
  return sentiment;
});

// K2 Intent Classification
worker_K2.process(async (job) => {
  const { 
    messageId, 
    messageText, 
    negotiationId,
    sentiment,
    tenantId 
  } = job.data;
  
  const intentPrompt = `
Classify the intent of this B2B sales conversation message.
Context: Agricultural products sales in Romania.

Return ONLY valid JSON:
{
  "primary_intent": one of ["INQUIRY", "PRICE_REQUEST", "QUOTE_REQUEST", "NEGOTIATION", "ORDER", "COMPLAINT", "SUPPORT", "SMALL_TALK", "REJECTION", "CONFIRMATION", "FOLLOWUP"],
  "secondary_intents": array of other detected intents,
  "product_mentions": array of product names/categories mentioned,
  "quantity_mentioned": number or null,
  "price_sensitivity": "LOW" | "MEDIUM" | "HIGH" | null,
  "decision_maker_signal": boolean,
  "urgency_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "action_requested": string describing what customer wants
}

Message: "${messageText}"
Sentiment context: ${JSON.stringify(sentiment)}
`;

  const response = await xaiClient.chat.completions.create({
    model: 'grok-4',
    messages: [{ role: 'user', content: intentPrompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });
  
  const intent = JSON.parse(response.choices[0].message.content);
  
  // Store intent
  await db.update(aiMessageLog)
    .set({
      primaryIntent: intent.primary_intent,
      secondaryIntents: intent.secondary_intents,
      productMentions: intent.product_mentions,
      urgencyLevel: intent.urgency_level,
      actionRequested: intent.action_requested,
    })
    .where(eq(aiMessageLog.id, messageId));
  
  // Trigger AI orchestrator with full context
  await queue_C1.add('process-message', {
    eventType: 'AI_PROCESS_MESSAGE',
    messageId,
    negotiationId,
    intent,
    sentiment,
    tenantId,
  });
  
  return intent;
});

// K3 Urgency Detection - may trigger escalation
worker_K3.process(async (job) => {
  const { 
    negotiationId, 
    sentimentScore, 
    emotions,
    tenantId 
  } = job.data;
  
  // Check escalation criteria
  const shouldEscalate = 
    sentimentScore < -0.7 ||
    emotions.includes('anger') && sentimentScore < -0.3 ||
    emotions.includes('frustration') && emotions.length >= 2;
  
  if (shouldEscalate) {
    // Get negotiation context
    const negotiation = await db.query.goldNegotiations.findFirst({
      where: eq(goldNegotiations.id, negotiationId),
      with: { client: true }
    });
    
    // Escalate to human
    await queue_N1.add('escalate-negative-sentiment', {
      eventType: 'HITL_ESCALATION',
      negotiationId,
      reason: 'NEGATIVE_CUSTOMER_SENTIMENT',
      context: {
        sentimentScore,
        emotions,
        clientName: negotiation.client.name,
        negotiationValue: negotiation.totalWithVat,
      },
      priority: sentimentScore < -0.8 ? 'CRITICAL' : 'HIGH',
      tenantId,
    });
    
    return { escalated: true, reason: 'NEGATIVE_SENTIMENT' };
  }
  
  return { escalated: false };
});

// K4 Language Detection
worker_K4.process(async (job) => {
  const { messageId, messageText, tenantId } = job.data;
  
  // Simple language detection (RO vs EN)
  const romanianPatterns = /[ăîâșț]|pentru|este|sunt|poate|dumneavoastră/i;
  const language = romanianPatterns.test(messageText) ? 'ro' : 'en';
  
  // Store detected language
  await db.update(aiMessageLog)
    .set({ detectedLanguage: language })
    .where(eq(aiMessageLog.id, messageId));
  
  return { language };
});

// K5 Tone Adaptation - adjust AI response style
worker_K5.process(async (job) => {
  const { 
    negotiationId, 
    sentiment, 
    currentTone,
    tenantId 
  } = job.data;
  
  // Determine appropriate tone based on sentiment
  let recommendedTone = 'PROFESSIONAL';
  
  if (sentiment.score > 0.5) {
    recommendedTone = 'FRIENDLY';
  } else if (sentiment.score < -0.3) {
    recommendedTone = 'EMPATHETIC';
  } else if (sentiment.label === 'NEUTRAL') {
    recommendedTone = 'PROFESSIONAL';
  }
  
  // Store tone recommendation
  await db.update(goldNegotiations)
    .set({ currentTone: recommendedTone })
    .where(eq(goldNegotiations.id, negotiationId));
  
  return { recommendedTone };
});
```

### L: MCP Server Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| L1: McpSessionWorker | C1 new session | - | MCP_SESSION_STARTED |
| L2: McpToolCallWorker | C4 tool req | Various | MCP_TOOL_EXECUTED |
| L3: McpResourceWorker | C4 resource req | - | MCP_RESOURCE_FETCHED |
| L4: McpPromptWorker | C3 prompt req | - | MCP_PROMPT_LOADED |
| L5: McpCleanupWorker | Timeout/Close | - | MCP_SESSION_CLOSED |

```typescript
// L1 MCP Session Management
worker_L1.process(async (job) => {
  const { negotiationId, userId, tenantId } = job.data;
  
  // Create MCP session
  const sessionId = uuidv7();
  
  // Initialize session in Redis
  await redis.hset(`mcp:session:${sessionId}`, {
    negotiationId,
    userId,
    tenantId,
    startedAt: Date.now(),
    status: 'ACTIVE',
    toolCallCount: 0,
    lastActivityAt: Date.now(),
  });
  
  // Set session timeout (30 minutes inactivity)
  await redis.expire(`mcp:session:${sessionId}`, 30 * 60);
  
  // Store in DB for audit
  await db.insert(mcpSessions).values({
    id: sessionId,
    tenantId,
    negotiationId,
    userId,
    status: 'ACTIVE',
    startedAt: new Date(),
  });
  
  return { sessionId };
});

// L2 MCP Tool Execution - routes to appropriate workers
worker_L2.process(async (job) => {
  const { 
    sessionId, 
    toolName, 
    arguments: args,
    tenantId,
    negotiationId 
  } = job.data;
  
  // Validate session
  const session = await redis.hgetall(`mcp:session:${sessionId}`);
  if (!session || session.status !== 'ACTIVE') {
    throw new Error('Invalid or expired MCP session');
  }
  
  // Route to appropriate worker based on tool
  const toolRoutes: Record<string, { queue: Queue; eventType: string }> = {
    'search_products': { queue: queue_B3, eventType: 'SEARCH_HYBRID' },
    'check_stock': { queue: queue_F1, eventType: 'STOCK_CHECK' },
    'calculate_price': { queue: queue_E1, eventType: 'PRICE_CALCULATE' },
    'request_discount': { queue: queue_E2, eventType: 'DISCOUNT_REQUEST' },
    'create_quote': { queue: queue_I2, eventType: 'DOCUMENT_GENERATE' },
    'create_proforma': { queue: queue_G1, eventType: 'OBLIO_CREATE_PROFORMA' },
    'get_client_info': { queue: queue_B5, eventType: 'CLIENT_FETCH' },
    'get_negotiation_history': { queue: queue_D2, eventType: 'NEGOTIATION_HISTORY_FETCH' },
    'transition_state': { queue: queue_D3, eventType: 'NEGOTIATION_TRANSITION' },
  };
  
  const route = toolRoutes[toolName];
  if (!route) {
    throw new Error(`Unknown MCP tool: ${toolName}`);
  }
  
  // Add job and wait for result
  const result = await route.queue.add(toolName, {
    eventType: route.eventType,
    ...args,
    tenantId,
    negotiationId,
    mcpSessionId: sessionId,
  }, { 
    removeOnComplete: true,
    removeOnFail: false,
  });
  
  // Wait for job completion
  const jobResult = await result.waitUntilFinished(route.queue.queueEvents);
  
  // Update session stats
  await redis.hincrby(`mcp:session:${sessionId}`, 'toolCallCount', 1);
  await redis.hset(`mcp:session:${sessionId}`, 'lastActivityAt', Date.now());
  await redis.expire(`mcp:session:${sessionId}`, 30 * 60); // Reset timeout
  
  // Log tool call
  await db.insert(aiToolCalls).values({
    tenantId,
    sessionId,
    negotiationId,
    toolName,
    arguments: args,
    result: jobResult,
    durationMs: Date.now() - job.timestamp,
    status: 'SUCCESS',
  });
  
  return jobResult;
});

// L3 MCP Resource Fetch
worker_L3.process(async (job) => {
  const { 
    sessionId, 
    resourceUri, 
    tenantId,
    negotiationId 
  } = job.data;
  
  // Parse resource URI: product://SKU, client://CUI, conversation://ID
  const [resourceType, resourceId] = resourceUri.replace('://', ':').split(':');
  
  let resource;
  
  switch (resourceType) {
    case 'product':
      resource = await db.query.goldProducts.findFirst({
        where: and(
          eq(goldProducts.tenantId, tenantId),
          eq(goldProducts.sku, resourceId)
        ),
        with: {
          embeddings: true,
          priceRules: true,
          stockInventory: true,
        }
      });
      break;
      
    case 'client':
      resource = await db.query.goldCompanies.findFirst({
        where: and(
          eq(goldCompanies.tenantId, tenantId),
          eq(goldCompanies.cui, resourceId)
        ),
        with: {
          contacts: true,
          negotiations: { limit: 5, orderBy: desc(goldNegotiations.createdAt) },
        }
      });
      break;
      
    case 'conversation':
      resource = await db.query.aiConversations.findFirst({
        where: eq(aiConversations.negotiationId, resourceId),
      });
      break;
      
    case 'negotiation':
      resource = await db.query.goldNegotiations.findFirst({
        where: eq(goldNegotiations.id, resourceId),
        with: {
          items: true,
          stateHistory: { limit: 10 },
        }
      });
      break;
      
    default:
      throw new Error(`Unknown resource type: ${resourceType}`);
  }
  
  if (!resource) {
    return { found: false, uri: resourceUri };
  }
  
  return { found: true, uri: resourceUri, data: resource };
});

// L4 MCP Prompt Loading
worker_L4.process(async (job) => {
  const { promptName, variables, tenantId } = job.data;
  
  // Get prompt template
  const template = await db.query.aiPromptTemplates.findFirst({
    where: and(
      eq(aiPromptTemplates.tenantId, tenantId),
      eq(aiPromptTemplates.name, promptName),
      eq(aiPromptTemplates.active, true)
    )
  });
  
  if (!template) {
    // Use default prompt
    const defaultTemplate = DEFAULT_PROMPTS[promptName];
    if (!defaultTemplate) {
      throw new Error(`Unknown prompt: ${promptName}`);
    }
    return { prompt: interpolateTemplate(defaultTemplate, variables) };
  }
  
  // Interpolate variables
  const prompt = interpolateTemplate(template.content, variables);
  
  return { prompt, templateId: template.id };
});

// L5 MCP Session Cleanup
worker_L5.process(async (job) => {
  const { sessionId, reason } = job.data;
  
  // Get session
  const session = await redis.hgetall(`mcp:session:${sessionId}`);
  
  if (session) {
    // Update DB
    await db.update(mcpSessions)
      .set({
        status: 'CLOSED',
        closedAt: new Date(),
        closeReason: reason,
        toolCallCount: parseInt(session.toolCallCount || '0'),
        durationMs: Date.now() - parseInt(session.startedAt),
      })
      .where(eq(mcpSessions.id, sessionId));
    
    // Remove from Redis
    await redis.del(`mcp:session:${sessionId}`);
  }
  
  return { closed: true, sessionId };
});
```

### M: Guardrails & Anti-Hallucination Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| M1: GuardrailPriceWorker | C3 response | Pass/Fail | GUARDRAIL_PRICE_CHECKED |
| M2: GuardrailStockWorker | C3 response | Pass/Fail | GUARDRAIL_STOCK_CHECKED |
| M3: GuardrailDiscountWorker | C3 response | Pass/Fail | GUARDRAIL_DISCOUNT_CHECKED |
| M4: GuardrailComplianceWorker | C3 response | Pass/Fail | GUARDRAIL_COMPLIANCE_CHECKED |
| M5: GuardrailOrchestratorWorker | C3 | All M1-M4 | GUARDRAIL_ORCHESTRATED |

```typescript
// M5 Guardrail Orchestrator - runs all checks in parallel
worker_M5.process(async (job) => {
  const { 
    responseId,
    responseText,
    negotiationId,
    extractedData, // { prices: [], products: [], discounts: [] }
    tenantId,
    regenerateCount = 0
  } = job.data;
  
  const MAX_REGENERATE = 3;
  
  // Run all guardrails in parallel
  const [priceResult, stockResult, discountResult, complianceResult] = await Promise.all([
    // M1: Price validation
    queue_M1.add('check-price', {
      eventType: 'GUARDRAIL_PRICE_CHECK',
      extractedData,
      tenantId,
    }).then(j => j.waitUntilFinished(queue_M1.queueEvents)),
    
    // M2: Stock validation
    queue_M2.add('check-stock', {
      eventType: 'GUARDRAIL_STOCK_CHECK',
      extractedData,
      tenantId,
    }).then(j => j.waitUntilFinished(queue_M2.queueEvents)),
    
    // M3: Discount validation
    queue_M3.add('check-discount', {
      eventType: 'GUARDRAIL_DISCOUNT_CHECK',
      extractedData,
      tenantId,
    }).then(j => j.waitUntilFinished(queue_M3.queueEvents)),
    
    // M4: Compliance validation
    queue_M4.add('check-compliance', {
      eventType: 'GUARDRAIL_COMPLIANCE_CHECK',
      responseText,
      tenantId,
    }).then(j => j.waitUntilFinished(queue_M4.queueEvents)),
  ]);
  
  // Aggregate results
  const allPassed = 
    priceResult.passed && 
    stockResult.passed && 
    discountResult.passed && 
    complianceResult.passed;
  
  const violations = [
    ...(!priceResult.passed ? priceResult.violations : []),
    ...(!stockResult.passed ? stockResult.violations : []),
    ...(!discountResult.passed ? discountResult.violations : []),
    ...(!complianceResult.passed ? complianceResult.violations : []),
  ];
  
  // Log guardrail result
  await db.insert(guardrailChecks).values({
    tenantId,
    negotiationId,
    responseId,
    priceCheck: priceResult,
    stockCheck: stockResult,
    discountCheck: discountResult,
    complianceCheck: complianceResult,
    allPassed,
    violations,
    regenerateCount,
  });
  
  if (allPassed) {
    // Approve response for sending
    await redis.publish(`guardrail:approved:${tenantId}`, JSON.stringify({
      type: 'RESPONSE_APPROVED',
      responseId,
      negotiationId,
    }));
    
    return { approved: true, violations: [] };
  }
  
  // Failed - decide action
  if (regenerateCount < MAX_REGENERATE) {
    // Request regeneration with violation context
    await queue_C3.add('regenerate-response', {
      eventType: 'AI_REGENERATE_RESPONSE',
      negotiationId,
      originalResponseId: responseId,
      violations,
      regenerateCount: regenerateCount + 1,
      tenantId,
    });
    
    return { approved: false, action: 'REGENERATE', violations };
  }
  
  // Max regenerations exceeded - human takeover
  await queue_N2.add('human-takeover', {
    eventType: 'HITL_TAKEOVER',
    negotiationId,
    reason: 'MAX_GUARDRAIL_REGENERATIONS',
    violations,
    tenantId,
  });
  
  return { approved: false, action: 'HUMAN_TAKEOVER', violations };
});

// M1 Price Guardrail
worker_M1.process(async (job) => {
  const { extractedData, tenantId } = job.data;
  
  const violations: GuardrailViolation[] = [];
  
  for (const item of extractedData.products || []) {
    // Get product with min price
    const product = await db.query.goldProducts.findFirst({
      where: and(
        eq(goldProducts.tenantId, tenantId),
        eq(goldProducts.sku, item.sku)
      )
    });
    
    if (!product) {
      violations.push({
        type: 'PRODUCT_NOT_FOUND',
        severity: 'ERROR',
        message: `Produs inexistent: ${item.sku}`,
        data: { sku: item.sku },
      });
      continue;
    }
    
    // Check price >= min_price
    if (item.quotedPrice < product.minPrice) {
      violations.push({
        type: 'PRICE_BELOW_MINIMUM',
        severity: 'ERROR',
        message: `Preț ${item.quotedPrice} sub minimul ${product.minPrice} pentru ${item.sku}`,
        data: { 
          sku: item.sku, 
          quotedPrice: item.quotedPrice, 
          minPrice: product.minPrice 
        },
        correction: { suggestedPrice: product.minPrice },
      });
    }
    
    // Check price exists in catalog
    if (item.quotedPrice > product.listPrice * 1.2) {
      violations.push({
        type: 'PRICE_ABOVE_LIST',
        severity: 'WARNING',
        message: `Preț ${item.quotedPrice} mult peste lista ${product.listPrice}`,
        data: { sku: item.sku, quotedPrice: item.quotedPrice, listPrice: product.listPrice },
      });
    }
  }
  
  return {
    passed: violations.filter(v => v.severity === 'ERROR').length === 0,
    violations,
  };
});

// M2 Stock Guardrail
worker_M2.process(async (job) => {
  const { extractedData, tenantId } = job.data;
  
  const violations: GuardrailViolation[] = [];
  
  for (const item of extractedData.products || []) {
    // Get current stock
    const stock = await db.query.stockInventory.findFirst({
      where: and(
        eq(stockInventory.tenantId, tenantId),
        eq(stockInventory.productSku, item.sku)
      )
    });
    
    const available = (stock?.quantityAvailable ?? 0) - (stock?.quantityReserved ?? 0);
    
    if (item.quantity > available) {
      violations.push({
        type: 'INSUFFICIENT_STOCK',
        severity: 'ERROR',
        message: `Stoc insuficient pentru ${item.sku}: cerut ${item.quantity}, disponibil ${available}`,
        data: { 
          sku: item.sku, 
          requested: item.quantity, 
          available 
        },
        correction: { maxQuantity: available },
      });
    }
    
    // Warning if low stock
    if (available > 0 && available < item.quantity * 1.5) {
      violations.push({
        type: 'LOW_STOCK_WARNING',
        severity: 'WARNING',
        message: `Stoc scăzut pentru ${item.sku}: ${available} disponibil`,
        data: { sku: item.sku, available },
      });
    }
  }
  
  return {
    passed: violations.filter(v => v.severity === 'ERROR').length === 0,
    violations,
  };
});

// M3 Discount Guardrail
worker_M3.process(async (job) => {
  const { extractedData, tenantId } = job.data;
  
  const violations: GuardrailViolation[] = [];
  
  for (const discount of extractedData.discounts || []) {
    // Get discount rules
    const rules = await db.query.priceRules.findFirst({
      where: and(
        eq(priceRules.tenantId, tenantId),
        eq(priceRules.productSku, discount.sku)
      )
    });
    
    const maxAutoApprove = rules?.maxAutoDiscount ?? 15;
    const maxAllowed = rules?.maxDiscount ?? 40;
    
    if (discount.percent > maxAllowed) {
      violations.push({
        type: 'DISCOUNT_EXCEEDS_MAXIMUM',
        severity: 'ERROR',
        message: `Discount ${discount.percent}% depășește maximul permis ${maxAllowed}%`,
        data: { 
          sku: discount.sku, 
          requested: discount.percent, 
          maxAllowed 
        },
        correction: { maxDiscount: maxAllowed },
      });
    } else if (discount.percent > maxAutoApprove) {
      // Not an error, but needs approval
      violations.push({
        type: 'DISCOUNT_NEEDS_APPROVAL',
        severity: 'WARNING',
        message: `Discount ${discount.percent}% necesită aprobare (auto max: ${maxAutoApprove}%)`,
        data: { 
          sku: discount.sku, 
          requested: discount.percent, 
          autoApproveMax: maxAutoApprove 
        },
      });
    }
  }
  
  return {
    passed: violations.filter(v => v.severity === 'ERROR').length === 0,
    violations,
  };
});

// M4 Compliance Guardrail - check for hallucinations and policy violations
worker_M4.process(async (job) => {
  const { responseText, tenantId } = job.data;
  
  const violations: GuardrailViolation[] = [];
  
  // Check for forbidden patterns
  const forbiddenPatterns = [
    { pattern: /garanție.*pe viață/i, type: 'FALSE_WARRANTY', message: 'Garanție pe viață promisă incorect' },
    { pattern: /livrare.*gratuită.*oricunde/i, type: 'FALSE_SHIPPING', message: 'Livrare gratuită promisă incorect' },
    { pattern: /cel mai ieftin.*din piață/i, type: 'FALSE_CLAIM', message: 'Claim nefondat despre preț' },
    { pattern: /100%.*satisfacție/i, type: 'FALSE_GUARANTEE', message: 'Garanție satisfacție promisă incorect' },
  ];
  
  for (const { pattern, type, message } of forbiddenPatterns) {
    if (pattern.test(responseText)) {
      violations.push({
        type,
        severity: 'ERROR',
        message,
        data: { matchedPattern: pattern.toString() },
      });
    }
  }
  
  // Check for competitor mentions
  const competitorPatterns = /\b(Agricover|Agroland|Cerealcom|competitor)\b/i;
  if (competitorPatterns.test(responseText)) {
    violations.push({
      type: 'COMPETITOR_MENTION',
      severity: 'WARNING',
      message: 'Mențiune competitori în răspuns',
      data: { text: responseText.match(competitorPatterns)?.[0] },
    });
  }
  
  // Check response length (not too short for quotes)
  if (responseText.length < 50 && responseText.includes('ofertă')) {
    violations.push({
      type: 'RESPONSE_TOO_SHORT',
      severity: 'WARNING',
      message: 'Răspuns prea scurt pentru o ofertă',
      data: { length: responseText.length },
    });
  }
  
  return {
    passed: violations.filter(v => v.severity === 'ERROR').length === 0,
    violations,
  };
});
```

### N: Human Intervention (HITL) Workers

| Worker | Triggered By | Triggers | Event Type |
|--------|--------------|----------|------------|
| N1: EscalationWorker | K3, M5, timeout | Notification | HITL_ESCALATED |
| N2: TakeoverWorker | M5 max regen | - | HITL_TAKEOVER |
| N3: DiscountApprovalWorker | E3 | E4 or rejection | HITL_DISCOUNT_DECIDED |
| N4: DocumentReviewWorker | H4, G error | H1 or correction | HITL_DOCUMENT_REVIEWED |

```typescript
// N1 Escalation to Human
worker_N1.process(async (job) => {
  const { 
    negotiationId, 
    reason,
    context,
    priority,
    tenantId 
  } = job.data;
  
  // Create HITL request
  const hitlRequest = await db.insert(hitlApprovals).values({
    tenantId,
    negotiationId,
    type: 'ESCALATION',
    reason,
    context,
    priority: priority || 'MEDIUM',
    status: 'PENDING',
    slaDeadline: calculateSlaDeadline(priority),
  }).returning();
  
  // Add to unified HITL queue
  await unifiedQueueManager.addToQueue({
    tenantId,
    itemId: hitlRequest[0].id,
    type: 'ESCALATION',
    priority: priority || 'MEDIUM',
    context: {
      negotiationId,
      reason,
      ...context,
    },
  });
  
  // Notify available operators
  await notificationService.send({
    tenantId,
    type: 'HITL_ESCALATION',
    priority: priority || 'MEDIUM',
    title: 'Escalare negociere',
    body: `Negociere #${negotiationId} necesită intervenție: ${reason}`,
    recipients: ['SALES_MANAGER', 'TEAM_LEAD'],
    metadata: { 
      negotiationId, 
      hitlRequestId: hitlRequest[0].id,
      reason 
    },
  });
  
  // Update negotiation status
  await db.update(goldNegotiations)
    .set({ 
      status: 'ESCALATED',
      escalatedAt: new Date(),
      escalationReason: reason,
    })
    .where(eq(goldNegotiations.id, negotiationId));
  
  return { hitlRequestId: hitlRequest[0].id };
});

// N2 Human Takeover - AI cannot continue
worker_N2.process(async (job) => {
  const { 
    negotiationId, 
    reason,
    violations,
    tenantId 
  } = job.data;
  
  // Create takeover request
  const takeoverRequest = await db.insert(hitlApprovals).values({
    tenantId,
    negotiationId,
    type: 'TAKEOVER',
    reason,
    context: { violations },
    priority: 'HIGH',
    status: 'PENDING',
    slaDeadline: new Date(Date.now() + 15 * 60 * 1000), // 15 min SLA
  }).returning();
  
  // Stop AI processing
  await db.update(goldNegotiations)
    .set({ 
      aiEnabled: false,
      status: 'HUMAN_TAKEOVER',
      takeoverAt: new Date(),
      takeoverReason: reason,
    })
    .where(eq(goldNegotiations.id, negotiationId));
  
  // Add to HITL queue with high priority
  await unifiedQueueManager.addToQueue({
    tenantId,
    itemId: takeoverRequest[0].id,
    type: 'TAKEOVER',
    priority: 'HIGH',
    context: {
      negotiationId,
      reason,
      violations,
      urgent: true,
    },
  });
  
  // Critical notification
  await notificationService.send({
    tenantId,
    type: 'HITL_TAKEOVER',
    priority: 'CRITICAL',
    title: '⚠️ Takeover necesar URGENT',
    body: `AI nu poate continua negocierea #${negotiationId}. Motive: ${reason}`,
    recipients: ['SALES_MANAGER', 'TEAM_LEAD', 'OPERATOR'],
    channels: ['PUSH', 'SMS', 'SLACK'],
    metadata: { negotiationId, reason, violations },
  });
  
  return { takeoverRequestId: takeoverRequest[0].id };
});

// N3 Discount Approval Workflow
worker_N3.process(async (job) => {
  const { 
    negotiationId, 
    discountPercent,
    productSku,
    requiredRole,
    slaMinutes,
    tenantId 
  } = job.data;
  
  // Get product and negotiation context
  const [product, negotiation] = await Promise.all([
    db.query.goldProducts.findFirst({
      where: eq(goldProducts.sku, productSku)
    }),
    db.query.goldNegotiations.findFirst({
      where: eq(goldNegotiations.id, negotiationId),
      with: { client: true }
    }),
  ]);
  
  // Calculate financial impact
  const originalValue = product.listPrice * (negotiation.items?.find(i => i.productSku === productSku)?.quantity || 1);
  const discountValue = originalValue * (discountPercent / 100);
  
  // Create approval request
  const approvalRequest = await db.insert(discountApprovals).values({
    tenantId,
    negotiationId,
    productSku,
    discountPercent,
    originalValue,
    discountValue,
    requiredRole,
    status: 'PENDING',
    slaDeadline: new Date(Date.now() + slaMinutes * 60 * 1000),
    requestContext: {
      clientName: negotiation.client.name,
      clientCui: negotiation.client.cui,
      negotiationValue: negotiation.totalWithVat,
    },
  }).returning();
  
  // Add to HITL queue
  await unifiedQueueManager.addToQueue({
    tenantId,
    itemId: approvalRequest[0].id,
    type: 'DISCOUNT',
    priority: discountPercent > 25 ? 'HIGH' : 'MEDIUM',
    context: {
      negotiationId,
      productSku,
      productName: product.name,
      discountPercent,
      discountValue,
      clientName: negotiation.client.name,
    },
  });
  
  // Notify appropriate role
  await notificationService.send({
    tenantId,
    type: 'HITL_DISCOUNT_APPROVAL',
    priority: discountPercent > 25 ? 'HIGH' : 'MEDIUM',
    title: `Aprobare discount ${discountPercent}%`,
    body: `${product.name} - ${negotiation.client.name}. Valoare discount: ${formatCurrency(discountValue)}`,
    recipients: [requiredRole],
    metadata: { 
      approvalId: approvalRequest[0].id,
      discountPercent,
      productSku 
    },
  });
  
  return { approvalId: approvalRequest[0].id };
});

// N4 Document Review (e-Factura errors, etc.)
worker_N4.process(async (job) => {
  const { 
    invoiceId, 
    documentType,
    errorCode,
    errorMessage,
    slaMinutes,
    requiredRole,
    tenantId 
  } = job.data;
  
  // Get document context
  const document = await db.query.oblioDocuments.findFirst({
    where: eq(oblioDocuments.id, invoiceId),
    with: { negotiation: { with: { client: true } } }
  });
  
  // Create review request
  const reviewRequest = await db.insert(hitlApprovals).values({
    tenantId,
    negotiationId: document.negotiationId,
    type: 'DOCUMENT_REVIEW',
    reason: `${documentType} error: ${errorCode}`,
    context: {
      invoiceId,
      documentType,
      errorCode,
      errorMessage,
      clientName: document.negotiation.client.name,
      documentNumber: document.oblioNumber,
    },
    priority: 'HIGH',
    status: 'PENDING',
    slaDeadline: new Date(Date.now() + slaMinutes * 60 * 1000),
  }).returning();
  
  // Add to HITL queue
  await unifiedQueueManager.addToQueue({
    tenantId,
    itemId: reviewRequest[0].id,
    type: 'DOCUMENT',
    priority: 'HIGH',
    context: {
      invoiceId,
      errorCode,
      errorMessage,
      documentNumber: document.oblioNumber,
    },
  });
  
  // Notify
  await notificationService.send({
    tenantId,
    type: 'HITL_DOCUMENT_REVIEW',
    priority: 'HIGH',
    title: `⚠️ Eroare ${documentType}`,
    body: `Document ${document.oblioNumber}: ${errorMessage}`,
    recipients: [requiredRole || 'ACCOUNTANT'],
    channels: ['PUSH', 'EMAIL'],
    metadata: { invoiceId, errorCode },
  });
  
  return { reviewRequestId: reviewRequest[0].id };
});
```

---

# 4. EVENT DEFINITIONS

## 4.1 Event Type Registry

```typescript
// Complete event type registry for Etapa 3
export const ETAPA3_EVENTS = {
  // Product Knowledge (A)
  PRODUCT_SYNC_REQUESTED: 'product.sync.requested',
  PRODUCT_SYNCED: 'product.synced',
  PRODUCT_EMBED_REQUESTED: 'product.embed.requested',
  PRODUCT_EMBEDDED: 'product.embedded',
  PRODUCT_CHUNK_REQUESTED: 'product.chunk.requested',
  PRODUCT_CHUNKED: 'product.chunked',
  PRODUCT_INDEX_REQUESTED: 'product.index.requested',
  PRODUCT_INDEXED: 'product.indexed',
  PRODUCT_VALIDATED: 'product.validated',
  PRODUCT_PRICE_UPDATED: 'product.price.updated',
  
  // Hybrid Search (B)
  SEARCH_SEMANTIC_REQUESTED: 'search.semantic.requested',
  SEARCH_SEMANTIC_COMPLETED: 'search.semantic.completed',
  SEARCH_KEYWORD_REQUESTED: 'search.keyword.requested',
  SEARCH_KEYWORD_COMPLETED: 'search.keyword.completed',
  SEARCH_HYBRID_REQUESTED: 'search.hybrid.requested',
  SEARCH_HYBRID_COMPLETED: 'search.hybrid.completed',
  SEARCH_RERANKED: 'search.reranked',
  SEARCH_CACHED: 'search.cached',
  
  // AI Agent (C)
  AI_MESSAGE_RECEIVED: 'ai.message.received',
  AI_INTENT_CLASSIFIED: 'ai.intent.classified',
  AI_RESPONSE_GENERATED: 'ai.response.generated',
  AI_RESPONSE_APPROVED: 'ai.response.approved',
  AI_RESPONSE_REJECTED: 'ai.response.rejected',
  AI_TOOL_CALLED: 'ai.tool.called',
  AI_TOOL_COMPLETED: 'ai.tool.completed',
  AI_FALLBACK_TRIGGERED: 'ai.fallback.triggered',
  
  // Negotiation FSM (D)
  NEGOTIATION_CREATED: 'negotiation.created',
  NEGOTIATION_STATE_CHANGED: 'negotiation.state.changed',
  NEGOTIATION_ITEM_ADDED: 'negotiation.item.added',
  NEGOTIATION_ITEM_REMOVED: 'negotiation.item.removed',
  NEGOTIATION_QUOTE_SENT: 'negotiation.quote.sent',
  NEGOTIATION_COMPLETED: 'negotiation.completed',
  NEGOTIATION_CANCELLED: 'negotiation.cancelled',
  NEGOTIATION_TIMEOUT: 'negotiation.timeout',
  
  // Pricing & Discount (E)
  PRICE_CALCULATED: 'price.calculated',
  DISCOUNT_REQUESTED: 'discount.requested',
  DISCOUNT_VALIDATED: 'discount.validated',
  DISCOUNT_AUTO_APPROVED: 'discount.auto.approved',
  DISCOUNT_PENDING_APPROVAL: 'discount.pending.approval',
  DISCOUNT_APPROVED: 'discount.approved',
  DISCOUNT_REJECTED: 'discount.rejected',
  PRICE_RULE_UPDATED: 'price.rule.updated',
  
  // Stock (F)
  STOCK_CHECKED: 'stock.checked',
  STOCK_RESERVED: 'stock.reserved',
  STOCK_RELEASED: 'stock.released',
  STOCK_UPDATED: 'stock.updated',
  STOCK_LOW_ALERT: 'stock.low.alert',
  STOCK_SYNCED: 'stock.synced',
  
  // Oblio (G)
  PROFORMA_CREATED: 'oblio.proforma.created',
  PROFORMA_SYNCED: 'oblio.proforma.synced',
  INVOICE_CREATED: 'oblio.invoice.created',
  INVOICE_SYNCED: 'oblio.invoice.synced',
  OBLIO_WEBHOOK_RECEIVED: 'oblio.webhook.received',
  OBLIO_RECONCILED: 'oblio.reconciled',
  
  // e-Factura (H)
  EINVOICE_SUBMITTED: 'einvoice.submitted',
  EINVOICE_STATUS_CHECKED: 'einvoice.status.checked',
  EINVOICE_ACCEPTED: 'einvoice.accepted',
  EINVOICE_REJECTED: 'einvoice.rejected',
  EINVOICE_RETRY: 'einvoice.retry',
  
  // Document Generation (I)
  DOCUMENT_TEMPLATE_LOADED: 'document.template.loaded',
  DOCUMENT_GENERATED: 'document.generated',
  DOCUMENT_RENDERED: 'document.rendered',
  DOCUMENT_STORED: 'document.stored',
  DOCUMENT_ARCHIVED: 'document.archived',
  
  // Handover & Channel (J)
  HANDOVER_INITIATED: 'handover.initiated',
  CONVERSATION_LOADED: 'conversation.loaded',
  WHATSAPP_SENT: 'channel.whatsapp.sent',
  EMAIL_SENT: 'channel.email.sent',
  CHANNEL_ROUTED: 'channel.routed',
  
  // Sentiment & Intent (K)
  SENTIMENT_ANALYZED: 'sentiment.analyzed',
  INTENT_CLASSIFIED: 'intent.classified',
  URGENCY_DETECTED: 'urgency.detected',
  LANGUAGE_DETECTED: 'language.detected',
  TONE_ADAPTED: 'tone.adapted',
  
  // MCP Server (L)
  MCP_SESSION_STARTED: 'mcp.session.started',
  MCP_TOOL_EXECUTED: 'mcp.tool.executed',
  MCP_RESOURCE_FETCHED: 'mcp.resource.fetched',
  MCP_PROMPT_LOADED: 'mcp.prompt.loaded',
  MCP_SESSION_CLOSED: 'mcp.session.closed',
  
  // Guardrails (M)
  GUARDRAIL_PRICE_PASSED: 'guardrail.price.passed',
  GUARDRAIL_PRICE_FAILED: 'guardrail.price.failed',
  GUARDRAIL_STOCK_PASSED: 'guardrail.stock.passed',
  GUARDRAIL_STOCK_FAILED: 'guardrail.stock.failed',
  GUARDRAIL_DISCOUNT_PASSED: 'guardrail.discount.passed',
  GUARDRAIL_DISCOUNT_FAILED: 'guardrail.discount.failed',
  GUARDRAIL_ALL_PASSED: 'guardrail.all.passed',
  GUARDRAIL_REGENERATE: 'guardrail.regenerate',
  
  // HITL (N)
  HITL_ESCALATED: 'hitl.escalated',
  HITL_TAKEOVER: 'hitl.takeover',
  HITL_DISCOUNT_REQUESTED: 'hitl.discount.requested',
  HITL_DISCOUNT_APPROVED: 'hitl.discount.approved',
  HITL_DISCOUNT_REJECTED: 'hitl.discount.rejected',
  HITL_DOCUMENT_REVIEW: 'hitl.document.review',
  HITL_RESOLVED: 'hitl.resolved',
} as const;

export type Etapa3EventType = typeof ETAPA3_EVENTS[keyof typeof ETAPA3_EVENTS];
```

## 4.2 Event Payload Schemas

```typescript
// Base event interface
interface BaseEvent {
  eventId: string;       // UUIDv7
  eventType: Etapa3EventType;
  tenantId: string;
  timestamp: Date;
  source: string;        // Worker name
  correlationId: string; // For tracing
}

// Negotiation events
interface NegotiationCreatedEvent extends BaseEvent {
  eventType: 'negotiation.created';
  payload: {
    negotiationId: string;
    leadId: string;
    contactId: string;
    sourceChannel: 'WHATSAPP' | 'EMAIL';
    initialState: NegotiationState;
  };
}

interface NegotiationStateChangedEvent extends BaseEvent {
  eventType: 'negotiation.state.changed';
  payload: {
    negotiationId: string;
    fromState: NegotiationState;
    toState: NegotiationState;
    trigger: string;
    triggeredBy: string;
  };
}

// AI events
interface AIResponseGeneratedEvent extends BaseEvent {
  eventType: 'ai.response.generated';
  payload: {
    responseId: string;
    negotiationId: string;
    messageText: string;
    tokensUsed: number;
    model: string;
    extractedData: {
      prices: Array<{ sku: string; price: number }>;
      products: Array<{ sku: string; quantity: number }>;
      discounts: Array<{ sku: string; percent: number }>;
    };
  };
}

// Guardrail events
interface GuardrailResultEvent extends BaseEvent {
  eventType: 'guardrail.all.passed' | 'guardrail.regenerate';
  payload: {
    responseId: string;
    negotiationId: string;
    passed: boolean;
    violations: Array<{
      type: string;
      severity: 'ERROR' | 'WARNING';
      message: string;
      correction?: object;
    }>;
    regenerateCount?: number;
  };
}

// HITL events
interface HITLEscalatedEvent extends BaseEvent {
  eventType: 'hitl.escalated';
  payload: {
    hitlRequestId: string;
    negotiationId: string;
    reason: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    assignedTo?: string;
    slaDeadline: Date;
  };
}
```

---

# 5. CROSS-STAGE TRIGGERS

## 5.1 Etapa 2 → Etapa 3 Handover

```typescript
// Triggered by Etapa 2 when lead replies warmly
// Listen on: etapa2:events:warm_reply

interface Etapa2WarmReplyEvent {
  eventType: 'ETAPA2_WARM_REPLY';
  leadId: string;
  contactId: string;
  currentStage: 'WARM_REPLY';
  channelType: 'WHATSAPP' | 'EMAIL';
  lastMessageId: string;
  conversationContext: {
    messageCount: number;
    lastSentimentScore: number;
    assignedPhoneNumber?: string;
  };
  tenantId: string;
}

// Etapa 3 listener
redis.subscribe('etapa2:events:warm_reply', async (message) => {
  const event: Etapa2WarmReplyEvent = JSON.parse(message);
  
  // Trigger handover orchestrator
  await queue_J1.add('handover-from-etapa2', {
    eventType: 'HANDOVER_INITIATED',
    ...event,
  }, {
    priority: 2, // High priority
    attempts: 3,
  });
});
```

## 5.2 Etapa 3 → Etapa 4 Completion

```typescript
// Triggered when negotiation successfully completes
// Publish to: etapa4:events:sale_completed

interface Etapa3SaleCompletedEvent {
  eventType: 'ETAPA3_SALE_COMPLETED';
  negotiationId: string;
  leadId: string;
  contactId: string;
  clientCui: string;
  invoiceDetails: {
    oblioInvoiceId: string;
    invoiceNumber: string;
    totalWithVat: number;
    einvoiceId?: string;
  };
  productsSold: Array<{
    sku: string;
    quantity: number;
    unitPrice: number;
    totalValue: number;
  }>;
  assignedUserId: string;
  completedAt: Date;
  tenantId: string;
}

// Publish on negotiation completion (D6)
worker_D6.process(async (job) => {
  const { negotiationId, tenantId } = job.data;
  
  // Get full negotiation data
  const negotiation = await db.query.goldNegotiations.findFirst({
    where: eq(goldNegotiations.id, negotiationId),
    with: {
      items: true,
      client: true,
      invoice: true,
    }
  });
  
  // Update lead status in gold_lead_journey
  await db.update(goldLeadJourney)
    .set({
      currentStage: 'CONVERTED',
      convertedAt: new Date(),
      totalValue: negotiation.totalWithVat,
    })
    .where(eq(goldLeadJourney.leadId, negotiation.leadId));
  
  // Publish to Etapa 4
  const completionEvent: Etapa3SaleCompletedEvent = {
    eventType: 'ETAPA3_SALE_COMPLETED',
    negotiationId,
    leadId: negotiation.leadId,
    contactId: negotiation.contactId,
    clientCui: negotiation.client.cui,
    invoiceDetails: {
      oblioInvoiceId: negotiation.invoice.oblioId,
      invoiceNumber: negotiation.invoice.oblioNumber,
      totalWithVat: negotiation.totalWithVat,
      einvoiceId: negotiation.invoice.einvoiceId,
    },
    productsSold: negotiation.items.map(item => ({
      sku: item.productSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalValue: item.totalWithVat,
    })),
    assignedUserId: negotiation.assignedUserId,
    completedAt: new Date(),
    tenantId,
  };
  
  await redis.publish('etapa4:events:sale_completed', JSON.stringify(completionEvent));
  
  return { completed: true };
});
```

## 5.3 Cross-Stage Event Bus Configuration

```typescript
// Central event bus configuration
const CROSS_STAGE_CHANNELS = {
  // Etapa 2 → Etapa 3
  ETAPA2_TO_ETAPA3: [
    'etapa2:events:warm_reply',
    'etapa2:events:callback_requested',
  ],
  
  // Etapa 3 → Etapa 4
  ETAPA3_TO_ETAPA4: [
    'etapa4:events:sale_completed',
    'etapa4:events:invoice_issued',
    'etapa4:events:customer_created',
  ],
  
  // Etapa 3 → Etapa 5 (nurturing)
  ETAPA3_TO_ETAPA5: [
    'etapa5:events:negotiation_stalled',
    'etapa5:events:quote_expired',
    'etapa5:events:cancelled_lead',
  ],
};

// Initialize cross-stage listeners
async function initializeCrossStageListeners() {
  const redis = new Redis(process.env.REDIS_URL);
  
  // Listen for Etapa 2 events
  for (const channel of CROSS_STAGE_CHANNELS.ETAPA2_TO_ETAPA3) {
    await redis.subscribe(channel);
  }
  
  redis.on('message', async (channel, message) => {
    const event = JSON.parse(message);
    
    switch (channel) {
      case 'etapa2:events:warm_reply':
        await handleWarmReply(event);
        break;
      case 'etapa2:events:callback_requested':
        await handleCallbackRequest(event);
        break;
    }
  });
}
```

---

# 6. WORKFLOW ORCHESTRATION

## 6.1 Saga Pattern for Complex Workflows

```typescript
// Saga for complete negotiation → invoice → e-factura flow
class NegotiationCompletionSaga {
  private steps: SagaStep[] = [];
  private compensations: Map<string, () => Promise<void>> = new Map();
  
  async execute(negotiationId: string, tenantId: string) {
    const sagaId = uuidv7();
    
    try {
      // Step 1: Create proforma in Oblio
      await this.executeStep({
        name: 'CREATE_PROFORMA',
        execute: () => queue_G1.add('create-proforma', { negotiationId, tenantId }),
        compensate: () => this.cancelProforma(negotiationId),
      });
      
      // Step 2: Wait for payment confirmation
      await this.executeStep({
        name: 'AWAIT_PAYMENT',
        execute: () => this.waitForPayment(negotiationId),
        compensate: () => this.expireProforma(negotiationId),
      });
      
      // Step 3: Convert to invoice
      await this.executeStep({
        name: 'CREATE_INVOICE',
        execute: () => queue_G3.add('create-invoice', { negotiationId, tenantId }),
        compensate: () => this.stornInvoice(negotiationId),
      });
      
      // Step 4: Submit to e-Factura
      await this.executeStep({
        name: 'SUBMIT_EINVOICE',
        execute: () => queue_H1.add('submit-einvoice', { negotiationId, tenantId }),
        compensate: () => this.cancelEinvoice(negotiationId),
      });
      
      // Step 5: Update stock
      await this.executeStep({
        name: 'UPDATE_STOCK',
        execute: () => queue_F4.add('update-stock', { negotiationId, tenantId }),
        compensate: () => this.restoreStock(negotiationId),
      });
      
      // Step 6: Complete negotiation
      await this.executeStep({
        name: 'COMPLETE_NEGOTIATION',
        execute: () => queue_D6.add('complete', { negotiationId, tenantId }),
        compensate: () => this.reopenNegotiation(negotiationId),
      });
      
      return { success: true, sagaId };
      
    } catch (error) {
      // Rollback in reverse order
      await this.rollback();
      throw error;
    }
  }
  
  private async executeStep(step: SagaStep) {
    this.steps.push(step);
    this.compensations.set(step.name, step.compensate);
    
    const job = await step.execute();
    const result = await job.waitUntilFinished(job.queue.queueEvents);
    
    if (!result.success) {
      throw new Error(`Saga step ${step.name} failed: ${result.error}`);
    }
    
    return result;
  }
  
  private async rollback() {
    // Execute compensations in reverse order
    const stepNames = this.steps.map(s => s.name).reverse();
    
    for (const stepName of stepNames) {
      const compensate = this.compensations.get(stepName);
      if (compensate) {
        try {
          await compensate();
        } catch (error) {
          console.error(`Compensation for ${stepName} failed:`, error);
          // Log but continue with other compensations
        }
      }
    }
  }
}
```

## 6.2 Parallel Execution with Dependencies

```typescript
// Parallel execution for quote generation
async function generateQuoteParallel(negotiationId: string, tenantId: string) {
  const flow = new FlowProducer({ connection: redisConnection });
  
  await flow.add({
    name: 'complete-quote',
    queueName: 'etapa3:negotiation:complete-quote',
    data: { negotiationId, tenantId },
    children: [
      // These run in parallel first
      {
        name: 'check-all-stock',
        queueName: 'etapa3:stock:check-batch',
        data: { negotiationId, tenantId },
      },
      {
        name: 'calculate-all-prices',
        queueName: 'etapa3:pricing:calculate-batch',
        data: { negotiationId, tenantId },
      },
      {
        name: 'get-client-context',
        queueName: 'etapa3:search:client-context',
        data: { negotiationId, tenantId },
      },
    ],
    opts: {
      failParentOnFailure: true, // If any child fails, parent fails
    }
  });
}

// Parent job waits for all children
worker_completeQuote.process(async (job) => {
  // Children results are available
  const childrenValues = await job.getChildrenValues();
  
  const stockResults = childrenValues['check-all-stock'];
  const priceResults = childrenValues['calculate-all-prices'];
  const clientContext = childrenValues['get-client-context'];
  
  // Validate all stock is available
  if (stockResults.some(s => !s.available)) {
    throw new Error('Stock not available for all items');
  }
  
  // Generate quote with all data
  return await generateQuote({
    negotiationId: job.data.negotiationId,
    stockResults,
    priceResults,
    clientContext,
  });
});
```

---

# 7. ERROR PROPAGATION

## 7.1 Error Classification

```typescript
// Error types and handling strategies
enum ErrorSeverity {
  TRANSIENT = 'TRANSIENT',   // Retry automatically
  RECOVERABLE = 'RECOVERABLE', // Retry with backoff
  FATAL = 'FATAL',           // Don't retry, escalate
  BUSINESS = 'BUSINESS',     // Business rule violation
}

interface WorkerError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  retryable: boolean;
  maxRetries?: number;
  retryDelay?: number;
  escalateTo?: string;
}

const ERROR_CATALOG: Record<string, WorkerError> = {
  // API Errors
  OBLIO_API_TIMEOUT: {
    code: 'OBLIO_API_TIMEOUT',
    message: 'Oblio API timeout',
    severity: ErrorSeverity.TRANSIENT,
    retryable: true,
    maxRetries: 3,
    retryDelay: 5000,
  },
  OBLIO_API_RATE_LIMIT: {
    code: 'OBLIO_API_RATE_LIMIT',
    message: 'Oblio API rate limit exceeded',
    severity: ErrorSeverity.RECOVERABLE,
    retryable: true,
    maxRetries: 5,
    retryDelay: 60000, // 1 minute
  },
  SPV_MAINTENANCE: {
    code: 'SPV_MAINTENANCE',
    message: 'ANAF SPV în mentenanță',
    severity: ErrorSeverity.RECOVERABLE,
    retryable: true,
    maxRetries: 10,
    retryDelay: 3600000, // 1 hour
  },
  SPV_VALIDATION_ERROR: {
    code: 'SPV_VALIDATION_ERROR',
    message: 'e-Factura validation error',
    severity: ErrorSeverity.FATAL,
    retryable: false,
    escalateTo: 'N4', // Document review HITL
  },
  
  // Business Errors
  PRICE_BELOW_MINIMUM: {
    code: 'PRICE_BELOW_MINIMUM',
    message: 'Price below minimum allowed',
    severity: ErrorSeverity.BUSINESS,
    retryable: false, // Guardrail will handle
  },
  STOCK_INSUFFICIENT: {
    code: 'STOCK_INSUFFICIENT',
    message: 'Insufficient stock',
    severity: ErrorSeverity.BUSINESS,
    retryable: false,
  },
  
  // AI Errors
  AI_GENERATION_FAILED: {
    code: 'AI_GENERATION_FAILED',
    message: 'AI response generation failed',
    severity: ErrorSeverity.RECOVERABLE,
    retryable: true,
    maxRetries: 2,
    retryDelay: 1000,
  },
  AI_MAX_REGENERATIONS: {
    code: 'AI_MAX_REGENERATIONS',
    message: 'Maximum AI regenerations exceeded',
    severity: ErrorSeverity.FATAL,
    retryable: false,
    escalateTo: 'N2', // Human takeover
  },
};
```

## 7.2 Global Error Handler

```typescript
// Centralized error handling for all workers
async function handleWorkerError(
  error: Error,
  job: Job,
  workerName: string
): Promise<void> {
  const errorDef = ERROR_CATALOG[error.name] || {
    code: 'UNKNOWN',
    message: error.message,
    severity: ErrorSeverity.FATAL,
    retryable: false,
  };
  
  // Log error
  await db.insert(workerErrors).values({
    tenantId: job.data.tenantId,
    workerName,
    jobId: job.id,
    errorCode: errorDef.code,
    errorMessage: error.message,
    errorStack: error.stack,
    severity: errorDef.severity,
    jobData: job.data,
    attemptNumber: job.attemptsMade,
  });
  
  // Publish error event
  await redis.publish(`worker:errors:${job.data.tenantId}`, JSON.stringify({
    type: 'WORKER_ERROR',
    workerName,
    jobId: job.id,
    error: errorDef,
    timestamp: new Date(),
  }));
  
  // Handle based on severity
  switch (errorDef.severity) {
    case ErrorSeverity.FATAL:
      if (errorDef.escalateTo) {
        await escalateToHITL(errorDef.escalateTo, job, error);
      }
      throw new UnrecoverableError(error.message); // Stop retries
      
    case ErrorSeverity.BUSINESS:
      // Business errors don't retry - handled by guardrails
      throw new UnrecoverableError(error.message);
      
    case ErrorSeverity.RECOVERABLE:
    case ErrorSeverity.TRANSIENT:
      // Will retry automatically via BullMQ
      throw error;
  }
}

// Apply to all workers
function createWorkerWithErrorHandling(
  queueName: string,
  processor: (job: Job) => Promise<any>
) {
  const worker = new Worker(queueName, async (job) => {
    try {
      return await processor(job);
    } catch (error) {
      await handleWorkerError(error, job, queueName);
      throw error;
    }
  }, {
    connection: redisConnection,
    concurrency: 5,
  });
  
  return worker;
}
```

---

# 8. CIRCUIT BREAKERS

## 8.1 Circuit Breaker Implementation

```typescript
import CircuitBreaker from 'opossum';

// Circuit breaker configuration per external service
const CIRCUIT_BREAKER_CONFIG = {
  OBLIO: {
    timeout: 10000,          // 10 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000,     // 30 seconds
    volumeThreshold: 5,      // Min requests before opening
  },
  ANAF_SPV: {
    timeout: 30000,          // 30 seconds (SPV is slow)
    errorThresholdPercentage: 30,
    resetTimeout: 60000,     // 1 minute
    volumeThreshold: 3,
  },
  XAI: {
    timeout: 60000,          // 60 seconds for AI
    errorThresholdPercentage: 40,
    resetTimeout: 10000,     // 10 seconds
    volumeThreshold: 10,
  },
  TIMELINESAI: {
    timeout: 15000,
    errorThresholdPercentage: 50,
    resetTimeout: 20000,
    volumeThreshold: 5,
  },
  RESEND: {
    timeout: 10000,
    errorThresholdPercentage: 50,
    resetTimeout: 15000,
    volumeThreshold: 5,
  },
};

// Create circuit breaker for each service
class ExternalServiceCircuitBreaker {
  private breakers: Map<string, CircuitBreaker> = new Map();
  
  constructor() {
    for (const [service, config] of Object.entries(CIRCUIT_BREAKER_CONFIG)) {
      this.breakers.set(service, new CircuitBreaker(
        async (fn: () => Promise<any>) => fn(),
        config
      ));
    }
    
    // Add event listeners
    for (const [service, breaker] of this.breakers) {
      breaker.on('open', () => {
        console.warn(`Circuit OPEN for ${service}`);
        this.publishCircuitEvent(service, 'OPEN');
      });
      
      breaker.on('halfOpen', () => {
        console.info(`Circuit HALF-OPEN for ${service}`);
        this.publishCircuitEvent(service, 'HALF_OPEN');
      });
      
      breaker.on('close', () => {
        console.info(`Circuit CLOSED for ${service}`);
        this.publishCircuitEvent(service, 'CLOSED');
      });
      
      breaker.on('fallback', () => {
        console.info(`Fallback triggered for ${service}`);
        metrics.increment(`circuit_breaker.fallback.${service}`);
      });
    }
  }
  
  async call<T>(service: string, fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    const breaker = this.breakers.get(service);
    
    if (!breaker) {
      throw new Error(`No circuit breaker for service: ${service}`);
    }
    
    if (fallback) {
      breaker.fallback(fallback);
    }
    
    return breaker.fire(fn);
  }
  
  getStatus(service: string) {
    const breaker = this.breakers.get(service);
    return {
      state: breaker?.opened ? 'OPEN' : breaker?.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: breaker?.stats,
    };
  }
  
  private async publishCircuitEvent(service: string, state: string) {
    await redis.publish('circuit:events', JSON.stringify({
      service,
      state,
      timestamp: new Date(),
    }));
    
    // Alert on OPEN
    if (state === 'OPEN') {
      await notificationService.send({
        tenantId: 'SYSTEM',
        type: 'CIRCUIT_BREAKER_OPEN',
        priority: 'HIGH',
        title: `Circuit Breaker OPEN: ${service}`,
        body: `External service ${service} is experiencing issues`,
        recipients: ['SYSTEM_ADMIN'],
      });
    }
  }
}

export const circuitBreaker = new ExternalServiceCircuitBreaker();

// Usage in workers
worker_G1.process(async (job) => {
  const result = await circuitBreaker.call(
    'OBLIO',
    () => oblioClient.createProforma(job.data),
    () => {
      // Fallback: queue for later retry
      throw new Error('OBLIO_CIRCUIT_OPEN');
    }
  );
  return result;
});
```

## 8.2 Fallback Strategies

```typescript
// Fallback strategies for critical paths
const FALLBACK_STRATEGIES = {
  // AI Fallback: Use backup model
  AI_FALLBACK: async (job: Job) => {
    const { negotiationId, tenantId, originalModel } = job.data;
    
    if (originalModel === 'grok-4') {
      // Try GPT-4o as fallback
      return await queue_C6.add('ai-fallback', {
        ...job.data,
        model: 'gpt-4o',
        fallbackReason: 'PRIMARY_MODEL_UNAVAILABLE',
      });
    }
    
    // Both models failed - escalate to human
    return await queue_N2.add('human-takeover', {
      negotiationId,
      tenantId,
      reason: 'ALL_AI_MODELS_UNAVAILABLE',
    });
  },
  
  // Oblio Fallback: Store locally, sync later
  OBLIO_FALLBACK: async (job: Job) => {
    const { negotiationId, documentData, tenantId } = job.data;
    
    // Store document locally for later sync
    await db.insert(pendingOblioSync).values({
      tenantId,
      negotiationId,
      documentType: documentData.type,
      payload: documentData,
      status: 'PENDING_SYNC',
      createdAt: new Date(),
    });
    
    // Schedule retry when circuit closes
    await queue_G6.add('retry-oblio-sync', {
      negotiationId,
      tenantId,
    }, { delay: 5 * 60 * 1000 }); // 5 minutes
    
    return { queued: true, willRetry: true };
  },
  
  // SPV Fallback: Critical alert (legal deadline)
  SPV_FALLBACK: async (job: Job) => {
    const { invoiceId, tenantId } = job.data;
    
    // Check days until deadline
    const invoice = await db.query.oblioDocuments.findFirst({
      where: eq(oblioDocuments.id, invoiceId)
    });
    
    const daysRemaining = Math.floor(
      (invoice.legalDeadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    
    // Critical alert if < 2 days
    if (daysRemaining < 2) {
      await notificationService.send({
        tenantId,
        type: 'SPV_DEADLINE_CRITICAL',
        priority: 'CRITICAL',
        title: '⚠️ URGENȚĂ: Deadline e-Factura',
        body: `Factura ${invoice.oblioNumber} - ${daysRemaining} zile rămase. ANAF SPV indisponibil!`,
        recipients: ['ACCOUNTANT', 'FINANCE_MANAGER', 'DIRECTOR'],
        channels: ['PUSH', 'SMS', 'EMAIL', 'SLACK'],
      });
    }
    
    // Queue aggressive retry
    await queue_H5.add('retry-spv-urgent', {
      invoiceId,
      tenantId,
      urgencyLevel: daysRemaining < 2 ? 'CRITICAL' : 'HIGH',
    }, { 
      delay: 15 * 60 * 1000, // 15 minutes
      attempts: 20,
    });
    
    return { fallback: true, daysRemaining };
  },
};
```

---

# 9. MONITORING & TRACING

## 9.1 Distributed Tracing Setup

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('etapa3-workers');

// Trace wrapper for workers
function createTracedWorker(
  queueName: string,
  processor: (job: Job, span: Span) => Promise<any>
) {
  return new Worker(queueName, async (job) => {
    const span = tracer.startSpan(`worker.${queueName}`, {
      attributes: {
        'job.id': job.id,
        'job.name': job.name,
        'tenant.id': job.data.tenantId,
        'queue.name': queueName,
      },
    });
    
    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await processor(job, span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }, { connection: redisConnection });
}

// Usage
const worker_C1 = createTracedWorker('etapa3:ai:orchestrator', async (job, span) => {
  span.setAttribute('negotiation.id', job.data.negotiationId);
  
  // Create child span for AI call
  const aiSpan = tracer.startSpan('ai.generate', {
    parent: span,
    attributes: {
      'ai.model': 'grok-4',
      'ai.provider': 'xAI',
    },
  });
  
  try {
    const response = await xaiClient.chat.completions.create({...});
    aiSpan.setAttribute('ai.tokens.used', response.usage.total_tokens);
    aiSpan.end();
    return response;
  } catch (error) {
    aiSpan.recordException(error);
    aiSpan.end();
    throw error;
  }
});
```

## 9.2 Metrics Collection

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

// Worker metrics
const workerMetrics = {
  // Job counters
  jobsProcessed: new Counter({
    name: 'etapa3_jobs_processed_total',
    help: 'Total jobs processed',
    labelNames: ['queue', 'status', 'tenant'],
  }),
  
  // Job duration
  jobDuration: new Histogram({
    name: 'etapa3_job_duration_seconds',
    help: 'Job processing duration',
    labelNames: ['queue', 'tenant'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  }),
  
  // Queue depth
  queueDepth: new Gauge({
    name: 'etapa3_queue_depth',
    help: 'Current queue depth',
    labelNames: ['queue', 'status'],
  }),
  
  // Guardrail metrics
  guardrailChecks: new Counter({
    name: 'etapa3_guardrail_checks_total',
    help: 'Guardrail check results',
    labelNames: ['type', 'result', 'tenant'],
  }),
  
  // AI metrics
  aiTokensUsed: new Counter({
    name: 'etapa3_ai_tokens_total',
    help: 'AI tokens used',
    labelNames: ['model', 'tenant'],
  }),
  
  aiLatency: new Histogram({
    name: 'etapa3_ai_latency_seconds',
    help: 'AI response latency',
    labelNames: ['model'],
    buckets: [1, 2, 5, 10, 20, 30, 60],
  }),
  
  // HITL metrics
  hitlRequests: new Counter({
    name: 'etapa3_hitl_requests_total',
    help: 'HITL requests created',
    labelNames: ['type', 'priority', 'tenant'],
  }),
  
  hitlResolutionTime: new Histogram({
    name: 'etapa3_hitl_resolution_seconds',
    help: 'HITL resolution time',
    labelNames: ['type'],
    buckets: [60, 300, 900, 1800, 3600, 7200],
  }),
  
  // Negotiation metrics
  negotiationsActive: new Gauge({
    name: 'etapa3_negotiations_active',
    help: 'Active negotiations',
    labelNames: ['state', 'tenant'],
  }),
  
  negotiationConversions: new Counter({
    name: 'etapa3_negotiation_conversions_total',
    help: 'Successful negotiation conversions',
    labelNames: ['tenant'],
  }),
  
  // External service metrics
  externalServiceLatency: new Histogram({
    name: 'etapa3_external_service_latency_seconds',
    help: 'External service call latency',
    labelNames: ['service'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  }),
  
  circuitBreakerState: new Gauge({
    name: 'etapa3_circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
    labelNames: ['service'],
  }),
};

// Update queue depth periodically
setInterval(async () => {
  const queues = Object.values(ETAPA3_QUEUES);
  
  for (const queueName of queues) {
    const queue = new Queue(queueName, { connection: redisConnection });
    const counts = await queue.getJobCounts();
    
    workerMetrics.queueDepth.set({ queue: queueName, status: 'waiting' }, counts.waiting);
    workerMetrics.queueDepth.set({ queue: queueName, status: 'active' }, counts.active);
    workerMetrics.queueDepth.set({ queue: queueName, status: 'delayed' }, counts.delayed);
    workerMetrics.queueDepth.set({ queue: queueName, status: 'failed' }, counts.failed);
  }
}, 10000); // Every 10 seconds
```

## 9.3 Alert Rules

```yaml
# Prometheus alerting rules for Etapa 3
groups:
  - name: etapa3-workers
    rules:
      # High queue depth
      - alert: Etapa3QueueBacklog
        expr: etapa3_queue_depth{status="waiting"} > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High queue backlog in {{ $labels.queue }}"
          description: "Queue {{ $labels.queue }} has {{ $value }} waiting jobs"
      
      # Worker failures
      - alert: Etapa3WorkerFailureRate
        expr: >
          rate(etapa3_jobs_processed_total{status="failed"}[5m]) /
          rate(etapa3_jobs_processed_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High failure rate in {{ $labels.queue }}"
      
      # AI latency
      - alert: Etapa3AILatencyHigh
        expr: histogram_quantile(0.95, rate(etapa3_ai_latency_seconds_bucket[5m])) > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "AI latency p95 > 30s"
      
      # Circuit breaker open
      - alert: Etapa3CircuitBreakerOpen
        expr: etapa3_circuit_breaker_state == 2
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker OPEN for {{ $labels.service }}"
      
      # HITL SLA breach risk
      - alert: Etapa3HITLSlaRisk
        expr: >
          (etapa3_hitl_requests_total{status="pending"} - 
           etapa3_hitl_requests_total{status="resolved"}) > 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "HITL queue growing - SLA breach risk"
      
      # Guardrail regeneration spike
      - alert: Etapa3GuardrailRegenerations
        expr: rate(etapa3_guardrail_checks_total{result="regenerate"}[15m]) > 0.2
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High guardrail regeneration rate"
      
      # e-Factura deadline approaching
      - alert: Etapa3EinvoiceDeadline
        expr: etapa3_einvoice_days_remaining < 2
        labels:
          severity: critical
        annotations:
          summary: "e-Factura deadline in {{ $value }} days"
```

---

# 10. IMPLEMENTATION EXAMPLES

## 10.1 Complete Message Processing Flow

```typescript
// Full flow from incoming WhatsApp message to response

// Step 1: Webhook receives message from TimelinesAI
app.post('/webhooks/timelinesai', async (req, res) => {
  const { messageId, phone, text, timestamp } = req.body;
  
  // Find negotiation by phone
  const negotiation = await db.query.goldNegotiations.findFirst({
    where: and(
      eq(goldNegotiations.sourceChannel, 'WHATSAPP'),
      sql`contact->>'whatsappPhone' = ${phone}`
    )
  });
  
  if (!negotiation) {
    return res.status(200).json({ processed: false, reason: 'NO_NEGOTIATION' });
  }
  
  // Store incoming message
  const message = await db.insert(aiMessageLog).values({
    tenantId: negotiation.tenantId,
    negotiationId: negotiation.id,
    direction: 'INBOUND',
    channelType: 'WHATSAPP',
    content: text,
    externalMessageId: messageId,
    receivedAt: new Date(timestamp),
  }).returning();
  
  // Trigger sentiment analysis (first in pipeline)
  await queue_K1.add('analyze-sentiment', {
    eventType: 'SENTIMENT_ANALYZE',
    messageId: message[0].id,
    messageText: text,
    negotiationId: negotiation.id,
    tenantId: negotiation.tenantId,
  });
  
  res.status(200).json({ processed: true });
});

// Step 2: Sentiment → Intent → AI Orchestrator
// (See K1, K2 workers above)

// Step 3: AI Orchestrator processes and generates response
worker_C1.process(async (job) => {
  const { messageId, negotiationId, intent, sentiment, tenantId } = job.data;
  
  // Load context
  const [negotiation, conversation, products] = await Promise.all([
    loadNegotiation(negotiationId),
    loadConversationHistory(negotiationId),
    searchRelevantProducts(intent.product_mentions, tenantId),
  ]);
  
  // Build MCP context
  const mcpContext = {
    resources: {
      negotiation: `negotiation://${negotiationId}`,
      client: `client://${negotiation.client.cui}`,
      products: products.map(p => `product://${p.sku}`),
    },
    tools: ['search_products', 'check_stock', 'calculate_price', 'create_quote'],
  };
  
  // Generate AI response
  const aiResponse = await generateAIResponse({
    messages: conversation.history,
    intent,
    sentiment,
    mcpContext,
    tenantId,
  });
  
  // Queue for guardrails
  await queue_M5.add('check-guardrails', {
    eventType: 'GUARDRAIL_CHECK_ALL',
    responseId: aiResponse.id,
    responseText: aiResponse.text,
    extractedData: aiResponse.extractedData,
    negotiationId,
    tenantId,
  });
  
  return { responseGenerated: true, responseId: aiResponse.id };
});

// Step 4: Guardrails check (M5 - see above)

// Step 5: If approved, route to channel
redis.subscribe('guardrail:approved:*', async (message, channel) => {
  const { responseId, negotiationId } = JSON.parse(message);
  const tenantId = channel.split(':')[2];
  
  // Get response
  const response = await db.query.aiResponses.findFirst({
    where: eq(aiResponses.id, responseId)
  });
  
  // Route to channel
  await queue_J5.add('route-response', {
    eventType: 'CHANNEL_ROUTE',
    negotiationId,
    message: response.text,
    attachments: response.attachments,
    tenantId,
  });
});

// Step 6: Send via WhatsApp (J3) or Email (J4)
// (See J3, J4 workers above)
```

## 10.2 Complete Discount Approval Flow

```typescript
// Flow when customer asks for > 15% discount

// AI detects discount request in message
const intent = {
  primary_intent: 'NEGOTIATION',
  secondary_intents: ['PRICE_REQUEST'],
  discount_requested: 25, // 25% discount
};

// E3 Discount Validate triggers approval
worker_E3.process(async (job) => {
  const { discountPercent, productSku, negotiationId, tenantId } = job.data;
  
  // Check rules
  const rules = await db.query.priceRules.findFirst({
    where: eq(priceRules.productSku, productSku)
  });
  
  // 25% > 15% auto-approve, <= 30% manager
  if (discountPercent <= 30) {
    await queue_N3.add('request-manager-approval', {
      eventType: 'HITL_DISCOUNT_APPROVAL',
      negotiationId,
      productSku,
      discountPercent,
      requiredRole: 'SALES_MANAGER',
      slaMinutes: 60,
      tenantId,
    });
    
    // Send "checking with manager" message to customer
    await queue_C3.add('generate-wait-message', {
      eventType: 'AI_GENERATE_WAIT_MESSAGE',
      negotiationId,
      context: 'DISCOUNT_PENDING_APPROVAL',
      tenantId,
    });
    
    return { pending: true, type: 'MANAGER_APPROVAL' };
  }
});

// Manager receives notification, opens dashboard, approves
app.post('/api/hitl/discount/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { approved, comment, adjustedDiscount } = req.body;
  const { userId, tenantId } = req.auth;
  
  // Update approval record
  await db.update(discountApprovals)
    .set({
      status: approved ? 'APPROVED' : 'REJECTED',
      decidedAt: new Date(),
      decidedBy: userId,
      comment,
      finalDiscount: adjustedDiscount || undefined,
    })
    .where(eq(discountApprovals.id, id));
  
  // Get approval details
  const approval = await db.query.discountApprovals.findFirst({
    where: eq(discountApprovals.id, id)
  });
  
  if (approved) {
    // Trigger discount application
    await queue_E4.add('apply-approved-discount', {
      eventType: 'DISCOUNT_APPLY',
      negotiationId: approval.negotiationId,
      productSku: approval.productSku,
      discountPercent: adjustedDiscount || approval.discountPercent,
      approvedBy: userId,
      tenantId,
    });
    
    // AI continues conversation with approved discount
    await queue_C3.add('generate-approval-response', {
      eventType: 'AI_GENERATE_DISCOUNT_APPROVED',
      negotiationId: approval.negotiationId,
      discountPercent: adjustedDiscount || approval.discountPercent,
      tenantId,
    });
  } else {
    // AI generates polite rejection
    await queue_C3.add('generate-rejection-response', {
      eventType: 'AI_GENERATE_DISCOUNT_REJECTED',
      negotiationId: approval.negotiationId,
      maxAllowed: 15, // Suggest auto-approve maximum
      reason: comment,
      tenantId,
    });
  }
  
  res.json({ success: true });
});
```

---

# 11. CHANGELOG

| Versiune | Data | Modificări |
|----------|------|------------|
| 1.0.0 | 2026-01-18 | Document inițial - Secțiunile 1-3 |
| 1.1.0 | 2026-01-18 | Adăugat Secțiunile 4-10 complete |

---

# 12. REFERINȚE

| Document | Locație |
|----------|---------|
| Master Spec | `/mnt/project/__Cerniq_Master_Spec_Normativ_Complet.md` |
| Workers Overview | `/home/claude/etapa3-docs/etapa3-workers-overview.md` |
| HITL Unified | `/mnt/project/Unified_HITL_Approval_System_for_B2B_Sales_Automation.md` |
| Etapa 2 Events | `/mnt/project/00-INDEX-ETAPA2.md` |
| Coding Standards | `/mnt/project/coding-standards.md` |

---

**Document generat:** 18 Ianuarie 2026  
**Linii totale:** ~3,000  
**Workers acoperite:** 78 (toate categoriile A-N)  
**Event types definite:** 80+  
**Cross-stage channels:** 8  
**Circuit breakers:** 5 servicii externe
