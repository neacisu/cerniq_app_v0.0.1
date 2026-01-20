# Etapa 3 - Workers F: Stock & Inventory Management

## Document Control
| Metadata | Value |
|----------|-------|
| Document ID | CERNIQ-E3-WORKERS-F |
| Version | 1.0.0 |
| Status | NORMATIV |
| Parent | etapa3-workers-overview.md |
| Dependencies | etapa3-schema-products.md, etapa3-schema-negotiations.md |
| Author | System Architect |
| Created | 2026-01-18 |
| Last Updated | 2026-01-18 |

---

## 1. Category Overview

### 1.1 Purpose

Category F handles all stock and inventory operations critical to the sales process. These workers ensure:

1. **Stock Reservations** - Prevent overselling during negotiations
2. **Reservation Releases** - Free stock when negotiations fail or timeout
3. **ERP Synchronization** - Keep stock levels aligned with external systems
4. **Real-time Availability** - Accurate stock information for AI agent responses

### 1.2 Workers in Category F

| # | Worker ID | Queue Name | Concurrency | Critical Path |
|---|-----------|------------|-------------|---------------|
| 19 | stock:reserve:create | `stock:reserve:create` | 50 | ✅ YES |
| 20 | stock:reserve:release | `stock:reserve:release` | 50 | ❌ NO |
| 21 | stock:sync:erp | `stock:sync:erp` | 5 | ❌ NO |

### 1.3 Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STOCK & INVENTORY FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│  │ Negotiation  │────▶│ stock:reserve│────▶│ stock_       │       │
│  │ Cart Update  │     │ :create      │     │ reservations │       │
│  └──────────────┘     └──────────────┘     └──────────────┘       │
│                              │                     │                │
│                              ▼                     ▼                │
│                    ┌──────────────┐     ┌──────────────┐          │
│                    │ products.    │     │ stock_       │          │
│                    │ stock_       │     │ movements    │          │
│                    │ available    │     │ (audit log)  │          │
│                    └──────────────┘     └──────────────┘          │
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐                            │
│  │ Negotiation  │────▶│ stock:reserve│                            │
│  │ DEAD/TIMEOUT │     │ :release     │                            │
│  └──────────────┘     └──────────────┘                            │
│                              │                                      │
│                              ▼                                      │
│                    ┌──────────────┐                                │
│                    │ Restore      │                                │
│                    │ Available    │                                │
│                    │ Stock        │                                │
│                    └──────────────┘                                │
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│  │ ERP System   │────▶│ stock:sync:  │────▶│ Bulk Update  │       │
│  │ (External)   │     │ erp          │     │ Stock Levels │       │
│  └──────────────┘     └──────────────┘     └──────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.4 Reservation Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                   RESERVATION STATE MACHINE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│              ┌─────────┐                                           │
│              │ PENDING │ (Initial state)                           │
│              └────┬────┘                                           │
│                   │                                                 │
│         ┌────────┴────────┐                                        │
│         ▼                 ▼                                        │
│    ┌─────────┐      ┌─────────┐                                   │
│    │ ACTIVE  │      │ FAILED  │ (Stock unavailable)               │
│    └────┬────┘      └─────────┘                                   │
│         │                                                          │
│    ┌────┴────┬────────────┐                                       │
│    ▼         ▼            ▼                                       │
│ ┌───────┐ ┌─────────┐ ┌─────────┐                                │
│ │CONSUMED│ │ RELEASED│ │ EXPIRED │                                │
│ │(Sold)  │ │(Manual) │ │(Timeout)│                                │
│ └────────┘ └─────────┘ └─────────┘                                │
│                                                                     │
│  Timeout: 72 hours (configurable per tenant)                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Worker #19: stock:reserve:create

### 2.1 Specification

| Property | Value |
|----------|-------|
| Queue Name | `stock:reserve:create` |
| Concurrency | 50 |
| Timeout | 10s |
| Retries | 3 |
| Backoff | exponential, 1000ms |
| Critical Path | ✅ YES |
| Idempotent | ✅ YES (by reservation_key) |

### 2.2 Purpose

Creates stock reservations when items are added to negotiation carts. Ensures atomic stock decrement with rollback capability.

### 2.3 Input Schema

```typescript
// File: packages/workers/src/stock/reserve-create.schema.ts

import { z } from 'zod';

export const StockReserveCreateJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  negotiationId: z.string().uuid(),
  items: z.array(z.object({
    sku: z.string().min(1).max(50),
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(10000),
    unitOfMeasure: z.enum(['BUC', 'KG', 'L', 'M', 'M2', 'M3', 'SET', 'PAL']).default('BUC'),
  })).min(1).max(100),
  reservationType: z.enum(['SOFT', 'HARD']).default('SOFT'),
  expiresInHours: z.number().int().positive().max(168).default(72), // Max 7 days
  reservationKey: z.string().optional(), // For idempotency
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  metadata: z.object({
    requestedBy: z.string().optional(),
    channel: z.enum(['AI_AGENT', 'MANUAL', 'API']).default('AI_AGENT'),
    notes: z.string().max(500).optional(),
  }).optional(),
});

export type StockReserveCreateJobData = z.infer<typeof StockReserveCreateJobDataSchema>;

// Reservation types:
// SOFT: Can be overridden by HARD reservations or manual intervention
// HARD: Cannot be overridden, used for confirmed orders
```

### 2.4 Output Schema

```typescript
// File: packages/workers/src/stock/reserve-create.result.ts

export interface StockReserveCreateResult {
  success: boolean;
  reservationId: string | null;
  reservationKey: string;
  status: 'ACTIVE' | 'PARTIAL' | 'FAILED';
  items: ReservationItemResult[];
  totalReserved: number;
  totalRequested: number;
  expiresAt: string; // ISO timestamp
  warnings: string[];
  errors: ReservationError[];
}

export interface ReservationItemResult {
  sku: string;
  productId: string;
  requestedQuantity: number;
  reservedQuantity: number;
  availableBefore: number;
  availableAfter: number;
  status: 'RESERVED' | 'PARTIAL' | 'UNAVAILABLE';
  backorderDate?: string; // Expected restock date if partial/unavailable
}

export interface ReservationError {
  sku: string;
  code: 'INSUFFICIENT_STOCK' | 'PRODUCT_NOT_FOUND' | 'PRODUCT_DISCONTINUED' | 'RESERVATION_EXISTS';
  message: string;
  availableQuantity?: number;
}
```

### 2.5 Implementation

```typescript
// File: packages/workers/src/stock/reserve-create.worker.ts

import { Worker, Job } from 'bullmq';
import { db } from '@cerniq/database';
import { 
  products, 
  stockReservations, 
  stockMovements,
  negotiations 
} from '@cerniq/database/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { redis } from '@cerniq/redis';
import { logger } from '@cerniq/logger';
import { metrics } from '@cerniq/metrics';
import { nanoid } from 'nanoid';
import { 
  StockReserveCreateJobData, 
  StockReserveCreateJobDataSchema 
} from './reserve-create.schema';
import { StockReserveCreateResult, ReservationItemResult, ReservationError } from './reserve-create.result';

const QUEUE_NAME = 'stock:reserve:create';

export const stockReserveCreateWorker = new Worker<StockReserveCreateJobData, StockReserveCreateResult>(
  QUEUE_NAME,
  async (job: Job<StockReserveCreateJobData>): Promise<StockReserveCreateResult> => {
    const startTime = Date.now();
    const { tenantId, negotiationId, items, reservationType, expiresInHours, reservationKey, priority } = job.data;
    
    const actualReservationKey = reservationKey || `res_${negotiationId}_${nanoid(10)}`;
    
    logger.info({
      msg: 'Starting stock reservation',
      jobId: job.id,
      tenantId,
      negotiationId,
      itemCount: items.length,
      reservationKey: actualReservationKey,
    });

    // Check idempotency - return existing reservation if key exists
    const existingReservation = await checkExistingReservation(tenantId, actualReservationKey);
    if (existingReservation) {
      logger.info({
        msg: 'Returning existing reservation (idempotent)',
        reservationId: existingReservation.id,
        reservationKey: actualReservationKey,
      });
      return existingReservation;
    }

    const itemResults: ReservationItemResult[] = [];
    const errors: ReservationError[] = [];
    const warnings: string[] = [];
    let totalReserved = 0;
    let totalRequested = 0;

    // Calculate expiration
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // Use transaction for atomic reservation
    const result = await db.transaction(async (tx) => {
      // Verify negotiation exists and is in valid state
      const negotiation = await tx.query.negotiations.findFirst({
        where: and(
          eq(negotiations.id, negotiationId),
          eq(negotiations.tenantId, tenantId),
        ),
      });

      if (!negotiation) {
        throw new Error(`Negotiation ${negotiationId} not found`);
      }

      const validStatesForReservation = ['PROPOSAL', 'NEGOTIATION', 'CLOSING'];
      if (!validStatesForReservation.includes(negotiation.currentState)) {
        throw new Error(`Cannot reserve stock in state: ${negotiation.currentState}`);
      }

      // Get all products with FOR UPDATE lock
      const skus = items.map(i => i.sku);
      const productRows = await tx
        .select()
        .from(products)
        .where(and(
          eq(products.tenantId, tenantId),
          inArray(products.sku, skus),
        ))
        .for('update'); // Row-level lock

      const productMap = new Map(productRows.map(p => [p.sku, p]));

      // Create reservation record
      const [reservation] = await tx.insert(stockReservations).values({
        id: nanoid(),
        tenantId,
        negotiationId,
        reservationKey: actualReservationKey,
        type: reservationType,
        status: 'PENDING',
        priority,
        expiresAt,
        createdAt: new Date(),
      }).returning();

      // Process each item
      for (const item of items) {
        totalRequested += item.quantity;
        const product = productMap.get(item.sku);

        if (!product) {
          errors.push({
            sku: item.sku,
            code: 'PRODUCT_NOT_FOUND',
            message: `Product with SKU ${item.sku} not found`,
          });
          itemResults.push({
            sku: item.sku,
            productId: item.productId,
            requestedQuantity: item.quantity,
            reservedQuantity: 0,
            availableBefore: 0,
            availableAfter: 0,
            status: 'UNAVAILABLE',
          });
          continue;
        }

        if (product.status === 'DISCONTINUED') {
          errors.push({
            sku: item.sku,
            code: 'PRODUCT_DISCONTINUED',
            message: `Product ${item.sku} is discontinued`,
          });
          itemResults.push({
            sku: item.sku,
            productId: product.id,
            requestedQuantity: item.quantity,
            reservedQuantity: 0,
            availableBefore: product.stockAvailable,
            availableAfter: product.stockAvailable,
            status: 'UNAVAILABLE',
          });
          continue;
        }

        const availableBefore = product.stockAvailable;
        let reservedQty = 0;
        let status: 'RESERVED' | 'PARTIAL' | 'UNAVAILABLE' = 'UNAVAILABLE';

        if (availableBefore >= item.quantity) {
          // Full reservation possible
          reservedQty = item.quantity;
          status = 'RESERVED';
        } else if (availableBefore > 0) {
          // Partial reservation
          reservedQty = availableBefore;
          status = 'PARTIAL';
          warnings.push(`Partial reservation for ${item.sku}: requested ${item.quantity}, reserved ${reservedQty}`);
        } else {
          // No stock available
          errors.push({
            sku: item.sku,
            code: 'INSUFFICIENT_STOCK',
            message: `No stock available for ${item.sku}`,
            availableQuantity: 0,
          });
        }

        if (reservedQty > 0) {
          // Decrement available stock
          await tx
            .update(products)
            .set({
              stockAvailable: sql`${products.stockAvailable} - ${reservedQty}`,
              stockReserved: sql`${products.stockReserved} + ${reservedQty}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, product.id));

          // Create stock movement record
          await tx.insert(stockMovements).values({
            id: nanoid(),
            tenantId,
            productId: product.id,
            sku: item.sku,
            type: 'RESERVATION',
            quantity: -reservedQty,
            previousAvailable: availableBefore,
            newAvailable: availableBefore - reservedQty,
            referenceType: 'RESERVATION',
            referenceId: reservation.id,
            negotiationId,
            notes: `Stock reserved for negotiation ${negotiationId}`,
            createdAt: new Date(),
          });

          totalReserved += reservedQty;
        }

        itemResults.push({
          sku: item.sku,
          productId: product.id,
          requestedQuantity: item.quantity,
          reservedQuantity: reservedQty,
          availableBefore,
          availableAfter: availableBefore - reservedQty,
          status,
          backorderDate: reservedQty < item.quantity ? product.expectedRestockDate?.toISOString() : undefined,
        });
      }

      // Update reservation status
      const finalStatus = totalReserved === 0 ? 'FAILED' : 
                         totalReserved < totalRequested ? 'PARTIAL' : 'ACTIVE';

      await tx
        .update(stockReservations)
        .set({
          status: finalStatus === 'FAILED' ? 'FAILED' : 'ACTIVE',
          itemsJson: JSON.stringify(itemResults),
          totalReserved,
          totalRequested,
          updatedAt: new Date(),
        })
        .where(eq(stockReservations.id, reservation.id));

      return {
        reservationId: reservation.id,
        finalStatus,
      };
    });

    // Set expiration timer in Redis for automatic release
    if (result.finalStatus !== 'FAILED') {
      await redis.setex(
        `stock:reservation:${result.reservationId}:expiry`,
        expiresInHours * 60 * 60,
        JSON.stringify({
          reservationId: result.reservationId,
          tenantId,
          negotiationId,
          expiresAt: expiresAt.toISOString(),
        })
      );

      // Schedule expiration job
      const { stockReserveReleaseQueue } = await import('./reserve-release.queue');
      await stockReserveReleaseQueue.add(
        'auto-expire',
        {
          tenantId,
          reservationId: result.reservationId,
          reason: 'EXPIRED',
        },
        {
          delay: expiresInHours * 60 * 60 * 1000,
          jobId: `expire_${result.reservationId}`,
        }
      );
    }

    // Update cache
    await invalidateStockCache(tenantId, items.map(i => i.sku));

    const duration = Date.now() - startTime;
    
    metrics.increment('stock_reservations_created_total', {
      tenant_id: tenantId,
      status: result.finalStatus,
      type: reservationType,
    });
    metrics.histogram('stock_reservation_duration_ms', duration, {
      tenant_id: tenantId,
    });

    logger.info({
      msg: 'Stock reservation completed',
      jobId: job.id,
      reservationId: result.reservationId,
      status: result.finalStatus,
      totalReserved,
      totalRequested,
      duration,
    });

    return {
      success: result.finalStatus !== 'FAILED',
      reservationId: result.reservationId,
      reservationKey: actualReservationKey,
      status: result.finalStatus as 'ACTIVE' | 'PARTIAL' | 'FAILED',
      items: itemResults,
      totalReserved,
      totalRequested,
      expiresAt: expiresAt.toISOString(),
      warnings,
      errors,
    };
  },
  {
    connection: redis,
    concurrency: 50,
    limiter: {
      max: 100,
      duration: 1000,
    },
  }
);

// Helper functions
async function checkExistingReservation(
  tenantId: string, 
  reservationKey: string
): Promise<StockReserveCreateResult | null> {
  const existing = await db.query.stockReservations.findFirst({
    where: and(
      eq(stockReservations.tenantId, tenantId),
      eq(stockReservations.reservationKey, reservationKey),
      eq(stockReservations.status, 'ACTIVE'),
    ),
  });

  if (!existing) return null;

  return {
    success: true,
    reservationId: existing.id,
    reservationKey: existing.reservationKey,
    status: existing.status as 'ACTIVE' | 'PARTIAL',
    items: JSON.parse(existing.itemsJson || '[]'),
    totalReserved: existing.totalReserved,
    totalRequested: existing.totalRequested,
    expiresAt: existing.expiresAt.toISOString(),
    warnings: ['Returning existing reservation (idempotent request)'],
    errors: [],
  };
}

async function invalidateStockCache(tenantId: string, skus: string[]): Promise<void> {
  const keys = skus.map(sku => `stock:${tenantId}:${sku}`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  // Also invalidate tenant-wide stock summary
  await redis.del(`stock:${tenantId}:summary`);
}

// Event handlers
stockReserveCreateWorker.on('completed', (job, result) => {
  logger.debug({
    msg: 'Stock reservation job completed',
    jobId: job.id,
    reservationId: result.reservationId,
  });
});

stockReserveCreateWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'Stock reservation job failed',
    jobId: job?.id,
    error: err.message,
    stack: err.stack,
  });
  
  metrics.increment('stock_reservations_failed_total', {
    tenant_id: job?.data?.tenantId || 'unknown',
    error_type: err.name,
  });
});

export default stockReserveCreateWorker;
```

---

## 3. Worker #20: stock:reserve:release

### 3.1 Specification

| Property | Value |
|----------|-------|
| Queue Name | `stock:reserve:release` |
| Concurrency | 50 |
| Timeout | 10s |
| Retries | 3 |
| Backoff | exponential, 1000ms |
| Critical Path | ❌ NO |
| Idempotent | ✅ YES |

### 3.2 Purpose

Releases stock reservations when:
- Negotiation is cancelled/dead
- Reservation expires (automatic)
- Manual release by operator
- Order is confirmed (converts to consumed)

### 3.3 Input Schema

```typescript
// File: packages/workers/src/stock/reserve-release.schema.ts

import { z } from 'zod';

export const StockReserveReleaseJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  reservationId: z.string().optional(),
  negotiationId: z.string().uuid().optional(),
  reason: z.enum([
    'CANCELLED',      // Negotiation cancelled
    'EXPIRED',        // Time-based expiration
    'MANUAL',         // Operator release
    'CONSUMED',       // Converted to sale
    'DEAD',           // Negotiation marked dead
    'REPLACED',       // New reservation created
  ]),
  releasePartial: z.boolean().default(false),
  itemsToRelease: z.array(z.object({
    sku: z.string(),
    quantity: z.number().int().positive(),
  })).optional(), // For partial release
  releasedBy: z.string().optional(), // User ID for manual releases
  notes: z.string().max(500).optional(),
});

export type StockReserveReleaseJobData = z.infer<typeof StockReserveReleaseJobDataSchema>;
```

### 3.4 Output Schema

```typescript
// File: packages/workers/src/stock/reserve-release.result.ts

export interface StockReserveReleaseResult {
  success: boolean;
  reservationId: string;
  previousStatus: string;
  newStatus: 'RELEASED' | 'CONSUMED' | 'PARTIAL';
  itemsReleased: ReleasedItem[];
  totalReleased: number;
  reason: string;
  releasedAt: string;
  warnings: string[];
}

export interface ReleasedItem {
  sku: string;
  productId: string;
  releasedQuantity: number;
  availableAfter: number;
}
```

### 3.5 Implementation

```typescript
// File: packages/workers/src/stock/reserve-release.worker.ts

import { Worker, Job } from 'bullmq';
import { db } from '@cerniq/database';
import { 
  products, 
  stockReservations, 
  stockMovements 
} from '@cerniq/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { redis } from '@cerniq/redis';
import { logger } from '@cerniq/logger';
import { metrics } from '@cerniq/metrics';
import { 
  StockReserveReleaseJobData, 
  StockReserveReleaseJobDataSchema 
} from './reserve-release.schema';
import { StockReserveReleaseResult, ReleasedItem } from './reserve-release.result';

const QUEUE_NAME = 'stock:reserve:release';

export const stockReserveReleaseWorker = new Worker<StockReserveReleaseJobData, StockReserveReleaseResult>(
  QUEUE_NAME,
  async (job: Job<StockReserveReleaseJobData>): Promise<StockReserveReleaseResult> => {
    const startTime = Date.now();
    const { tenantId, reservationId, negotiationId, reason, releasePartial, itemsToRelease, releasedBy, notes } = job.data;
    
    logger.info({
      msg: 'Starting stock release',
      jobId: job.id,
      tenantId,
      reservationId,
      negotiationId,
      reason,
    });

    // Find reservation by ID or negotiation ID
    const reservation = await findReservation(tenantId, reservationId, negotiationId);
    
    if (!reservation) {
      logger.warn({
        msg: 'Reservation not found (may already be released)',
        reservationId,
        negotiationId,
      });
      return {
        success: true, // Idempotent - already released is success
        reservationId: reservationId || 'unknown',
        previousStatus: 'NOT_FOUND',
        newStatus: 'RELEASED',
        itemsReleased: [],
        totalReleased: 0,
        reason,
        releasedAt: new Date().toISOString(),
        warnings: ['Reservation not found - may have been previously released'],
      };
    }

    // Check if already released
    if (['RELEASED', 'CONSUMED', 'EXPIRED'].includes(reservation.status)) {
      logger.info({
        msg: 'Reservation already in terminal state',
        reservationId: reservation.id,
        status: reservation.status,
      });
      return {
        success: true,
        reservationId: reservation.id,
        previousStatus: reservation.status,
        newStatus: reservation.status as 'RELEASED' | 'CONSUMED',
        itemsReleased: [],
        totalReleased: 0,
        reason,
        releasedAt: new Date().toISOString(),
        warnings: ['Reservation was already in terminal state'],
      };
    }

    const reservedItems: any[] = JSON.parse(reservation.itemsJson || '[]');
    const itemsReleased: ReleasedItem[] = [];
    let totalReleased = 0;
    const warnings: string[] = [];

    // Determine what to release
    const itemsToProcess = releasePartial && itemsToRelease 
      ? itemsToRelease 
      : reservedItems.filter(i => i.reservedQuantity > 0).map(i => ({
          sku: i.sku,
          quantity: i.reservedQuantity,
        }));

    // Process release in transaction
    await db.transaction(async (tx) => {
      for (const item of itemsToProcess) {
        const reservedItem = reservedItems.find(ri => ri.sku === item.sku);
        if (!reservedItem || reservedItem.reservedQuantity <= 0) {
          warnings.push(`No reservation found for SKU ${item.sku}`);
          continue;
        }

        const releaseQty = Math.min(item.quantity, reservedItem.reservedQuantity);
        
        // Get current product state
        const [product] = await tx
          .select()
          .from(products)
          .where(and(
            eq(products.tenantId, tenantId),
            eq(products.sku, item.sku),
          ))
          .for('update');

        if (!product) {
          warnings.push(`Product ${item.sku} not found during release`);
          continue;
        }

        // Restore available stock
        const newAvailable = product.stockAvailable + releaseQty;
        const newReserved = Math.max(0, product.stockReserved - releaseQty);

        await tx
          .update(products)
          .set({
            stockAvailable: newAvailable,
            stockReserved: newReserved,
            updatedAt: new Date(),
          })
          .where(eq(products.id, product.id));

        // Create stock movement record
        await tx.insert(stockMovements).values({
          id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId,
          productId: product.id,
          sku: item.sku,
          type: reason === 'CONSUMED' ? 'SALE' : 'RELEASE',
          quantity: releaseQty,
          previousAvailable: product.stockAvailable,
          newAvailable,
          referenceType: 'RESERVATION',
          referenceId: reservation.id,
          negotiationId: reservation.negotiationId,
          notes: notes || `Stock ${reason === 'CONSUMED' ? 'consumed (sold)' : 'released'}: ${reason}`,
          createdBy: releasedBy,
          createdAt: new Date(),
        });

        itemsReleased.push({
          sku: item.sku,
          productId: product.id,
          releasedQuantity: releaseQty,
          availableAfter: newAvailable,
        });

        totalReleased += releaseQty;

        // Update reserved item in JSON
        reservedItem.reservedQuantity -= releaseQty;
      }

      // Determine new status
      const remainingReserved = reservedItems.reduce((sum, i) => sum + i.reservedQuantity, 0);
      const newStatus = reason === 'CONSUMED' ? 'CONSUMED' :
                       remainingReserved > 0 ? 'PARTIAL' : 'RELEASED';

      // Update reservation record
      await tx
        .update(stockReservations)
        .set({
          status: newStatus === 'PARTIAL' ? 'ACTIVE' : newStatus,
          itemsJson: JSON.stringify(reservedItems),
          totalReserved: remainingReserved,
          releasedAt: newStatus !== 'PARTIAL' ? new Date() : undefined,
          releaseReason: reason,
          releasedBy,
          releaseNotes: notes,
          updatedAt: new Date(),
        })
        .where(eq(stockReservations.id, reservation.id));
    });

    // Clean up Redis expiration key
    await redis.del(`stock:reservation:${reservation.id}:expiry`);

    // Cancel scheduled expiration job
    const { stockReserveReleaseQueue } = await import('./reserve-release.queue');
    await stockReserveReleaseQueue.remove(`expire_${reservation.id}`);

    // Invalidate stock cache
    const skus = itemsReleased.map(i => i.sku);
    await invalidateStockCache(tenantId, skus);

    const duration = Date.now() - startTime;
    
    metrics.increment('stock_releases_total', {
      tenant_id: tenantId,
      reason,
    });
    metrics.histogram('stock_release_duration_ms', duration, {
      tenant_id: tenantId,
    });

    logger.info({
      msg: 'Stock release completed',
      jobId: job.id,
      reservationId: reservation.id,
      reason,
      totalReleased,
      duration,
    });

    return {
      success: true,
      reservationId: reservation.id,
      previousStatus: reservation.status,
      newStatus: reason === 'CONSUMED' ? 'CONSUMED' : 
                totalReleased < reservation.totalReserved ? 'PARTIAL' : 'RELEASED',
      itemsReleased,
      totalReleased,
      reason,
      releasedAt: new Date().toISOString(),
      warnings,
    };
  },
  {
    connection: redis,
    concurrency: 50,
  }
);

// Helper functions
async function findReservation(
  tenantId: string,
  reservationId?: string,
  negotiationId?: string
) {
  if (reservationId) {
    return db.query.stockReservations.findFirst({
      where: and(
        eq(stockReservations.id, reservationId),
        eq(stockReservations.tenantId, tenantId),
      ),
    });
  }
  
  if (negotiationId) {
    return db.query.stockReservations.findFirst({
      where: and(
        eq(stockReservations.negotiationId, negotiationId),
        eq(stockReservations.tenantId, tenantId),
        eq(stockReservations.status, 'ACTIVE'),
      ),
    });
  }

  return null;
}

async function invalidateStockCache(tenantId: string, skus: string[]): Promise<void> {
  const keys = skus.map(sku => `stock:${tenantId}:${sku}`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.del(`stock:${tenantId}:summary`);
}

// Event handlers
stockReserveReleaseWorker.on('completed', (job, result) => {
  logger.debug({
    msg: 'Stock release job completed',
    jobId: job.id,
    reservationId: result.reservationId,
    totalReleased: result.totalReleased,
  });
});

stockReserveReleaseWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'Stock release job failed',
    jobId: job?.id,
    error: err.message,
  });
  
  metrics.increment('stock_releases_failed_total', {
    tenant_id: job?.data?.tenantId || 'unknown',
  });
});

export default stockReserveReleaseWorker;
```

---

## 4. Worker #21: stock:sync:erp

### 4.1 Specification

| Property | Value |
|----------|-------|
| Queue Name | `stock:sync:erp` |
| Concurrency | 5 |
| Timeout | 120s |
| Retries | 5 |
| Backoff | exponential, 5000ms |
| Critical Path | ❌ NO |
| Scheduled | Every 15 minutes |

### 4.2 Purpose

Synchronizes stock levels with external ERP systems. Supports multiple ERP integrations and handles bulk updates efficiently.

### 4.3 Input Schema

```typescript
// File: packages/workers/src/stock/sync-erp.schema.ts

import { z } from 'zod';

export const StockSyncErpJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  syncType: z.enum([
    'FULL',           // Complete sync of all products
    'INCREMENTAL',    // Only changed items since last sync
    'SELECTIVE',      // Specific SKUs
    'WEBHOOK',        // Triggered by ERP webhook
  ]),
  erpSystem: z.enum([
    'SAGA',           // Romanian ERP
    'SENIOR',         // Romanian ERP
    'WIZCOUNT',       // Romanian ERP
    'SAP_B1',         // SAP Business One
    'MICROSOFT_BC',   // Microsoft Business Central
    'CUSTOM_API',     // Custom REST API
    'CSV_IMPORT',     // File-based import
  ]),
  skus: z.array(z.string()).optional(), // For SELECTIVE sync
  webhookPayload: z.any().optional(),   // For WEBHOOK sync
  forceUpdate: z.boolean().default(false),
  dryRun: z.boolean().default(false),   // Preview changes without applying
  conflictResolution: z.enum([
    'ERP_WINS',       // ERP value overwrites local
    'LOCAL_WINS',     // Keep local value
    'HIGHER_WINS',    // Keep higher stock value
    'LOWER_WINS',     // Keep lower stock value (conservative)
    'MANUAL',         // Flag for manual review
  ]).default('ERP_WINS'),
});

export type StockSyncErpJobData = z.infer<typeof StockSyncErpJobDataSchema>;
```

### 4.4 Output Schema

```typescript
// File: packages/workers/src/stock/sync-erp.result.ts

export interface StockSyncErpResult {
  success: boolean;
  syncId: string;
  syncType: string;
  erpSystem: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  statistics: SyncStatistics;
  changes: StockChange[];
  conflicts: StockConflict[];
  errors: SyncError[];
  nextSyncRecommended: string; // ISO timestamp
}

export interface SyncStatistics {
  totalProducts: number;
  productsChecked: number;
  productsUpdated: number;
  productsCreated: number;
  productsSkipped: number;
  conflictsResolved: number;
  conflictsManual: number;
  errorsCount: number;
}

export interface StockChange {
  sku: string;
  productId: string;
  field: 'stock_total' | 'stock_available' | 'price' | 'status';
  previousValue: number | string;
  newValue: number | string;
  source: 'ERP' | 'LOCAL';
  changeType: 'UPDATE' | 'CREATE' | 'CONFLICT_RESOLVED';
}

export interface StockConflict {
  sku: string;
  field: string;
  localValue: number | string;
  erpValue: number | string;
  resolution: string;
  requiresManualReview: boolean;
}

export interface SyncError {
  sku?: string;
  code: string;
  message: string;
  retryable: boolean;
}
```

### 4.5 Implementation

```typescript
// File: packages/workers/src/stock/sync-erp.worker.ts

import { Worker, Job } from 'bullmq';
import { db } from '@cerniq/database';
import { products, stockSyncLogs, erpIntegrations } from '@cerniq/database/schema';
import { eq, and, sql, gt, inArray } from 'drizzle-orm';
import { redis } from '@cerniq/redis';
import { logger } from '@cerniq/logger';
import { metrics } from '@cerniq/metrics';
import { nanoid } from 'nanoid';
import { 
  StockSyncErpJobData, 
  StockSyncErpJobDataSchema 
} from './sync-erp.schema';
import { 
  StockSyncErpResult, 
  StockChange, 
  StockConflict, 
  SyncError,
  SyncStatistics 
} from './sync-erp.result';

// ERP Adapters
import { SagaErpAdapter } from '../adapters/saga-erp.adapter';
import { SeniorErpAdapter } from '../adapters/senior-erp.adapter';
import { SapB1Adapter } from '../adapters/sap-b1.adapter';
import { CustomApiAdapter } from '../adapters/custom-api.adapter';
import { CsvImportAdapter } from '../adapters/csv-import.adapter';

const QUEUE_NAME = 'stock:sync:erp';
const BATCH_SIZE = 100;

export const stockSyncErpWorker = new Worker<StockSyncErpJobData, StockSyncErpResult>(
  QUEUE_NAME,
  async (job: Job<StockSyncErpJobData>): Promise<StockSyncErpResult> => {
    const startTime = Date.now();
    const { 
      tenantId, 
      syncType, 
      erpSystem, 
      skus, 
      webhookPayload, 
      forceUpdate, 
      dryRun, 
      conflictResolution 
    } = job.data;
    
    const syncId = `sync_${nanoid(12)}`;
    
    logger.info({
      msg: 'Starting ERP stock sync',
      jobId: job.id,
      syncId,
      tenantId,
      syncType,
      erpSystem,
      dryRun,
    });

    // Get ERP integration config
    const erpConfig = await getErpConfig(tenantId, erpSystem);
    if (!erpConfig && erpSystem !== 'CSV_IMPORT') {
      throw new Error(`ERP integration not configured for ${erpSystem}`);
    }

    // Initialize ERP adapter
    const adapter = createErpAdapter(erpSystem, erpConfig);
    
    const changes: StockChange[] = [];
    const conflicts: StockConflict[] = [];
    const errors: SyncError[] = [];
    const statistics: SyncStatistics = {
      totalProducts: 0,
      productsChecked: 0,
      productsUpdated: 0,
      productsCreated: 0,
      productsSkipped: 0,
      conflictsResolved: 0,
      conflictsManual: 0,
      errorsCount: 0,
    };

    try {
      // Fetch data from ERP
      let erpStockData: ErpStockItem[];
      
      switch (syncType) {
        case 'FULL':
          erpStockData = await adapter.fetchAllStock();
          break;
        case 'INCREMENTAL':
          const lastSync = await getLastSyncTime(tenantId, erpSystem);
          erpStockData = await adapter.fetchStockChangedSince(lastSync);
          break;
        case 'SELECTIVE':
          if (!skus || skus.length === 0) {
            throw new Error('SKUs required for selective sync');
          }
          erpStockData = await adapter.fetchStockBySku(skus);
          break;
        case 'WEBHOOK':
          erpStockData = adapter.parseWebhookPayload(webhookPayload);
          break;
        default:
          throw new Error(`Unknown sync type: ${syncType}`);
      }

      statistics.totalProducts = erpStockData.length;
      
      // Update progress
      await job.updateProgress(10);

      // Process in batches
      for (let i = 0; i < erpStockData.length; i += BATCH_SIZE) {
        const batch = erpStockData.slice(i, i + BATCH_SIZE);
        
        await processBatch(
          tenantId,
          batch,
          conflictResolution,
          forceUpdate,
          dryRun,
          changes,
          conflicts,
          errors,
          statistics
        );

        // Update progress
        const progress = 10 + Math.floor((i / erpStockData.length) * 80);
        await job.updateProgress(progress);
      }

      // Log sync results
      if (!dryRun) {
        await db.insert(stockSyncLogs).values({
          id: syncId,
          tenantId,
          erpSystem,
          syncType,
          status: errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
          statisticsJson: JSON.stringify(statistics),
          changesCount: changes.length,
          conflictsCount: conflicts.length,
          errorsCount: errors.length,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        });

        // Update last sync timestamp
        await updateLastSyncTime(tenantId, erpSystem);
      }

      // Invalidate cache for changed products
      const changedSkus = changes.map(c => c.sku);
      if (changedSkus.length > 0) {
        await invalidateStockCache(tenantId, changedSkus);
      }

      await job.updateProgress(100);

    } catch (error: any) {
      logger.error({
        msg: 'ERP sync failed',
        syncId,
        error: error.message,
        stack: error.stack,
      });

      errors.push({
        code: 'SYNC_FAILED',
        message: error.message,
        retryable: true,
      });
      statistics.errorsCount++;

      // Log failed sync
      if (!dryRun) {
        await db.insert(stockSyncLogs).values({
          id: syncId,
          tenantId,
          erpSystem,
          syncType,
          status: 'FAILED',
          statisticsJson: JSON.stringify(statistics),
          errorMessage: error.message,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        });
      }

      throw error;
    }

    const duration = Date.now() - startTime;
    
    metrics.increment('stock_sync_completed_total', {
      tenant_id: tenantId,
      erp_system: erpSystem,
      sync_type: syncType,
      status: errors.length === 0 ? 'success' : 'partial',
    });
    metrics.histogram('stock_sync_duration_ms', duration, {
      tenant_id: tenantId,
      erp_system: erpSystem,
    });
    metrics.gauge('stock_sync_products_updated', statistics.productsUpdated, {
      tenant_id: tenantId,
    });

    logger.info({
      msg: 'ERP stock sync completed',
      jobId: job.id,
      syncId,
      duration,
      statistics,
    });

    // Calculate next recommended sync time
    const nextSyncMinutes = syncType === 'FULL' ? 60 : 15;
    const nextSyncRecommended = new Date(Date.now() + nextSyncMinutes * 60 * 1000);

    return {
      success: errors.length === 0,
      syncId,
      syncType,
      erpSystem,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      duration,
      statistics,
      changes: dryRun ? changes : changes.slice(0, 100), // Limit response size
      conflicts,
      errors,
      nextSyncRecommended: nextSyncRecommended.toISOString(),
    };
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

// Types for ERP data
interface ErpStockItem {
  sku: string;
  stockTotal: number;
  stockAvailable?: number;
  price?: number;
  currency?: string;
  status?: string;
  warehouse?: string;
  lastModified?: Date;
}

// Helper functions
function createErpAdapter(erpSystem: string, config: any) {
  switch (erpSystem) {
    case 'SAGA':
      return new SagaErpAdapter(config);
    case 'SENIOR':
      return new SeniorErpAdapter(config);
    case 'SAP_B1':
      return new SapB1Adapter(config);
    case 'CUSTOM_API':
      return new CustomApiAdapter(config);
    case 'CSV_IMPORT':
      return new CsvImportAdapter(config);
    default:
      throw new Error(`Unsupported ERP system: ${erpSystem}`);
  }
}

async function getErpConfig(tenantId: string, erpSystem: string) {
  return db.query.erpIntegrations.findFirst({
    where: and(
      eq(erpIntegrations.tenantId, tenantId),
      eq(erpIntegrations.erpSystem, erpSystem),
      eq(erpIntegrations.enabled, true),
    ),
  });
}

async function getLastSyncTime(tenantId: string, erpSystem: string): Promise<Date> {
  const lastSync = await db.query.stockSyncLogs.findFirst({
    where: and(
      eq(stockSyncLogs.tenantId, tenantId),
      eq(stockSyncLogs.erpSystem, erpSystem),
      eq(stockSyncLogs.status, 'SUCCESS'),
    ),
    orderBy: (logs, { desc }) => [desc(logs.completedAt)],
  });
  
  return lastSync?.completedAt || new Date(0);
}

async function updateLastSyncTime(tenantId: string, erpSystem: string) {
  await redis.set(
    `stock:sync:lasttime:${tenantId}:${erpSystem}`,
    new Date().toISOString()
  );
}

async function processBatch(
  tenantId: string,
  batch: ErpStockItem[],
  conflictResolution: string,
  forceUpdate: boolean,
  dryRun: boolean,
  changes: StockChange[],
  conflicts: StockConflict[],
  errors: SyncError[],
  statistics: SyncStatistics
) {
  const skus = batch.map(item => item.sku);
  
  // Get current local products
  const localProducts = await db
    .select()
    .from(products)
    .where(and(
      eq(products.tenantId, tenantId),
      inArray(products.sku, skus),
    ));

  const localMap = new Map(localProducts.map(p => [p.sku, p]));

  for (const erpItem of batch) {
    statistics.productsChecked++;
    
    try {
      const localProduct = localMap.get(erpItem.sku);
      
      if (!localProduct) {
        // New product - skip or create based on config
        statistics.productsSkipped++;
        continue;
      }

      // Check for conflicts
      const hasStockConflict = 
        !forceUpdate && 
        localProduct.stockTotal !== erpItem.stockTotal &&
        localProduct.erpLastSyncAt && 
        localProduct.updatedAt > localProduct.erpLastSyncAt;

      if (hasStockConflict) {
        const resolution = resolveConflict(
          conflictResolution,
          localProduct.stockTotal,
          erpItem.stockTotal
        );

        conflicts.push({
          sku: erpItem.sku,
          field: 'stock_total',
          localValue: localProduct.stockTotal,
          erpValue: erpItem.stockTotal,
          resolution: resolution.action,
          requiresManualReview: resolution.requiresManual,
        });

        if (resolution.requiresManual) {
          statistics.conflictsManual++;
          continue;
        }

        statistics.conflictsResolved++;
        erpItem.stockTotal = resolution.value;
      }

      // Check if update needed
      const needsUpdate = 
        localProduct.stockTotal !== erpItem.stockTotal ||
        (erpItem.stockAvailable !== undefined && 
         localProduct.stockAvailable !== erpItem.stockAvailable) ||
        (erpItem.price !== undefined && 
         localProduct.priceBase !== erpItem.price);

      if (!needsUpdate) {
        statistics.productsSkipped++;
        continue;
      }

      // Record change
      if (localProduct.stockTotal !== erpItem.stockTotal) {
        changes.push({
          sku: erpItem.sku,
          productId: localProduct.id,
          field: 'stock_total',
          previousValue: localProduct.stockTotal,
          newValue: erpItem.stockTotal,
          source: 'ERP',
          changeType: hasStockConflict ? 'CONFLICT_RESOLVED' : 'UPDATE',
        });
      }

      // Apply update
      if (!dryRun) {
        await db
          .update(products)
          .set({
            stockTotal: erpItem.stockTotal,
            stockAvailable: erpItem.stockAvailable ?? 
              erpItem.stockTotal - localProduct.stockReserved,
            priceBase: erpItem.price ?? localProduct.priceBase,
            erpLastSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(products.id, localProduct.id));
      }

      statistics.productsUpdated++;

    } catch (error: any) {
      errors.push({
        sku: erpItem.sku,
        code: 'ITEM_SYNC_FAILED',
        message: error.message,
        retryable: false,
      });
      statistics.errorsCount++;
    }
  }
}

function resolveConflict(
  strategy: string,
  localValue: number,
  erpValue: number
): { value: number; action: string; requiresManual: boolean } {
  switch (strategy) {
    case 'ERP_WINS':
      return { value: erpValue, action: 'ERP_WINS', requiresManual: false };
    case 'LOCAL_WINS':
      return { value: localValue, action: 'LOCAL_WINS', requiresManual: false };
    case 'HIGHER_WINS':
      return { 
        value: Math.max(localValue, erpValue), 
        action: 'HIGHER_WINS', 
        requiresManual: false 
      };
    case 'LOWER_WINS':
      return { 
        value: Math.min(localValue, erpValue), 
        action: 'LOWER_WINS', 
        requiresManual: false 
      };
    case 'MANUAL':
    default:
      return { value: localValue, action: 'MANUAL_REVIEW', requiresManual: true };
  }
}

async function invalidateStockCache(tenantId: string, skus: string[]): Promise<void> {
  const keys = skus.map(sku => `stock:${tenantId}:${sku}`);
  const chunks = [];
  for (let i = 0; i < keys.length; i += 100) {
    chunks.push(keys.slice(i, i + 100));
  }
  for (const chunk of chunks) {
    await redis.del(...chunk);
  }
  await redis.del(`stock:${tenantId}:summary`);
}

// Event handlers
stockSyncErpWorker.on('completed', (job, result) => {
  logger.debug({
    msg: 'ERP sync job completed',
    jobId: job.id,
    syncId: result.syncId,
    productsUpdated: result.statistics.productsUpdated,
  });
});

stockSyncErpWorker.on('failed', (job, err) => {
  logger.error({
    msg: 'ERP sync job failed',
    jobId: job?.id,
    error: err.message,
  });
  
  metrics.increment('stock_sync_failed_total', {
    tenant_id: job?.data?.tenantId || 'unknown',
    erp_system: job?.data?.erpSystem || 'unknown',
  });
});

export default stockSyncErpWorker;
```

---

## 5. ERP Adapter Implementations

### 5.1 Base Adapter Interface

```typescript
// File: packages/workers/src/adapters/erp-adapter.interface.ts

export interface ErpStockItem {
  sku: string;
  stockTotal: number;
  stockAvailable?: number;
  price?: number;
  currency?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  warehouse?: string;
  location?: string;
  lastModified?: Date;
  batchNumber?: string;
  expiryDate?: Date;
}

export interface IErpAdapter {
  /**
   * Fetch all stock items from ERP
   */
  fetchAllStock(): Promise<ErpStockItem[]>;

  /**
   * Fetch stock items changed since a specific date
   */
  fetchStockChangedSince(since: Date): Promise<ErpStockItem[]>;

  /**
   * Fetch stock for specific SKUs
   */
  fetchStockBySku(skus: string[]): Promise<ErpStockItem[]>;

  /**
   * Parse webhook payload from ERP
   */
  parseWebhookPayload(payload: any): ErpStockItem[];

  /**
   * Health check for ERP connection
   */
  healthCheck(): Promise<{ healthy: boolean; latency: number }>;

  /**
   * Push stock update to ERP (bidirectional sync)
   */
  pushStockUpdate?(sku: string, quantity: number): Promise<boolean>;
}
```

### 5.2 SAGA ERP Adapter (Romanian)

```typescript
// File: packages/workers/src/adapters/saga-erp.adapter.ts

import { IErpAdapter, ErpStockItem } from './erp-adapter.interface';
import { logger } from '@cerniq/logger';

interface SagaConfig {
  baseUrl: string;
  apiKey: string;
  companyCode: string;
  warehouseCode?: string;
  timeout?: number;
}

export class SagaErpAdapter implements IErpAdapter {
  private config: SagaConfig;
  private httpClient: typeof fetch;

  constructor(config: SagaConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
    this.httpClient = fetch;
  }

  async fetchAllStock(): Promise<ErpStockItem[]> {
    const response = await this.makeRequest('/api/v1/stocuri/toate', {
      method: 'GET',
      params: {
        firma: this.config.companyCode,
        gestiune: this.config.warehouseCode || '*',
      },
    });

    return this.mapSagaToStock(response.stocuri || []);
  }

  async fetchStockChangedSince(since: Date): Promise<ErpStockItem[]> {
    const response = await this.makeRequest('/api/v1/stocuri/modificate', {
      method: 'GET',
      params: {
        firma: this.config.companyCode,
        dataModificareMin: since.toISOString().split('T')[0], // SAGA uses date format
        gestiune: this.config.warehouseCode || '*',
      },
    });

    return this.mapSagaToStock(response.stocuri || []);
  }

  async fetchStockBySku(skus: string[]): Promise<ErpStockItem[]> {
    // SAGA API accepts max 50 SKUs per request
    const results: ErpStockItem[] = [];
    
    for (let i = 0; i < skus.length; i += 50) {
      const batch = skus.slice(i, i + 50);
      const response = await this.makeRequest('/api/v1/stocuri/articole', {
        method: 'POST',
        body: {
          firma: this.config.companyCode,
          coduri: batch,
          gestiune: this.config.warehouseCode || '*',
        },
      });
      results.push(...this.mapSagaToStock(response.stocuri || []));
    }

    return results;
  }

  parseWebhookPayload(payload: any): ErpStockItem[] {
    // SAGA webhook format
    if (!payload.eveniment || payload.eveniment !== 'STOC_MODIFICAT') {
      return [];
    }

    return this.mapSagaToStock(payload.articole || []);
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try {
      await this.makeRequest('/api/v1/status', { method: 'GET' });
      return { healthy: true, latency: Date.now() - start };
    } catch {
      return { healthy: false, latency: Date.now() - start };
    }
  }

  private mapSagaToStock(sagaItems: any[]): ErpStockItem[] {
    return sagaItems.map(item => ({
      sku: item.cod_articol,
      stockTotal: parseFloat(item.cantitate_totala) || 0,
      stockAvailable: parseFloat(item.cantitate_disponibila) || parseFloat(item.cantitate_totala) || 0,
      price: parseFloat(item.pret_vanzare) || undefined,
      currency: item.moneda || 'RON',
      status: this.mapSagaStatus(item.stare),
      warehouse: item.cod_gestiune,
      location: item.locatie,
      lastModified: item.data_modificare ? new Date(item.data_modificare) : undefined,
      batchNumber: item.lot,
      expiryDate: item.data_expirare ? new Date(item.data_expirare) : undefined,
    }));
  }

  private mapSagaStatus(sagaStatus: string): 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' {
    const statusMap: Record<string, 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'> = {
      'A': 'ACTIVE',
      'ACTIV': 'ACTIVE',
      'I': 'INACTIVE',
      'INACTIV': 'INACTIVE',
      'D': 'DISCONTINUED',
      'DEZACTIVAT': 'DISCONTINUED',
    };
    return statusMap[sagaStatus?.toUpperCase()] || 'ACTIVE';
  }

  private async makeRequest(
    endpoint: string, 
    options: { method: string; params?: Record<string, string>; body?: any }
  ): Promise<any> {
    const url = new URL(endpoint, this.config.baseUrl);
    
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await this.httpClient(url.toString(), {
        method: options.method,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`SAGA API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

### 5.3 Custom API Adapter

```typescript
// File: packages/workers/src/adapters/custom-api.adapter.ts

import { IErpAdapter, ErpStockItem } from './erp-adapter.interface';

interface CustomApiConfig {
  baseUrl: string;
  authType: 'bearer' | 'basic' | 'api_key' | 'oauth2';
  credentials: {
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
  };
  endpoints: {
    allStock: string;
    changedStock?: string;
    stockBySku?: string;
  };
  fieldMapping: {
    sku: string;
    stockTotal: string;
    stockAvailable?: string;
    price?: string;
    currency?: string;
    status?: string;
    lastModified?: string;
  };
  timeout?: number;
}

export class CustomApiAdapter implements IErpAdapter {
  private config: CustomApiConfig;

  constructor(config: CustomApiConfig) {
    this.config = {
      timeout: 60000,
      ...config,
    };
  }

  async fetchAllStock(): Promise<ErpStockItem[]> {
    const response = await this.makeRequest(this.config.endpoints.allStock);
    return this.mapResponse(response);
  }

  async fetchStockChangedSince(since: Date): Promise<ErpStockItem[]> {
    const endpoint = this.config.endpoints.changedStock || this.config.endpoints.allStock;
    const url = `${endpoint}?since=${since.toISOString()}`;
    const response = await this.makeRequest(url);
    return this.mapResponse(response);
  }

  async fetchStockBySku(skus: string[]): Promise<ErpStockItem[]> {
    if (this.config.endpoints.stockBySku) {
      const response = await this.makeRequest(this.config.endpoints.stockBySku, {
        method: 'POST',
        body: { skus },
      });
      return this.mapResponse(response);
    }
    // Fallback: fetch all and filter
    const all = await this.fetchAllStock();
    return all.filter(item => skus.includes(item.sku));
  }

  parseWebhookPayload(payload: any): ErpStockItem[] {
    const items = Array.isArray(payload) ? payload : 
                  payload.items || payload.data || [payload];
    return this.mapResponse(items);
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try {
      await this.makeRequest(this.config.endpoints.allStock + '?limit=1');
      return { healthy: true, latency: Date.now() - start };
    } catch {
      return { healthy: false, latency: Date.now() - start };
    }
  }

  private mapResponse(data: any): ErpStockItem[] {
    const items = Array.isArray(data) ? data : data.items || data.data || [];
    const mapping = this.config.fieldMapping;

    return items.map((item: any) => ({
      sku: this.getNestedValue(item, mapping.sku),
      stockTotal: parseFloat(this.getNestedValue(item, mapping.stockTotal)) || 0,
      stockAvailable: mapping.stockAvailable 
        ? parseFloat(this.getNestedValue(item, mapping.stockAvailable)) || undefined
        : undefined,
      price: mapping.price 
        ? parseFloat(this.getNestedValue(item, mapping.price)) || undefined
        : undefined,
      currency: mapping.currency 
        ? this.getNestedValue(item, mapping.currency) 
        : undefined,
      status: mapping.status 
        ? this.normalizeStatus(this.getNestedValue(item, mapping.status))
        : undefined,
      lastModified: mapping.lastModified 
        ? new Date(this.getNestedValue(item, mapping.lastModified))
        : undefined,
    }));
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private normalizeStatus(status: string): 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' {
    if (!status) return 'ACTIVE';
    const lower = status.toLowerCase();
    if (['inactive', 'disabled', 'off'].includes(lower)) return 'INACTIVE';
    if (['discontinued', 'obsolete', 'deleted'].includes(lower)) return 'DISCONTINUED';
    return 'ACTIVE';
  }

  private async makeRequest(url: string, options?: { method?: string; body?: any }): Promise<any> {
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
    const headers = this.buildAuthHeaders();

    const response = await fetch(fullUrl, {
      method: options?.method || 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (this.config.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${this.config.credentials.token}`;
        break;
      case 'basic':
        const encoded = Buffer.from(
          `${this.config.credentials.username}:${this.config.credentials.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
        break;
      case 'api_key':
        headers['X-API-Key'] = this.config.credentials.apiKey!;
        break;
    }

    return headers;
  }
}
```

---

## 6. Database Schema Extensions

### 6.1 Stock Reservations Table

```sql
-- File: packages/database/migrations/0025_stock_reservations.sql

-- Stock reservations table
CREATE TABLE IF NOT EXISTS stock_reservations (
    id VARCHAR(26) PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    negotiation_id UUID NOT NULL REFERENCES negotiations(id),
    reservation_key VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL DEFAULT 'SOFT' CHECK (type IN ('SOFT', 'HARD')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'ACTIVE', 'RELEASED', 'CONSUMED', 'EXPIRED', 'FAILED')),
    priority VARCHAR(10) NOT NULL DEFAULT 'NORMAL' 
        CHECK (priority IN ('NORMAL', 'HIGH', 'URGENT')),
    items_json JSONB NOT NULL DEFAULT '[]',
    total_requested INTEGER NOT NULL DEFAULT 0,
    total_reserved INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ,
    release_reason VARCHAR(20),
    released_by VARCHAR(100),
    release_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_reservation_key UNIQUE (tenant_id, reservation_key)
);

-- Indexes
CREATE INDEX idx_reservations_tenant ON stock_reservations(tenant_id);
CREATE INDEX idx_reservations_negotiation ON stock_reservations(negotiation_id);
CREATE INDEX idx_reservations_status ON stock_reservations(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_reservations_expires ON stock_reservations(expires_at) WHERE status = 'ACTIVE';

-- Stock movements audit table
CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(30) PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    product_id UUID NOT NULL REFERENCES products(id),
    sku VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL 
        CHECK (type IN ('RESERVATION', 'RELEASE', 'SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'SYNC')),
    quantity INTEGER NOT NULL, -- Negative for decreases
    previous_available INTEGER NOT NULL,
    new_available INTEGER NOT NULL,
    reference_type VARCHAR(20), -- 'RESERVATION', 'ORDER', 'SYNC', etc.
    reference_id VARCHAR(50),
    negotiation_id UUID REFERENCES negotiations(id),
    order_id UUID,
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for stock movements
CREATE INDEX idx_movements_tenant ON stock_movements(tenant_id);
CREATE INDEX idx_movements_product ON stock_movements(product_id);
CREATE INDEX idx_movements_sku ON stock_movements(sku);
CREATE INDEX idx_movements_type ON stock_movements(type);
CREATE INDEX idx_movements_created ON stock_movements(created_at DESC);
CREATE INDEX idx_movements_reference ON stock_movements(reference_type, reference_id);

-- Stock sync logs
CREATE TABLE IF NOT EXISTS stock_sync_logs (
    id VARCHAR(30) PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    erp_system VARCHAR(30) NOT NULL,
    sync_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILED')),
    statistics_json JSONB,
    changes_count INTEGER DEFAULT 0,
    conflicts_count INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    duration_ms INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_tenant ON stock_sync_logs(tenant_id);
CREATE INDEX idx_sync_logs_erp ON stock_sync_logs(erp_system);
CREATE INDEX idx_sync_logs_status ON stock_sync_logs(status);
CREATE INDEX idx_sync_logs_completed ON stock_sync_logs(completed_at DESC);

-- ERP integrations configuration
CREATE TABLE IF NOT EXISTS erp_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    erp_system VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    config_encrypted BYTEA NOT NULL, -- Encrypted configuration
    sync_schedule VARCHAR(50) DEFAULT '*/15 * * * *', -- Cron expression
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_tenant_erp UNIQUE (tenant_id, erp_system)
);

CREATE INDEX idx_erp_tenant ON erp_integrations(tenant_id);
CREATE INDEX idx_erp_enabled ON erp_integrations(enabled) WHERE enabled = true;
```

### 6.2 Products Table Extensions

```sql
-- Add stock-related columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_reserved INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS erp_last_sync_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS expected_restock_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 100;

-- Add check constraint
ALTER TABLE products ADD CONSTRAINT chk_stock_positive 
    CHECK (stock_total >= 0 AND stock_available >= 0 AND stock_reserved >= 0);

ALTER TABLE products ADD CONSTRAINT chk_stock_balance 
    CHECK (stock_available + stock_reserved <= stock_total);

-- Create partial index for low stock alerts
CREATE INDEX idx_products_low_stock ON products(tenant_id, sku) 
    WHERE stock_available <= reorder_point AND status = 'ACTIVE';
```

---

## 7. Database Triggers

### 7.1 Auto-Release Expired Reservations

```sql
-- Function to check and release expired reservations
CREATE OR REPLACE FUNCTION fn_release_expired_reservations()
RETURNS void AS $$
DECLARE
    reservation_record RECORD;
BEGIN
    FOR reservation_record IN
        SELECT id, tenant_id, items_json
        FROM stock_reservations
        WHERE status = 'ACTIVE'
          AND expires_at < NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Release the stock
        UPDATE products p
        SET 
            stock_available = p.stock_available + (item->>'reservedQuantity')::integer,
            stock_reserved = GREATEST(0, p.stock_reserved - (item->>'reservedQuantity')::integer),
            updated_at = NOW()
        FROM jsonb_array_elements(reservation_record.items_json) AS item
        WHERE p.tenant_id = reservation_record.tenant_id
          AND p.sku = item->>'sku'
          AND (item->>'reservedQuantity')::integer > 0;

        -- Update reservation status
        UPDATE stock_reservations
        SET 
            status = 'EXPIRED',
            released_at = NOW(),
            release_reason = 'EXPIRED',
            updated_at = NOW()
        WHERE id = reservation_record.id;

        RAISE NOTICE 'Released expired reservation: %', reservation_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Scheduled job (to be called by pg_cron or external scheduler)
-- SELECT cron.schedule('release-expired-reservations', '*/5 * * * *', 'SELECT fn_release_expired_reservations()');
```

### 7.2 Stock Movement Trigger

```sql
-- Trigger to auto-create stock movement on product stock change
CREATE OR REPLACE FUNCTION fn_track_stock_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.stock_available IS DISTINCT FROM NEW.stock_available THEN
        INSERT INTO stock_movements (
            id, tenant_id, product_id, sku, type, quantity,
            previous_available, new_available, notes, created_at
        ) VALUES (
            'mov_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8),
            NEW.tenant_id,
            NEW.id,
            NEW.sku,
            'ADJUSTMENT',
            NEW.stock_available - OLD.stock_available,
            OLD.stock_available,
            NEW.stock_available,
            'Auto-tracked stock change',
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_track_stock_changes
    AFTER UPDATE OF stock_available ON products
    FOR EACH ROW
    EXECUTE FUNCTION fn_track_stock_changes();
```

### 7.3 Low Stock Alert Trigger

```sql
-- Trigger for low stock alerts
CREATE OR REPLACE FUNCTION fn_check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_available <= NEW.reorder_point 
       AND (OLD.stock_available > OLD.reorder_point OR OLD IS NULL) THEN
        -- Insert notification for low stock
        INSERT INTO notifications (
            id, tenant_id, type, severity, title, message, 
            entity_type, entity_id, created_at
        ) VALUES (
            gen_random_uuid(),
            NEW.tenant_id,
            'LOW_STOCK',
            'WARNING',
            'Stoc scăzut: ' || NEW.name,
            format('Produsul %s (SKU: %s) are stoc disponibil de doar %s unități. Punct de recomandă: %s unități.',
                   NEW.name, NEW.sku, NEW.stock_available, NEW.reorder_point),
            'PRODUCT',
            NEW.id,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_low_stock
    AFTER UPDATE OF stock_available ON products
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_low_stock();
```

---

## 8. Queue Configuration

### 8.1 Queue Definitions

```typescript
// File: packages/workers/src/stock/queues.ts

import { Queue, QueueScheduler } from 'bullmq';
import { redis } from '@cerniq/redis';

// Stock Reserve Create Queue
export const stockReserveCreateQueue = new Queue('stock:reserve:create', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});

// Stock Reserve Release Queue
export const stockReserveReleaseQueue = new Queue('stock:reserve:release', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 86400,
      count: 1000,
    },
    removeOnFail: {
      age: 604800,
    },
  },
});

// Stock Sync ERP Queue
export const stockSyncErpQueue = new Queue('stock:sync:erp', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 172800, // 48 hours
      count: 100,
    },
    removeOnFail: {
      age: 604800,
    },
  },
});

// Scheduled jobs
export async function setupStockScheduledJobs() {
  // Check for expired reservations every 5 minutes
  await stockReserveReleaseQueue.add(
    'check-expired',
    { action: 'CHECK_EXPIRED' },
    {
      repeat: {
        pattern: '*/5 * * * *',
      },
      jobId: 'check-expired-reservations',
    }
  );

  // ERP sync every 15 minutes (can be overridden per tenant)
  await stockSyncErpQueue.add(
    'scheduled-incremental',
    { 
      syncType: 'INCREMENTAL',
      allTenants: true,
    },
    {
      repeat: {
        pattern: '*/15 * * * *',
      },
      jobId: 'scheduled-erp-sync',
    }
  );

  // Full ERP sync daily at 2 AM
  await stockSyncErpQueue.add(
    'scheduled-full',
    { 
      syncType: 'FULL',
      allTenants: true,
    },
    {
      repeat: {
        pattern: '0 2 * * *',
      },
      jobId: 'daily-full-sync',
    }
  );
}

// Queue schedulers for delayed jobs
export const reserveCreateScheduler = new QueueScheduler('stock:reserve:create', {
  connection: redis,
});

export const reserveReleaseScheduler = new QueueScheduler('stock:reserve:release', {
  connection: redis,
});

export const syncErpScheduler = new QueueScheduler('stock:sync:erp', {
  connection: redis,
});
```
