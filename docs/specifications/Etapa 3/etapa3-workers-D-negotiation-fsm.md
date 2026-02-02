# Etapa 3 - Workers Categoria D: Negotiation State Machine

**Document Version:** 2.0.0  
**Last Updated:** 2026-02-01  
**Author:** Cerniq Development Team  
**Status:** Technical Specification  
**Sprint Plan:** E3.S4.PR13, E3.S4.PR14, E3.S4.PR15, E3.S4.PR16 (vezi [etapa3-sprint-plan.md](etapa3-sprint-plan.md))  
**Phase:** F3.5 Negotiation FSM

---

## Table of Contents

1. [Overview](#1-overview)
2. [Worker #13: negotiation:state:transition](#2-worker-13-negotiationstateTransition)
3. [Worker #14: negotiation:cart:update](#3-worker-14-negotiationcartupdate)
4. [Worker #15: negotiation:summary:generate](#4-worker-15-negotiationsummarygenerate)
5. [State Machine Diagrams](#5-state-machine-diagrams)
6. [Database Triggers](#6-database-triggers)
7. [Monitoring & Alerts](#7-monitoring--alerts)

---

## 1. Overview

### 1.1 Purpose

Categoria D implementează **Finite State Machine (FSM)** pentru gestionarea ciclului complet de negociere comercială. Această categorie asigură:

- **Tranziții validate** - Doar tranziții permise între stări
- **Acțiuni contextuale** - Fiecare stare permite doar anumite acțiuni
- **Audit complet** - Toate tranzițiile sunt logged
- **Cart management** - Gestionare coș de produse în timp real
- **Summary generation** - Rapoarte pentru analiză

### 1.2 Worker Inventory

| # | Worker Name | Queue | Priority | Description |
|---|-------------|-------|----------|-------------|
| 13 | negotiation:state:transition | `negotiation:state:transition` | HIGH | Tranziție validată între stări |
| 14 | negotiation:cart:update | `negotiation:cart:update` | HIGH | Actualizare coș produse |
| 15 | negotiation:summary:generate | `negotiation:summary:generate` | MEDIUM | Generare sumar negociere |

### 1.3 Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CATEGORY D DEPENDENCIES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   UPSTREAM (requires):                                                       │
│   ├── ai:agent:orchestrate (C) → Triggers state transitions                 │
│   ├── product:stock:realtime-check (A) → Validates cart items               │
│   └── pricing:discount:calculate (E) → Applies discounts to cart            │
│                                                                              │
│   DOWNSTREAM (triggers):                                                     │
│   ├── oblio:proforma:create (G) → When entering CLOSING state               │
│   ├── oblio:invoice:create (G) → When entering INVOICED state               │
│   ├── doc:pdf:generate (I) → Summary PDFs                                   │
│   └── hitl:approval:request (N) → For discount approvals                    │
│                                                                              │
│   DATABASE:                                                                  │
│   ├── gold_negotiations → Primary state storage                             │
│   ├── negotiation_cart → Cart items                                         │
│   ├── negotiation_state_history → Audit trail                               │
│   ├── negotiation_cart_snapshots → Version history                          │
│   └── gold_products → Product catalog                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Worker #13: etapa3:negotiation:state:transition

### 2.1 Specification

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `etapa3:negotiation:state:transition` |
| **Concurrency** | 100 |
| **Timeout** | 5,000ms |
| **Retries** | 0 (No retries - state integrity) |
| **Priority** | HIGH |
| **Rate Limit** | None (validated per negotiation) |
| **Critical Path** | **YES** - Controls entire FSM |

### 2.2 Responsibility

Acest worker gestionează **toate tranzițiile de stare** pentru negocieri:

1. **Validare tranziție** - Verifică dacă tranziția este permisă
2. **Acțiuni pre-tranziție** - Execută validări suplimentare
3. **Actualizare stare** - Atomic update în database
4. **Side effects** - Trigger workers downstream
5. **Audit logging** - Înregistrează tranziția

### 2.3 State Definitions

```typescript
// /workers/negotiation/types.ts

/**
 * Negotiation States - XState inspired FSM
 */
export enum NegotiationState {
  // Initial States
  DISCOVERY = 'DISCOVERY',        // Client exploring products
  PROPOSAL = 'PROPOSAL',          // Products proposed to client
  
  // Negotiation States
  NEGOTIATION = 'NEGOTIATION',    // Active price/terms discussion
  
  // Closing States
  CLOSING = 'CLOSING',            // Preparing proforma
  PROFORMA_SENT = 'PROFORMA_SENT',
  PROFORMA_ACCEPTED = 'PROFORMA_ACCEPTED',
  
  // Invoice States
  INVOICED = 'INVOICED',          // Invoice created in Oblio
  EINVOICE_PENDING = 'EINVOICE_PENDING', // Waiting SPV submission
  EINVOICE_SENT = 'EINVOICE_SENT',       // Submitted to ANAF SPV
  
  // Final States
  PAID = 'PAID',
  COMPLETED = 'COMPLETED',
  
  // Terminal/Pause States
  DEAD = 'DEAD',                  // Lost opportunity
  ON_HOLD = 'ON_HOLD',            // Temporarily paused
}

/**
 * Sub-states for complex negotiations
 */
export enum NegotiationSubState {
  NONE = 'NONE',
  OBJECTION_PRICE = 'OBJECTION_PRICE',
  OBJECTION_FEATURE = 'OBJECTION_FEATURE',
  OBJECTION_TIMING = 'OBJECTION_TIMING',
  WAITING_CLIENT_DATA = 'WAITING_CLIENT_DATA',
  WAITING_MANAGER_APPROVAL = 'WAITING_MANAGER_APPROVAL',
  WAITING_PAYMENT = 'WAITING_PAYMENT',
}

/**
 * Valid state transitions matrix
 */
export const VALID_TRANSITIONS: Record<NegotiationState, NegotiationState[]> = {
  [NegotiationState.DISCOVERY]: [
    NegotiationState.PROPOSAL,
    NegotiationState.DEAD,
    NegotiationState.ON_HOLD,
  ],
  [NegotiationState.PROPOSAL]: [
    NegotiationState.NEGOTIATION,
    NegotiationState.CLOSING,
    NegotiationState.DISCOVERY,
    NegotiationState.DEAD,
  ],
  [NegotiationState.NEGOTIATION]: [
    NegotiationState.CLOSING,
    NegotiationState.PROPOSAL,
    NegotiationState.DEAD,
    NegotiationState.ON_HOLD,
  ],
  [NegotiationState.CLOSING]: [
    NegotiationState.PROFORMA_SENT,
    NegotiationState.NEGOTIATION,
    NegotiationState.DEAD,
  ],
  [NegotiationState.PROFORMA_SENT]: [
    NegotiationState.PROFORMA_ACCEPTED,
    NegotiationState.NEGOTIATION,
    NegotiationState.DEAD,
  ],
  [NegotiationState.PROFORMA_ACCEPTED]: [
    NegotiationState.INVOICED,
    NegotiationState.DEAD,
  ],
  [NegotiationState.INVOICED]: [
    NegotiationState.EINVOICE_PENDING,
    NegotiationState.EINVOICE_SENT,
  ],
  [NegotiationState.EINVOICE_PENDING]: [
    NegotiationState.EINVOICE_SENT,
  ],
  [NegotiationState.EINVOICE_SENT]: [
    NegotiationState.PAID,
    NegotiationState.DEAD,
  ],
  [NegotiationState.PAID]: [
    NegotiationState.COMPLETED,
  ],
  [NegotiationState.COMPLETED]: [],
  [NegotiationState.DEAD]: [
    NegotiationState.DISCOVERY, // Resurrection
  ],
  [NegotiationState.ON_HOLD]: [
    NegotiationState.DISCOVERY,
    NegotiationState.PROPOSAL,
    NegotiationState.NEGOTIATION,
    NegotiationState.DEAD,
  ],
};

/**
 * Allowed actions per state
 */
export const ALLOWED_ACTIONS: Record<NegotiationState, string[]> = {
  [NegotiationState.DISCOVERY]: [
    'search_products',
    'get_product_details',
  ],
  [NegotiationState.PROPOSAL]: [
    'search_products',
    'get_product_details',
    'check_realtime_stock',
    'add_to_cart',
    'remove_from_cart',
  ],
  [NegotiationState.NEGOTIATION]: [
    'calculate_discount',
    'check_realtime_stock',
    'update_cart',
    'apply_discount',
    'request_approval',
  ],
  [NegotiationState.CLOSING]: [
    'validate_client_data',
    'update_client_data',
    'create_proforma',
  ],
  [NegotiationState.PROFORMA_SENT]: [
    'send_reminder',
    'cancel_proforma',
    'view_proforma',
  ],
  [NegotiationState.PROFORMA_ACCEPTED]: [
    'convert_to_invoice',
  ],
  [NegotiationState.INVOICED]: [
    'send_einvoice',
    'view_invoice',
  ],
  [NegotiationState.EINVOICE_PENDING]: [
    'check_einvoice_status',
    'force_send_einvoice',
  ],
  [NegotiationState.EINVOICE_SENT]: [
    'mark_paid',
    'view_einvoice_status',
  ],
  [NegotiationState.PAID]: [
    'complete_negotiation',
    'generate_summary',
  ],
  [NegotiationState.COMPLETED]: [
    'view_summary',
  ],
  [NegotiationState.DEAD]: [
    'resurrect',
    'add_notes',
  ],
  [NegotiationState.ON_HOLD]: [
    'resume',
    'add_notes',
    'set_reminder',
  ],
};
```

### 2.4 Job Data Interface

```typescript
// /workers/negotiation/state-transition.worker.ts

import { z } from 'zod';

/**
 * Transition trigger sources
 */
export enum TransitionTrigger {
  AI_AGENT = 'AI_AGENT',           // AI decided to transition
  HUMAN_OVERRIDE = 'HUMAN_OVERRIDE', // Manual override
  SYSTEM_EVENT = 'SYSTEM_EVENT',   // Webhook or cron
  TIMEOUT = 'TIMEOUT',             // Inactivity timeout
}

/**
 * Job data schema with validation
 */
export const StateTransitionJobDataSchema = z.object({
  correlationId: z.string().uuid(),
  shopId: z.string().uuid(),
  negotiationId: z.string().uuid(),
  targetState: z.nativeEnum(NegotiationState),
  trigger: z.nativeEnum(TransitionTrigger),
  reason: z.string().max(500),
  metadata: z.record(z.any()).optional(),
  
  // For sub-state transitions
  targetSubState: z.nativeEnum(NegotiationSubState).optional(),
  
  // Override flags
  forceTransition: z.boolean().default(false), // Admin override
  skipValidation: z.boolean().default(false),  // Emergency only
  
  // Operator info
  operatorId: z.string().uuid().optional(),
  operatorRole: z.enum(['AI', 'USER', 'ADMIN', 'SYSTEM']).optional(),
});

export type StateTransitionJobData = z.infer<typeof StateTransitionJobDataSchema>;

/**
 * Result interface
 */
export interface StateTransitionResult {
  negotiationId: string;
  previousState: NegotiationState;
  newState: NegotiationState;
  previousSubState?: NegotiationSubState;
  newSubState?: NegotiationSubState;
  transitionValid: boolean;
  transitionReason: string;
  actionsNowAllowed: string[];
  triggeredSideEffects: string[];
  timestamp: string;
  historyId: string; // Reference to audit record
}
```

### 2.5 Worker Implementation

```typescript
// /workers/negotiation/state-transition.worker.ts

import { Job, Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { db } from '@cerniq/db';
import { 
  gold_negotiations, 
  negotiation_state_history,
  negotiation_cart_snapshots 
} from '@cerniq/db/schema';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '@cerniq/logger';
import { metricsClient } from '@cerniq/metrics';
import {
  NegotiationState,
  NegotiationSubState,
  VALID_TRANSITIONS,
  ALLOWED_ACTIONS,
} from './types';
import {
  StateTransitionJobData,
  StateTransitionJobDataSchema,
  StateTransitionResult,
  TransitionTrigger,
} from './schemas';

// Queues for downstream triggers
const oblioProformaQueue = new Queue('etapa3:oblio:proforma:create');
const oblioInvoiceQueue = new Queue('etapa3:oblio:invoice:create');
const einvoiceQueue = new Queue('etapa3:efactura:send');
const hitlApprovalQueue = new Queue('etapa3:hitl:approval:request');
const notificationQueue = new Queue('etapa3:notification:send');

/**
 * Validate transition is allowed
 */
function isValidTransition(
  currentState: NegotiationState,
  targetState: NegotiationState
): boolean {
  const allowedTargets = VALID_TRANSITIONS[currentState];
  return allowedTargets?.includes(targetState) ?? false;
}

/**
 * Pre-transition validation hooks
 */
async function validatePreTransition(
  negotiation: any,
  targetState: NegotiationState,
  logger: Logger
): Promise<{ valid: boolean; reason?: string }> {
  const currentState = negotiation.state as NegotiationState;

  // CLOSING requires cart items
  if (targetState === NegotiationState.CLOSING) {
    const cartItems = await db.query.negotiation_cart.findMany({
      where: (nc, { eq }) => eq(nc.negotiation_id, negotiation.id),
    });
    
    if (cartItems.length === 0) {
      return { valid: false, reason: 'Cannot close without products in cart' };
    }
  }

  // PROFORMA_SENT requires client data
  if (targetState === NegotiationState.PROFORMA_SENT) {
    if (!negotiation.client_cif || !negotiation.client_address) {
      return { valid: false, reason: 'Client CIF and address required for proforma' };
    }
  }

  // INVOICED requires accepted proforma
  if (targetState === NegotiationState.INVOICED) {
    if (!negotiation.proforma_ref) {
      return { valid: false, reason: 'Proforma reference required for invoice' };
    }
  }

  // EINVOICE_SENT requires invoice
  if (targetState === NegotiationState.EINVOICE_SENT) {
    if (!negotiation.invoice_ref) {
      return { valid: false, reason: 'Invoice reference required for e-Factura' };
    }
  }

  return { valid: true };
}

/**
 * Execute side effects after transition
 */
async function executeSideEffects(
  negotiation: any,
  previousState: NegotiationState,
  newState: NegotiationState,
  correlationId: string,
  logger: Logger
): Promise<string[]> {
  const effects: string[] = [];

  // CLOSING → PROFORMA_SENT: Create proforma
  if (newState === NegotiationState.PROFORMA_SENT) {
    await oblioProformaQueue.add('create', {
      correlationId,
      shopId: negotiation.shop_id,
      negotiationId: negotiation.id,
      clientCif: negotiation.client_cif,
      clientName: negotiation.client_name,
      clientAddress: negotiation.client_address,
    });
    effects.push('oblio:proforma:create');
    logger.info({ negotiationId: negotiation.id }, 'Triggered proforma creation');
  }

  // PROFORMA_ACCEPTED → INVOICED: Create invoice
  if (newState === NegotiationState.INVOICED) {
    await oblioInvoiceQueue.add('create', {
      correlationId,
      shopId: negotiation.shop_id,
      negotiationId: negotiation.id,
      proformaRef: negotiation.proforma_ref,
    });
    effects.push('oblio:invoice:create');
    logger.info({ negotiationId: negotiation.id }, 'Triggered invoice creation');
  }

  // INVOICED → EINVOICE_SENT: Send e-Factura
  if (newState === NegotiationState.EINVOICE_SENT) {
    await einvoiceQueue.add('send', {
      correlationId,
      shopId: negotiation.shop_id,
      negotiationId: negotiation.id,
      invoiceRef: negotiation.invoice_ref,
    });
    effects.push('efactura:send');
    logger.info({ negotiationId: negotiation.id }, 'Triggered e-Factura submission');
  }

  // Send notifications for state changes
  if ([
    NegotiationState.PROFORMA_SENT,
    NegotiationState.INVOICED,
    NegotiationState.PAID,
    NegotiationState.DEAD,
  ].includes(newState)) {
    await notificationQueue.add('state-change', {
      correlationId,
      shopId: negotiation.shop_id,
      negotiationId: negotiation.id,
      previousState,
      newState,
    });
    effects.push('notification:state-change');
  }

  return effects;
}

/**
 * Main processor function
 */
export async function stateTransitionProcessor(
  job: Job<StateTransitionJobData>,
  logger: Logger
): Promise<StateTransitionResult> {
  const startTime = Date.now();
  const data = StateTransitionJobDataSchema.parse(job.data);
  const { correlationId, shopId, negotiationId, targetState, trigger, reason } = data;

  logger.info({
    correlationId,
    negotiationId,
    targetState,
    trigger,
  }, 'Processing state transition');

  // Fetch current negotiation with lock
  const negotiation = await db.transaction(async (tx) => {
    const [neg] = await tx
      .select()
      .from(gold_negotiations)
      .where(
        and(
          eq(gold_negotiations.id, negotiationId),
          eq(gold_negotiations.shop_id, shopId)
        )
      )
      .for('update');

    return neg;
  });

  if (!negotiation) {
    throw new Error(`Negotiation ${negotiationId} not found`);
  }

  const currentState = negotiation.state as NegotiationState;
  const currentSubState = (negotiation.sub_state as NegotiationSubState) || NegotiationSubState.NONE;

  // Check if transition is valid
  const isValid = isValidTransition(currentState, targetState);
  
  if (!isValid && !data.forceTransition) {
    metricsClient.increment('negotiation_transitions_rejected_total', {
      from_state: currentState,
      target_state: targetState,
      reason: 'invalid_transition',
    });

    return {
      negotiationId,
      previousState: currentState,
      newState: currentState, // No change
      transitionValid: false,
      transitionReason: `Invalid transition from ${currentState} to ${targetState}`,
      actionsNowAllowed: ALLOWED_ACTIONS[currentState],
      triggeredSideEffects: [],
      timestamp: new Date().toISOString(),
      historyId: '',
    };
  }

  // Pre-transition validation
  if (!data.skipValidation) {
    const preValidation = await validatePreTransition(negotiation, targetState, logger);
    
    if (!preValidation.valid) {
      metricsClient.increment('negotiation_transitions_rejected_total', {
        from_state: currentState,
        target_state: targetState,
        reason: 'pre_validation_failed',
      });

      return {
        negotiationId,
        previousState: currentState,
        newState: currentState,
        transitionValid: false,
        transitionReason: preValidation.reason || 'Pre-transition validation failed',
        actionsNowAllowed: ALLOWED_ACTIONS[currentState],
        triggeredSideEffects: [],
        timestamp: new Date().toISOString(),
        historyId: '',
      };
    }
  }

  // Create cart snapshot before transition
  const cartSnapshot = await db.query.negotiation_cart.findMany({
    where: (nc, { eq }) => eq(nc.negotiation_id, negotiationId),
  });

  // Execute transition atomically
  const result = await db.transaction(async (tx) => {
    // Update negotiation state
    const [updated] = await tx
      .update(gold_negotiations)
      .set({
        state: targetState,
        sub_state: data.targetSubState || NegotiationSubState.NONE,
        state_changed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(gold_negotiations.id, negotiationId))
      .returning();

    // Create history record
    const [history] = await tx
      .insert(negotiation_state_history)
      .values({
        negotiation_id: negotiationId,
        shop_id: shopId,
        from_state: currentState,
        to_state: targetState,
        from_sub_state: currentSubState,
        to_sub_state: data.targetSubState || NegotiationSubState.NONE,
        trigger,
        reason,
        operator_id: data.operatorId,
        operator_role: data.operatorRole || 'SYSTEM',
        metadata: data.metadata || {},
        created_at: new Date(),
      })
      .returning();

    // Save cart snapshot
    if (cartSnapshot.length > 0) {
      await tx.insert(negotiation_cart_snapshots).values({
        negotiation_id: negotiationId,
        state_history_id: history.id,
        cart_items: cartSnapshot,
        total_value: cartSnapshot.reduce((sum, item) => 
          sum + (Number(item.unit_price) * Number(item.quantity)), 0),
        created_at: new Date(),
      });
    }

    return { updated, history };
  });

  // Execute side effects
  const sideEffects = await executeSideEffects(
    { ...negotiation, state: targetState },
    currentState,
    targetState,
    correlationId,
    logger
  );

  // Record metrics
  const duration = Date.now() - startTime;
  metricsClient.histogram('negotiation_transition_duration_ms', duration, {
    from_state: currentState,
    to_state: targetState,
  });
  metricsClient.increment('negotiation_transitions_total', {
    from_state: currentState,
    to_state: targetState,
    trigger,
  });

  logger.info({
    correlationId,
    negotiationId,
    previousState: currentState,
    newState: targetState,
    duration,
    sideEffects,
  }, 'State transition completed');

  return {
    negotiationId,
    previousState: currentState,
    newState: targetState,
    previousSubState: currentSubState,
    newSubState: data.targetSubState || NegotiationSubState.NONE,
    transitionValid: true,
    transitionReason: reason,
    actionsNowAllowed: ALLOWED_ACTIONS[targetState],
    triggeredSideEffects: sideEffects,
    timestamp: new Date().toISOString(),
    historyId: result.history.id,
  };
}

/**
 * Create worker instance
 */
export function createStateTransitionWorker(redis: Redis): Worker {
  const logger = createLogger('negotiation:state:transition');

  return new Worker(
    'negotiation:state:transition',
    async (job) => stateTransitionProcessor(job, logger),
    {
      connection: redis,
      concurrency: 100,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    }
  );
}
```


---

## 3. Worker #14: etapa3:negotiation:cart:update

### 3.1 Specification

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `etapa3:negotiation:cart:update` |
| **Concurrency** | 100 |
| **Timeout** | 10,000ms |
| **Retries** | 2 (with exponential backoff) |
| **Priority** | HIGH |
| **Rate Limit** | None |
| **Critical Path** | **YES** - Affects pricing accuracy |

### 3.2 Responsibility

Acest worker gestionează **coșul de produse** din negociere:

1. **Add items** - Adaugă produse cu validare stoc
2. **Remove items** - Șterge produse din coș
3. **Update quantities** - Modifică cantități
4. **Apply discounts** - Aplică discount-uri validate
5. **Recalculate totals** - Recalculare automată
6. **Snapshot creation** - Versioning pentru audit

### 3.3 Job Data Interface

```typescript
// /workers/negotiation/cart-update.worker.ts

import { z } from 'zod';

/**
 * Cart operation types
 */
export enum CartOperation {
  ADD_ITEM = 'ADD_ITEM',
  REMOVE_ITEM = 'REMOVE_ITEM',
  UPDATE_QUANTITY = 'UPDATE_QUANTITY',
  APPLY_DISCOUNT = 'APPLY_DISCOUNT',
  CLEAR_CART = 'CLEAR_CART',
  REPLACE_CART = 'REPLACE_CART',
}

/**
 * Cart item schema
 */
export const CartItemSchema = z.object({
  sku: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive().optional(), // Auto-fetched if not provided
  discountPercent: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type CartItem = z.infer<typeof CartItemSchema>;

/**
 * Job data schema
 */
export const CartUpdateJobDataSchema = z.object({
  correlationId: z.string().uuid(),
  shopId: z.string().uuid(),
  negotiationId: z.string().uuid(),
  operation: z.nativeEnum(CartOperation),
  
  // For ADD/UPDATE operations
  item: CartItemSchema.optional(),
  
  // For REMOVE operation
  skuToRemove: z.string().optional(),
  
  // For APPLY_DISCOUNT operation
  discountRequest: z.object({
    sku: z.string(),
    discountPercent: z.number(),
    approved: z.boolean().default(false),
    approvedBy: z.string().optional(),
  }).optional(),
  
  // For REPLACE_CART operation
  newCart: z.array(CartItemSchema).optional(),
  
  // Validation options
  validateStock: z.boolean().default(true),
  validatePrice: z.boolean().default(true),
  
  // Operator
  operatorId: z.string().uuid().optional(),
});

export type CartUpdateJobData = z.infer<typeof CartUpdateJobDataSchema>;

/**
 * Result interface
 */
export interface CartUpdateResult {
  negotiationId: string;
  operation: CartOperation;
  success: boolean;
  items: Array<{
    sku: string;
    productTitle: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    lineTotal: number;
    stockAvailable: number;
    stockVerified: boolean;
    warnings: string[];
  }>;
  summary: {
    itemCount: number;
    subtotal: number;
    totalDiscount: number;
    grandTotal: number;
    currency: string;
  };
  validation: {
    allStockAvailable: boolean;
    allPricesValid: boolean;
    warnings: string[];
    errors: string[];
  };
  snapshotId?: string;
}
```

### 3.4 Worker Implementation

```typescript
// /workers/negotiation/cart-update.worker.ts

import { Job, Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { db } from '@cerniq/db';
import { 
  gold_negotiations, 
  negotiation_cart,
  negotiation_cart_snapshots,
  gold_products 
} from '@cerniq/db/schema';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '@cerniq/logger';
import { metricsClient } from '@cerniq/metrics';
import {
  CartUpdateJobData,
  CartUpdateJobDataSchema,
  CartUpdateResult,
  CartOperation,
  CartItem,
} from './schemas';

// Queue for stock checks
const stockCheckQueue = new Queue('product:stock:realtime-check');
const priceValidateQueue = new Queue('product:price:validate');

/**
 * Verify stock availability
 */
async function verifyStock(
  shopId: string,
  sku: string,
  quantity: number,
  correlationId: string
): Promise<{ available: number; canFulfill: boolean; warning?: string }> {
  const job = await stockCheckQueue.add('check', {
    correlationId,
    shopId,
    sku,
    requestedQuantity: quantity,
  }, { 
    removeOnComplete: true,
    removeOnFail: true,
  });

  const result = await job.waitUntilFinished(stockCheckQueue.events, 10000);
  return result;
}

/**
 * Validate and get product price
 */
async function getProductPrice(
  shopId: string,
  sku: string
): Promise<{ price: number; costPrice: number; maxDiscount: number } | null> {
  const product = await db.query.gold_products.findFirst({
    where: (gp, { and, eq }) => and(
      eq(gp.shop_id, shopId),
      eq(gp.sku, sku)
    ),
  });

  if (!product) return null;

  return {
    price: Number(product.price),
    costPrice: Number(product.cost_price) || Number(product.price) * 0.6,
    maxDiscount: Number(product.max_discount_percent) || 20,
  };
}

/**
 * Calculate line item totals
 */
function calculateLineItem(
  quantity: number,
  unitPrice: number,
  discountPercent: number
): { discountAmount: number; lineTotal: number } {
  const subtotal = quantity * unitPrice;
  const discountAmount = subtotal * (discountPercent / 100);
  const lineTotal = subtotal - discountAmount;
  
  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    lineTotal: Math.round(lineTotal * 100) / 100,
  };
}

/**
 * Main processor function
 */
export async function cartUpdateProcessor(
  job: Job<CartUpdateJobData>,
  logger: Logger
): Promise<CartUpdateResult> {
  const startTime = Date.now();
  const data = CartUpdateJobDataSchema.parse(job.data);
  const { correlationId, shopId, negotiationId, operation } = data;

  logger.info({
    correlationId,
    negotiationId,
    operation,
  }, 'Processing cart update');

  // Verify negotiation exists and is in valid state
  const negotiation = await db.query.gold_negotiations.findFirst({
    where: (gn, { and, eq }) => and(
      eq(gn.id, negotiationId),
      eq(gn.shop_id, shopId)
    ),
  });

  if (!negotiation) {
    throw new Error(`Negotiation ${negotiationId} not found`);
  }

  // Only allow cart updates in certain states
  const allowedStates = ['PROPOSAL', 'NEGOTIATION'];
  if (!allowedStates.includes(negotiation.state)) {
    return {
      negotiationId,
      operation,
      success: false,
      items: [],
      summary: { itemCount: 0, subtotal: 0, totalDiscount: 0, grandTotal: 0, currency: 'RON' },
      validation: {
        allStockAvailable: false,
        allPricesValid: false,
        warnings: [],
        errors: [`Cannot update cart in ${negotiation.state} state`],
      },
    };
  }

  // Execute operation
  let result: CartUpdateResult;
  
  switch (operation) {
    case CartOperation.ADD_ITEM:
      result = await handleAddItem(data, negotiation, logger);
      break;
    case CartOperation.REMOVE_ITEM:
      result = await handleRemoveItem(data, negotiation, logger);
      break;
    case CartOperation.UPDATE_QUANTITY:
      result = await handleUpdateQuantity(data, negotiation, logger);
      break;
    case CartOperation.APPLY_DISCOUNT:
      result = await handleApplyDiscount(data, negotiation, logger);
      break;
    case CartOperation.CLEAR_CART:
      result = await handleClearCart(data, negotiation, logger);
      break;
    case CartOperation.REPLACE_CART:
      result = await handleReplaceCart(data, negotiation, logger);
      break;
    default:
      throw new Error(`Unknown cart operation: ${operation}`);
  }

  // Record metrics
  const duration = Date.now() - startTime;
  metricsClient.histogram('cart_update_duration_ms', duration, { operation });
  metricsClient.increment('cart_updates_total', { operation, success: String(result.success) });

  logger.info({
    correlationId,
    negotiationId,
    operation,
    success: result.success,
    itemCount: result.summary.itemCount,
    grandTotal: result.summary.grandTotal,
    duration,
  }, 'Cart update completed');

  return result;
}

/**
 * Handle ADD_ITEM operation
 */
async function handleAddItem(
  data: CartUpdateJobData,
  negotiation: any,
  logger: Logger
): Promise<CartUpdateResult> {
  const { correlationId, shopId, negotiationId, item, validateStock, validatePrice } = data;

  if (!item) {
    throw new Error('Item required for ADD_ITEM operation');
  }

  // Get product details
  const product = await db.query.gold_products.findFirst({
    where: (gp, { and, eq }) => and(
      eq(gp.shop_id, shopId),
      eq(gp.sku, item.sku)
    ),
  });

  if (!product) {
    return createErrorResult(negotiationId, CartOperation.ADD_ITEM, 
      `Product ${item.sku} not found`);
  }

  // Validate stock
  let stockResult = { available: 999, canFulfill: true, warning: undefined as string | undefined };
  if (validateStock) {
    stockResult = await verifyStock(shopId, item.sku, item.quantity, correlationId);
    if (!stockResult.canFulfill) {
      return createErrorResult(negotiationId, CartOperation.ADD_ITEM,
        `Insufficient stock for ${item.sku}: requested ${item.quantity}, available ${stockResult.available}`);
    }
  }

  // Use provided price or fetch from product
  const unitPrice = item.unitPrice || Number(product.price);
  const discountPercent = item.discountPercent || 0;

  // Validate discount doesn't exceed max
  const maxDiscount = Number(product.max_discount_percent) || 20;
  if (discountPercent > maxDiscount) {
    return createErrorResult(negotiationId, CartOperation.ADD_ITEM,
      `Discount ${discountPercent}% exceeds maximum ${maxDiscount}% for ${item.sku}`);
  }

  // Check if item already in cart
  const existingItem = await db.query.negotiation_cart.findFirst({
    where: (nc, { and, eq }) => and(
      eq(nc.negotiation_id, negotiationId),
      eq(nc.sku, item.sku)
    ),
  });

  if (existingItem) {
    // Update quantity instead of adding duplicate
    const newQuantity = Number(existingItem.quantity) + item.quantity;
    
    // Re-validate stock for total quantity
    if (validateStock) {
      stockResult = await verifyStock(shopId, item.sku, newQuantity, correlationId);
      if (!stockResult.canFulfill) {
        return createErrorResult(negotiationId, CartOperation.ADD_ITEM,
          `Insufficient stock for total quantity: ${newQuantity}, available ${stockResult.available}`);
      }
    }

    await db
      .update(negotiation_cart)
      .set({
        quantity: newQuantity,
        updated_at: new Date(),
      })
      .where(eq(negotiation_cart.id, existingItem.id));
  } else {
    // Insert new cart item
    await db.insert(negotiation_cart).values({
      negotiation_id: negotiationId,
      shop_id: shopId,
      sku: item.sku,
      product_id: product.id,
      product_title: product.title,
      quantity: item.quantity,
      unit_price: unitPrice,
      discount_percent: discountPercent,
      notes: item.notes,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // Return full cart state
  return await buildCartResult(negotiationId, shopId, CartOperation.ADD_ITEM, correlationId, logger);
}

/**
 * Handle REMOVE_ITEM operation
 */
async function handleRemoveItem(
  data: CartUpdateJobData,
  negotiation: any,
  logger: Logger
): Promise<CartUpdateResult> {
  const { shopId, negotiationId, skuToRemove, correlationId } = data;

  if (!skuToRemove) {
    throw new Error('skuToRemove required for REMOVE_ITEM operation');
  }

  const deleted = await db
    .delete(negotiation_cart)
    .where(and(
      eq(negotiation_cart.negotiation_id, negotiationId),
      eq(negotiation_cart.sku, skuToRemove)
    ))
    .returning();

  if (deleted.length === 0) {
    return createErrorResult(negotiationId, CartOperation.REMOVE_ITEM,
      `Item ${skuToRemove} not found in cart`);
  }

  return await buildCartResult(negotiationId, shopId, CartOperation.REMOVE_ITEM, correlationId, logger);
}

/**
 * Handle UPDATE_QUANTITY operation
 */
async function handleUpdateQuantity(
  data: CartUpdateJobData,
  negotiation: any,
  logger: Logger
): Promise<CartUpdateResult> {
  const { correlationId, shopId, negotiationId, item, validateStock } = data;

  if (!item) {
    throw new Error('Item required for UPDATE_QUANTITY operation');
  }

  const existingItem = await db.query.negotiation_cart.findFirst({
    where: (nc, { and, eq }) => and(
      eq(nc.negotiation_id, negotiationId),
      eq(nc.sku, item.sku)
    ),
  });

  if (!existingItem) {
    return createErrorResult(negotiationId, CartOperation.UPDATE_QUANTITY,
      `Item ${item.sku} not found in cart`);
  }

  // Validate stock
  if (validateStock) {
    const stockResult = await verifyStock(shopId, item.sku, item.quantity, correlationId);
    if (!stockResult.canFulfill) {
      return createErrorResult(negotiationId, CartOperation.UPDATE_QUANTITY,
        `Insufficient stock: requested ${item.quantity}, available ${stockResult.available}`);
    }
  }

  await db
    .update(negotiation_cart)
    .set({
      quantity: item.quantity,
      updated_at: new Date(),
    })
    .where(eq(negotiation_cart.id, existingItem.id));

  return await buildCartResult(negotiationId, shopId, CartOperation.UPDATE_QUANTITY, correlationId, logger);
}

/**
 * Handle APPLY_DISCOUNT operation
 */
async function handleApplyDiscount(
  data: CartUpdateJobData,
  negotiation: any,
  logger: Logger
): Promise<CartUpdateResult> {
  const { shopId, negotiationId, discountRequest, correlationId } = data;

  if (!discountRequest) {
    throw new Error('discountRequest required for APPLY_DISCOUNT operation');
  }

  const { sku, discountPercent, approved, approvedBy } = discountRequest;

  // Find cart item
  const existingItem = await db.query.negotiation_cart.findFirst({
    where: (nc, { and, eq }) => and(
      eq(nc.negotiation_id, negotiationId),
      eq(nc.sku, sku)
    ),
  });

  if (!existingItem) {
    return createErrorResult(negotiationId, CartOperation.APPLY_DISCOUNT,
      `Item ${sku} not found in cart`);
  }

  // Get product for max discount
  const product = await db.query.gold_products.findFirst({
    where: (gp, { eq }) => eq(gp.id, existingItem.product_id),
  });

  const maxDiscount = Number(product?.max_discount_percent) || 20;
  const approvalThreshold = 15; // Requires manager for >15%

  // Validate discount
  if (discountPercent > maxDiscount) {
    return createErrorResult(negotiationId, CartOperation.APPLY_DISCOUNT,
      `Discount ${discountPercent}% exceeds maximum ${maxDiscount}%`);
  }

  // Check if approval required
  if (discountPercent > approvalThreshold && !approved) {
    return {
      negotiationId,
      operation: CartOperation.APPLY_DISCOUNT,
      success: false,
      items: [],
      summary: { itemCount: 0, subtotal: 0, totalDiscount: 0, grandTotal: 0, currency: 'RON' },
      validation: {
        allStockAvailable: true,
        allPricesValid: true,
        warnings: [`Discount ${discountPercent}% requires manager approval`],
        errors: [],
      },
    };
  }

  // Apply discount
  await db
    .update(negotiation_cart)
    .set({
      discount_percent: discountPercent,
      discount_approved: approved,
      discount_approved_by: approvedBy,
      discount_approved_at: approved ? new Date() : null,
      updated_at: new Date(),
    })
    .where(eq(negotiation_cart.id, existingItem.id));

  logger.info({
    negotiationId,
    sku,
    discountPercent,
    approved,
    approvedBy,
  }, 'Discount applied');

  return await buildCartResult(negotiationId, shopId, CartOperation.APPLY_DISCOUNT, correlationId, logger);
}

/**
 * Handle CLEAR_CART operation
 */
async function handleClearCart(
  data: CartUpdateJobData,
  negotiation: any,
  logger: Logger
): Promise<CartUpdateResult> {
  const { shopId, negotiationId, correlationId } = data;

  // Create snapshot before clearing
  const currentItems = await db.query.negotiation_cart.findMany({
    where: (nc, { eq }) => eq(nc.negotiation_id, negotiationId),
  });

  if (currentItems.length > 0) {
    await db.insert(negotiation_cart_snapshots).values({
      negotiation_id: negotiationId,
      cart_items: currentItems,
      total_value: currentItems.reduce((sum, item) => 
        sum + (Number(item.unit_price) * Number(item.quantity)), 0),
      snapshot_reason: 'CLEAR_CART',
      created_at: new Date(),
    });
  }

  // Delete all items
  await db
    .delete(negotiation_cart)
    .where(eq(negotiation_cart.negotiation_id, negotiationId));

  return {
    negotiationId,
    operation: CartOperation.CLEAR_CART,
    success: true,
    items: [],
    summary: {
      itemCount: 0,
      subtotal: 0,
      totalDiscount: 0,
      grandTotal: 0,
      currency: 'RON',
    },
    validation: {
      allStockAvailable: true,
      allPricesValid: true,
      warnings: [],
      errors: [],
    },
  };
}

/**
 * Handle REPLACE_CART operation
 */
async function handleReplaceCart(
  data: CartUpdateJobData,
  negotiation: any,
  logger: Logger
): Promise<CartUpdateResult> {
  const { correlationId, shopId, negotiationId, newCart } = data;

  if (!newCart || newCart.length === 0) {
    return handleClearCart(data, negotiation, logger);
  }

  // Clear and rebuild
  await handleClearCart(data, negotiation, logger);

  // Add each item
  for (const item of newCart) {
    await handleAddItem({
      ...data,
      item,
      operation: CartOperation.ADD_ITEM,
    }, negotiation, logger);
  }

  return await buildCartResult(negotiationId, shopId, CartOperation.REPLACE_CART, correlationId, logger);
}

/**
 * Build full cart result
 */
async function buildCartResult(
  negotiationId: string,
  shopId: string,
  operation: CartOperation,
  correlationId: string,
  logger: Logger
): Promise<CartUpdateResult> {
  const cartItems = await db.query.negotiation_cart.findMany({
    where: (nc, { eq }) => eq(nc.negotiation_id, negotiationId),
  });

  const warnings: string[] = [];
  const errors: string[] = [];
  let allStockAvailable = true;
  let allPricesValid = true;

  const items = await Promise.all(cartItems.map(async (item) => {
    // Verify stock
    let stockAvailable = 999;
    let stockVerified = false;
    
    try {
      const stockResult = await verifyStock(shopId, item.sku, Number(item.quantity), correlationId);
      stockAvailable = stockResult.available;
      stockVerified = true;
      
      if (!stockResult.canFulfill) {
        allStockAvailable = false;
        warnings.push(`Low stock for ${item.sku}: ${stockAvailable} available, ${item.quantity} in cart`);
      }
    } catch (err) {
      warnings.push(`Could not verify stock for ${item.sku}`);
    }

    const itemWarnings: string[] = [];
    if (stockAvailable < Number(item.quantity)) {
      itemWarnings.push(`Stock: ${stockAvailable} < requested: ${item.quantity}`);
    }

    const { discountAmount, lineTotal } = calculateLineItem(
      Number(item.quantity),
      Number(item.unit_price),
      Number(item.discount_percent) || 0
    );

    return {
      sku: item.sku,
      productTitle: item.product_title || item.sku,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      discountPercent: Number(item.discount_percent) || 0,
      discountAmount,
      lineTotal,
      stockAvailable,
      stockVerified,
      warnings: itemWarnings,
    };
  }));

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    negotiationId,
    operation,
    success: true,
    items,
    summary: {
      itemCount: items.length,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      currency: 'RON',
    },
    validation: {
      allStockAvailable,
      allPricesValid,
      warnings,
      errors,
    },
  };
}

/**
 * Create error result
 */
function createErrorResult(
  negotiationId: string,
  operation: CartOperation,
  error: string
): CartUpdateResult {
  return {
    negotiationId,
    operation,
    success: false,
    items: [],
    summary: {
      itemCount: 0,
      subtotal: 0,
      totalDiscount: 0,
      grandTotal: 0,
      currency: 'RON',
    },
    validation: {
      allStockAvailable: false,
      allPricesValid: false,
      warnings: [],
      errors: [error],
    },
  };
}

/**
 * Create worker instance
 */
export function createCartUpdateWorker(redis: Redis): Worker {
  const logger = createLogger('negotiation:cart:update');

  return new Worker(
    'negotiation:cart:update',
    async (job) => cartUpdateProcessor(job, logger),
    {
      connection: redis,
      concurrency: 100,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    }
  );
}
```


---

## 4. Worker #15: etapa3:negotiation:summary:generate

### 4.1 Specification

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `etapa3:negotiation:summary:generate` |
| **Concurrency** | 20 |
| **Timeout** | 30,000ms |
| **Retries** | 3 (with exponential backoff) |
| **Priority** | LOW |
| **Rate Limit** | 60/min (LLM calls) |

### 4.2 Responsibility

Acest worker generează **sumare de negociere** pentru:

1. **Rapoarte interne** - Analytics și performanță
2. **Handover** - Transfer către human agent
3. **Client summaries** - Rezumate pentru client
4. **Audit trails** - Documentație completă

### 4.3 Job Data Interface

```typescript
// /workers/negotiation/summary-generate.worker.ts

import { z } from 'zod';

/**
 * Summary types
 */
export enum SummaryType {
  INTERNAL = 'INTERNAL',       // For sales team
  HANDOVER = 'HANDOVER',       // For human agent takeover
  CLIENT = 'CLIENT',           // For client
  AUDIT = 'AUDIT',             // Full audit trail
}

/**
 * Summary format
 */
export enum SummaryFormat {
  TEXT = 'TEXT',               // Plain text
  HTML = 'HTML',               // HTML formatted
  PDF = 'PDF',                 // Generate PDF
  JSON = 'JSON',               // Structured data
}

/**
 * Job data schema
 */
export const SummaryGenerateJobDataSchema = z.object({
  correlationId: z.string().uuid(),
  shopId: z.string().uuid(),
  negotiationId: z.string().uuid(),
  summaryType: z.nativeEnum(SummaryType),
  format: z.nativeEnum(SummaryFormat).default(SummaryFormat.TEXT),
  
  // Optional filtering
  includeHistory: z.boolean().default(true),
  includeCart: z.boolean().default(true),
  includeMessages: z.boolean().default(true),
  includeFiscal: z.boolean().default(false),
  
  // For AI-generated summaries
  useAI: z.boolean().default(true),
  maxTokens: z.number().default(2000),
  
  // Output options
  generatePDF: z.boolean().default(false),
  sendToClient: z.boolean().default(false),
});

export type SummaryGenerateJobData = z.infer<typeof SummaryGenerateJobDataSchema>;

/**
 * Result interface
 */
export interface SummaryGenerateResult {
  negotiationId: string;
  summaryType: SummaryType;
  format: SummaryFormat;
  
  // Summary content
  summary: {
    title: string;
    createdAt: string;
    
    // Overview
    overview: {
      status: string;
      startDate: string;
      lastActivity: string;
      durationDays: number;
      stateChanges: number;
    };
    
    // Client info
    client: {
      name: string;
      cif?: string;
      email?: string;
      phone?: string;
    };
    
    // Cart summary
    cart?: {
      items: Array<{
        sku: string;
        title: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        total: number;
      }>;
      subtotal: number;
      discount: number;
      grandTotal: number;
    };
    
    // Key events
    timeline: Array<{
      timestamp: string;
      event: string;
      details?: string;
    }>;
    
    // AI-generated insights
    insights?: {
      summary: string;
      keyDecisions: string[];
      recommendations: string[];
      riskFactors: string[];
    };
    
    // Fiscal documents
    fiscal?: {
      proformaRef?: string;
      proformaDate?: string;
      invoiceRef?: string;
      invoiceDate?: string;
      einvoiceStatus?: string;
    };
  };
  
  // Output files
  pdfUrl?: string;
  htmlContent?: string;
  
  // Metadata
  generatedAt: string;
  processingTimeMs: number;
}
```

### 4.4 Worker Implementation

```typescript
// /workers/negotiation/summary-generate.worker.ts

import { Job, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { db } from '@cerniq/db';
import { 
  gold_negotiations, 
  negotiation_cart,
  negotiation_state_history,
  negotiation_messages,
  oblio_documents,
} from '@cerniq/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createLogger } from '@cerniq/logger';
import { metricsClient } from '@cerniq/metrics';
import { OpenAI } from 'openai';
import {
  SummaryGenerateJobData,
  SummaryGenerateJobDataSchema,
  SummaryGenerateResult,
  SummaryType,
  SummaryFormat,
} from './schemas';

// OpenAI client for AI summaries
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate AI insights using LLM
 */
async function generateAIInsights(
  negotiation: any,
  history: any[],
  messages: any[],
  logger: Logger
): Promise<{
  summary: string;
  keyDecisions: string[];
  recommendations: string[];
  riskFactors: string[];
} | null> {
  try {
    // Prepare context
    const context = `
Negotiation Overview:
- Client: ${negotiation.client_name || 'Unknown'}
- Status: ${negotiation.state}
- Started: ${negotiation.created_at}
- Duration: ${Math.ceil((Date.now() - new Date(negotiation.created_at).getTime()) / 86400000)} days

State History:
${history.map(h => `- ${h.created_at}: ${h.from_state} → ${h.to_state} (${h.reason})`).join('\n')}

Recent Messages (last 10):
${messages.slice(-10).map(m => `- [${m.role}]: ${m.content.substring(0, 200)}...`).join('\n')}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Ești un analist de vânzări care generează rezumate pentru negocieri B2B.
Răspunde în română cu insights structurate și actionabile.
Format JSON: { "summary": "...", "keyDecisions": [...], "recommendations": [...], "riskFactors": [...] }`,
        },
        {
          role: 'user',
          content: `Analizează această negociere și generează insights:\n\n${context}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) return null;

    return JSON.parse(content);
  } catch (error) {
    logger.error({ error }, 'Failed to generate AI insights');
    return null;
  }
}

/**
 * Build timeline from history
 */
function buildTimeline(history: any[], messages: any[]): Array<{
  timestamp: string;
  event: string;
  details?: string;
}> {
  const timeline: Array<{ timestamp: string; event: string; details?: string }> = [];

  // Add state changes
  for (const h of history) {
    timeline.push({
      timestamp: h.created_at.toISOString(),
      event: `State: ${h.from_state} → ${h.to_state}`,
      details: h.reason,
    });
  }

  // Add key messages
  const keyMessages = messages.filter(m => 
    m.role === 'client' || 
    m.content.toLowerCase().includes('proforma') ||
    m.content.toLowerCase().includes('factură') ||
    m.content.toLowerCase().includes('plată')
  );

  for (const m of keyMessages.slice(-20)) {
    timeline.push({
      timestamp: m.created_at.toISOString(),
      event: `Message from ${m.role}`,
      details: m.content.substring(0, 100),
    });
  }

  // Sort by timestamp
  timeline.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return timeline;
}

/**
 * Main processor function
 */
export async function summaryGenerateProcessor(
  job: Job<SummaryGenerateJobData>,
  logger: Logger
): Promise<SummaryGenerateResult> {
  const startTime = Date.now();
  const data = SummaryGenerateJobDataSchema.parse(job.data);
  const { correlationId, shopId, negotiationId, summaryType, format } = data;

  logger.info({
    correlationId,
    negotiationId,
    summaryType,
    format,
  }, 'Generating negotiation summary');

  // Fetch negotiation
  const negotiation = await db.query.gold_negotiations.findFirst({
    where: (gn, { and, eq }) => and(
      eq(gn.id, negotiationId),
      eq(gn.shop_id, shopId)
    ),
  });

  if (!negotiation) {
    throw new Error(`Negotiation ${negotiationId} not found`);
  }

  // Fetch related data
  const [cart, history, messages, fiscal] = await Promise.all([
    data.includeCart ? db.query.negotiation_cart.findMany({
      where: (nc, { eq }) => eq(nc.negotiation_id, negotiationId),
    }) : Promise.resolve([]),
    
    data.includeHistory ? db.query.negotiation_state_history.findMany({
      where: (nsh, { eq }) => eq(nsh.negotiation_id, negotiationId),
      orderBy: (nsh, { asc }) => [asc(nsh.created_at)],
    }) : Promise.resolve([]),
    
    data.includeMessages ? db.query.negotiation_messages.findMany({
      where: (nm, { eq }) => eq(nm.negotiation_id, negotiationId),
      orderBy: (nm, { asc }) => [asc(nm.created_at)],
      limit: 100,
    }) : Promise.resolve([]),
    
    data.includeFiscal ? db.query.oblio_documents.findMany({
      where: (od, { eq }) => eq(od.negotiation_id, negotiationId),
    }) : Promise.resolve([]),
  ]);

  // Build cart summary
  let cartSummary;
  if (cart.length > 0) {
    const items = cart.map(item => ({
      sku: item.sku,
      title: item.product_title || item.sku,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      discount: Number(item.discount_percent) || 0,
      total: Number(item.quantity) * Number(item.unit_price) * 
        (1 - (Number(item.discount_percent) || 0) / 100),
    }));

    const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const discount = items.reduce((sum, i) => 
      sum + (i.quantity * i.unitPrice * i.discount / 100), 0);
    const grandTotal = subtotal - discount;

    cartSummary = {
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  }

  // Build timeline
  const timeline = buildTimeline(history, messages);

  // Generate AI insights if requested
  let insights;
  if (data.useAI && summaryType !== SummaryType.AUDIT) {
    insights = await generateAIInsights(negotiation, history, messages, logger);
  }

  // Build fiscal summary
  let fiscalSummary;
  if (fiscal.length > 0) {
    const proforma = fiscal.find(d => d.document_type === 'proforma');
    const invoice = fiscal.find(d => d.document_type === 'invoice');
    const einvoice = fiscal.find(d => d.document_type === 'einvoice');

    fiscalSummary = {
      proformaRef: proforma?.oblio_ref,
      proformaDate: proforma?.created_at?.toISOString(),
      invoiceRef: invoice?.oblio_ref,
      invoiceDate: invoice?.created_at?.toISOString(),
      einvoiceStatus: einvoice?.status,
    };
  }

  // Calculate duration
  const durationMs = Date.now() - new Date(negotiation.created_at).getTime();
  const durationDays = Math.ceil(durationMs / 86400000);

  // Build final summary
  const summary: SummaryGenerateResult['summary'] = {
    title: `Negotiation Summary - ${negotiation.client_name || 'Unknown Client'}`,
    createdAt: new Date().toISOString(),
    
    overview: {
      status: negotiation.state,
      startDate: negotiation.created_at.toISOString(),
      lastActivity: negotiation.updated_at.toISOString(),
      durationDays,
      stateChanges: history.length,
    },
    
    client: {
      name: negotiation.client_name || 'Unknown',
      cif: negotiation.client_cif,
      email: negotiation.client_email,
      phone: negotiation.client_phone,
    },
    
    cart: cartSummary,
    timeline,
    insights: insights || undefined,
    fiscal: fiscalSummary,
  };

  const processingTimeMs = Date.now() - startTime;

  // Record metrics
  metricsClient.histogram('summary_generation_duration_ms', processingTimeMs, {
    summary_type: summaryType,
    format,
  });
  metricsClient.increment('summaries_generated_total', {
    summary_type: summaryType,
    format,
  });

  logger.info({
    correlationId,
    negotiationId,
    summaryType,
    processingTimeMs,
    hasInsights: !!insights,
  }, 'Summary generated');

  return {
    negotiationId,
    summaryType,
    format,
    summary,
    generatedAt: new Date().toISOString(),
    processingTimeMs,
  };
}

/**
 * Create worker instance
 */
export function createSummaryGenerateWorker(redis: Redis): Worker {
  const logger = createLogger('negotiation:summary:generate');

  return new Worker(
    'negotiation:summary:generate',
    async (job) => summaryGenerateProcessor(job, logger),
    {
      connection: redis,
      concurrency: 20,
      limiter: {
        max: 60,
        duration: 60000, // 60 per minute (LLM rate limiting)
      },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
    }
  );
}
```

---

## 5. State Machine Diagrams

### 5.1 Main State Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    NEGOTIATION STATE MACHINE                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌────────────┐                                                                │
│   │  DISCOVERY │◀─────────────────────────────────────────────────┐             │
│   └─────┬──────┘                                                   │             │
│         │ search_products                                          │             │
│         ▼                                                          │             │
│   ┌────────────┐                                                   │             │
│   │  PROPOSAL  │◀────────────────────────────┐                     │             │
│   └─────┬──────┘                              │                     │             │
│         │ add_to_cart                         │                     │             │
│         ▼                                     │                     │             │
│   ┌─────────────┐                             │                     │             │
│   │ NEGOTIATION │─────────────────────────────┘                     │             │
│   └─────┬───────┘      (back to proposal)                          │             │
│         │ validate_client_data                                      │             │
│         ▼                                                          │             │
│   ┌────────────┐                                                   │             │
│   │  CLOSING   │                                                   │             │
│   └─────┬──────┘                                                   │             │
│         │ create_proforma                                          │             │
│         ▼                                                          │             │
│   ┌──────────────┐                                                 │             │
│   │ PROFORMA_SENT│                                                 │             │
│   └─────┬────────┘                                                 │             │
│         │ client accepts                                           │             │
│         ▼                                                          │             │
│   ┌───────────────────┐                                           │             │
│   │ PROFORMA_ACCEPTED │                                           │             │
│   └─────┬─────────────┘                                           │             │
│         │ convert_to_invoice                                       │             │
│         ▼                                                          │             │
│   ┌────────────┐                                                   │             │
│   │  INVOICED  │                                                   │             │
│   └─────┬──────┘                                                   │             │
│         │ send_einvoice                                            │             │
│         ▼                                                          │             │
│   ┌──────────────────┐         ┌─────────────────┐                │             │
│   │ EINVOICE_PENDING │────────▶│  EINVOICE_SENT  │                │             │
│   └──────────────────┘         └────────┬────────┘                │             │
│                                         │ mark_paid               │             │
│                                         ▼                         │             │
│   ┌──────────┐            ┌────────────┐                          │             │
│   │   DEAD   │◀───────────│    PAID    │                          │ resurrect   │
│   └────┬─────┘            └─────┬──────┘                          │             │
│        │                        │ complete                        │             │
│        └────────────────────────│──────────────────────────────────┘             │
│                                 ▼                                                │
│                           ┌───────────┐                                          │
│                           │ COMPLETED │                                          │
│                           └───────────┘                                          │
│                                                                                  │
│   ┌───────────┐                                                                  │
│   │  ON_HOLD  │◀───── Any state can go to ON_HOLD                               │
│   └───────────┘                                                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Sub-State Transitions

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      SUB-STATE MACHINE                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Within NEGOTIATION state:                                                      │
│                                                                                  │
│   ┌────────┐                                                                     │
│   │  NONE  │◀─────────────────────────────────────────┐                         │
│   └───┬────┘                                          │                         │
│       │                                               │                         │
│       ├───────────▶ OBJECTION_PRICE ──────────────────┤                         │
│       │             (client says "too expensive")     │ resolved                │
│       │                                               │                         │
│       ├───────────▶ OBJECTION_FEATURE ────────────────┤                         │
│       │             (client asks about feature)       │ resolved                │
│       │                                               │                         │
│       ├───────────▶ OBJECTION_TIMING ─────────────────┤                         │
│       │             (client says "not now")           │ resolved                │
│       │                                               │                         │
│       ├───────────▶ WAITING_CLIENT_DATA ──────────────┤                         │
│       │             (missing CIF/address)             │ data received           │
│       │                                               │                         │
│       └───────────▶ WAITING_MANAGER_APPROVAL ─────────┘                         │
│                     (discount > threshold)            │ approved/rejected       │
│                                                                                  │
│   Within EINVOICE_SENT state:                                                    │
│                                                                                  │
│   ┌────────┐                                                                     │
│   │  NONE  │                                                                     │
│   └───┬────┘                                                                     │
│       │                                                                          │
│       └───────────▶ WAITING_PAYMENT ──────────────────▶ PAID                    │
│                     (invoice sent, awaiting)                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Database Triggers

### 6.1 State Transition Trigger

```sql
-- PostgreSQL trigger for automatic state history logging
CREATE OR REPLACE FUNCTION fn_negotiation_state_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire if state actually changed
  IF OLD.state <> NEW.state THEN
    INSERT INTO negotiation_state_history (
      negotiation_id,
      shop_id,
      from_state,
      to_state,
      from_sub_state,
      to_sub_state,
      trigger,
      reason,
      operator_role,
      created_at
    ) VALUES (
      NEW.id,
      NEW.shop_id,
      OLD.state,
      NEW.state,
      OLD.sub_state,
      NEW.sub_state,
      'DB_TRIGGER',
      'Automatic state change logging',
      'SYSTEM',
      NOW()
    );
    
    -- Update state_changed_at
    NEW.state_changed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_negotiation_state_change
  BEFORE UPDATE ON gold_negotiations
  FOR EACH ROW
  EXECUTE FUNCTION fn_negotiation_state_change();
```

### 6.2 Cart Validation Trigger

```sql
-- Prevent cart updates in invalid states
CREATE OR REPLACE FUNCTION fn_validate_cart_update()
RETURNS TRIGGER AS $$
DECLARE
  v_negotiation_state TEXT;
  v_allowed_states TEXT[] := ARRAY['PROPOSAL', 'NEGOTIATION'];
BEGIN
  -- Get negotiation state
  SELECT state INTO v_negotiation_state
  FROM gold_negotiations
  WHERE id = NEW.negotiation_id;
  
  -- Check if cart update is allowed
  IF NOT (v_negotiation_state = ANY(v_allowed_states)) THEN
    RAISE EXCEPTION 'Cannot modify cart in % state', v_negotiation_state;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_cart_update
  BEFORE INSERT OR UPDATE ON negotiation_cart
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_cart_update();
```

### 6.3 Discount Limit Trigger

```sql
-- Enforce maximum discount per product
CREATE OR REPLACE FUNCTION fn_validate_discount()
RETURNS TRIGGER AS $$
DECLARE
  v_max_discount NUMERIC;
BEGIN
  -- Get product max discount
  SELECT COALESCE(max_discount_percent, 20) INTO v_max_discount
  FROM gold_products
  WHERE id = NEW.product_id;
  
  -- Check discount limit
  IF NEW.discount_percent > v_max_discount THEN
    RAISE EXCEPTION 'Discount % exceeds maximum % for product %', 
      NEW.discount_percent, v_max_discount, NEW.sku;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_discount
  BEFORE INSERT OR UPDATE ON negotiation_cart
  FOR EACH ROW
  WHEN (NEW.discount_percent IS NOT NULL AND NEW.discount_percent > 0)
  EXECUTE FUNCTION fn_validate_discount();
```

---

## 7. Monitoring & Alerts

### 7.1 Prometheus Metrics

```typescript
// /workers/negotiation/metrics.ts

import { Counter, Histogram, Gauge } from 'prom-client';

// State transitions
export const negotiationTransitionsTotal = new Counter({
  name: 'negotiation_transitions_total',
  help: 'Total state transitions',
  labelNames: ['from_state', 'to_state', 'trigger'],
});

export const negotiationTransitionsRejected = new Counter({
  name: 'negotiation_transitions_rejected_total',
  help: 'Rejected state transitions',
  labelNames: ['from_state', 'target_state', 'reason'],
});

export const transitionDuration = new Histogram({
  name: 'negotiation_transition_duration_ms',
  help: 'State transition processing time',
  labelNames: ['from_state', 'to_state'],
  buckets: [10, 25, 50, 100, 250, 500, 1000],
});

// Cart operations
export const cartUpdatesTotal = new Counter({
  name: 'negotiation_cart_updates_total',
  help: 'Total cart update operations',
  labelNames: ['operation', 'success'],
});

export const cartUpdateDuration = new Histogram({
  name: 'negotiation_cart_update_duration_ms',
  help: 'Cart update processing time',
  labelNames: ['operation'],
  buckets: [50, 100, 250, 500, 1000, 2500, 5000],
});

export const cartItemsGauge = new Gauge({
  name: 'negotiation_cart_items_current',
  help: 'Current items in active carts',
  labelNames: ['shop_id'],
});

// Summaries
export const summariesGenerated = new Counter({
  name: 'negotiation_summaries_generated_total',
  help: 'Total summaries generated',
  labelNames: ['summary_type', 'format'],
});

export const summaryDuration = new Histogram({
  name: 'negotiation_summary_duration_ms',
  help: 'Summary generation time',
  labelNames: ['summary_type', 'format'],
  buckets: [500, 1000, 2500, 5000, 10000, 20000, 30000],
});

// Active negotiations
export const activeNegotiationsGauge = new Gauge({
  name: 'negotiation_active_current',
  help: 'Current active negotiations by state',
  labelNames: ['shop_id', 'state'],
});
```

### 7.2 Grafana Dashboard

```json
{
  "title": "Negotiation FSM Dashboard",
  "uid": "negotiation-fsm",
  "panels": [
    {
      "title": "State Transitions per Hour",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(rate(negotiation_transitions_total[1h])) by (to_state)",
          "legendFormat": "{{to_state}}"
        }
      ]
    },
    {
      "title": "Rejected Transitions",
      "type": "stat",
      "targets": [
        {
          "expr": "sum(increase(negotiation_transitions_rejected_total[24h]))",
          "legendFormat": "Last 24h"
        }
      ]
    },
    {
      "title": "Transition Duration P99",
      "type": "timeseries",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, sum(rate(negotiation_transition_duration_ms_bucket[5m])) by (le))",
          "legendFormat": "P99"
        }
      ]
    },
    {
      "title": "Cart Operations",
      "type": "piechart",
      "targets": [
        {
          "expr": "sum(increase(negotiation_cart_updates_total[24h])) by (operation)",
          "legendFormat": "{{operation}}"
        }
      ]
    },
    {
      "title": "Active Negotiations by State",
      "type": "bargauge",
      "targets": [
        {
          "expr": "sum(negotiation_active_current) by (state)",
          "legendFormat": "{{state}}"
        }
      ]
    }
  ]
}
```

### 7.3 Alert Rules

```yaml
# /monitoring/alerts/negotiation-fsm.yaml
groups:
  - name: negotiation-fsm
    rules:
      - alert: HighTransitionRejectionRate
        expr: >
          sum(rate(negotiation_transitions_rejected_total[15m])) /
          sum(rate(negotiation_transitions_total[15m])) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High state transition rejection rate"
          description: "More than 10% of state transitions are being rejected"
      
      - alert: SlowStateTransitions
        expr: >
          histogram_quantile(0.99, sum(rate(negotiation_transition_duration_ms_bucket[5m])) by (le)) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow state transitions"
          description: "P99 transition time exceeds 1 second"
      
      - alert: CartUpdateFailures
        expr: >
          sum(rate(negotiation_cart_updates_total{success="false"}[15m])) /
          sum(rate(negotiation_cart_updates_total[15m])) > 0.05
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High cart update failure rate"
          description: "More than 5% of cart updates are failing"
      
      - alert: StuckNegotiations
        expr: >
          count(
            gold_negotiations_state_age_seconds{state=~"PROFORMA_SENT|EINVOICE_PENDING"} > 259200
          ) > 0
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Negotiations stuck in intermediate state"
          description: "Negotiations in PROFORMA_SENT or EINVOICE_PENDING for >3 days"
      
      - alert: EinvoiceDeadlineApproaching
        expr: >
          count(
            gold_negotiations_state_age_seconds{state="EINVOICE_PENDING"} > 345600
          ) > 0
        for: 30m
        labels:
          severity: critical
        annotations:
          summary: "E-Factura deadline approaching"
          description: "E-invoice pending for >4 days, 5-day deadline at risk"
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// /workers/negotiation/__tests__/state-transition.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stateTransitionProcessor } from '../state-transition.worker';
import { NegotiationState, VALID_TRANSITIONS } from '../types';

describe('State Transition Worker', () => {
  describe('isValidTransition', () => {
    it('allows DISCOVERY -> PROPOSAL', () => {
      expect(VALID_TRANSITIONS[NegotiationState.DISCOVERY])
        .toContain(NegotiationState.PROPOSAL);
    });
    
    it('prevents DISCOVERY -> INVOICED', () => {
      expect(VALID_TRANSITIONS[NegotiationState.DISCOVERY])
        .not.toContain(NegotiationState.INVOICED);
    });
    
    it('allows DEAD -> DISCOVERY (resurrection)', () => {
      expect(VALID_TRANSITIONS[NegotiationState.DEAD])
        .toContain(NegotiationState.DISCOVERY);
    });
    
    it('prevents modification of COMPLETED state', () => {
      expect(VALID_TRANSITIONS[NegotiationState.COMPLETED]).toHaveLength(0);
    });
  });
  
  describe('Pre-transition validation', () => {
    it('requires cart items for CLOSING', async () => {
      // Mock empty cart
      const mockNegotiation = { id: '123', state: 'NEGOTIATION' };
      
      const result = await validatePreTransition(
        mockNegotiation,
        NegotiationState.CLOSING,
        logger
      );
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('cart');
    });
    
    it('requires client data for PROFORMA_SENT', async () => {
      const mockNegotiation = { 
        id: '123', 
        state: 'CLOSING',
        client_cif: null,
      };
      
      const result = await validatePreTransition(
        mockNegotiation,
        NegotiationState.PROFORMA_SENT,
        logger
      );
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('CIF');
    });
  });
});
```

### 8.2 Integration Tests

```typescript
// /workers/negotiation/__tests__/cart-update.integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue } from 'bullmq';
import { db } from '@cerniq/db';

describe('Cart Update Integration', () => {
  let cartQueue: Queue;
  
  beforeAll(async () => {
    cartQueue = new Queue('negotiation:cart:update');
    // Create test negotiation
    await createTestNegotiation();
  });
  
  afterAll(async () => {
    await cartQueue.close();
    await cleanupTestData();
  });
  
  it('adds item to cart and validates stock', async () => {
    const job = await cartQueue.add('add', {
      correlationId: crypto.randomUUID(),
      shopId: TEST_SHOP_ID,
      negotiationId: TEST_NEGOTIATION_ID,
      operation: 'ADD_ITEM',
      item: {
        sku: 'TEST-SKU-001',
        quantity: 10,
      },
    });
    
    const result = await job.waitUntilFinished(cartQueue.events, 15000);
    
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].stockVerified).toBe(true);
  });
  
  it('rejects discount above maximum', async () => {
    const job = await cartQueue.add('discount', {
      correlationId: crypto.randomUUID(),
      shopId: TEST_SHOP_ID,
      negotiationId: TEST_NEGOTIATION_ID,
      operation: 'APPLY_DISCOUNT',
      discountRequest: {
        sku: 'TEST-SKU-001',
        discountPercent: 50, // Exceeds 20% max
        approved: false,
      },
    });
    
    const result = await job.waitUntilFinished(cartQueue.events, 15000);
    
    expect(result.success).toBe(false);
    expect(result.validation.errors[0]).toContain('exceeds maximum');
  });
});
```

---

## 9. Document Information

| Field | Value |
|-------|-------|
| **Document ID** | ETAPA3-WORKERS-D-001 |
| **Version** | 1.0.0 |
| **Created** | 2026-01-18 |
| **Last Modified** | 2026-01-18 |
| **Author** | Cerniq Development Team |
| **Reviewers** | Technical Lead, Product Owner |
| **Status** | Draft |

### Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-18 | Dev Team | Initial documentation |

---

*End of Etapa 3 - Workers Categoria D: Negotiation State Machine*
