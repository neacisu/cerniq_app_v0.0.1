# Etapa 3 - Workers Categoria E: Pricing & Discount (Guardrails)

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-18  
**Author:** Cerniq Development Team  
**Status:** Technical Specification

---

## Table of Contents

1. [Overview](#1-overview)
2. [Worker #16: pricing:discount:calculate](#2-worker-16-pricingdiscountcalculate)
3. [Worker #17: pricing:guardrail:validate](#3-worker-17-pricingguardrailvalidate)
4. [Worker #18: pricing:margin:check](#4-worker-18-pricingmargincheck)
5. [Price Rules Engine](#5-price-rules-engine)
6. [Volume Discount Configuration](#6-volume-discount-configuration)
7. [Monitoring & Alerts](#7-monitoring--alerts)

---

## 1. Overview

### 1.1 Purpose

Categoria E implementează **Pricing Guardrails** - componente critice pentru prevenirea halucinațiilor de preț în agentul AI:

- **Calculare discount** - Determină discount maxim permis
- **Validare preț** - Verifică că prețul menționat de AI este corect
- **Verificare marjă** - Asigură menținerea marjei minime

### 1.2 Critical Path Designation

**⚠️ ACEȘTI WORKERI SUNT CRITICAL PATH**

Sunt apelați de guardrail system înainte de fiecare răspuns AI care menționează prețuri:

```
AI Response Draft → Guardrail System → pricing:guardrail:validate
                                    → pricing:discount:calculate
                                    → pricing:margin:check
                 → VALID: Send to client
                 → INVALID: Regenerate with correction
```

### 1.3 Worker Inventory

| # | Worker Name | Queue | Priority | Critical |
|---|-------------|-------|----------|----------|
| 16 | pricing:discount:calculate | `pricing:discount:calculate` | HIGH | **YES** |
| 17 | pricing:guardrail:validate | `pricing:guardrail:validate` | CRITICAL | **YES** |
| 18 | pricing:margin:check | `pricing:margin:check` | HIGH | **YES** |

### 1.4 Business Rules Summary

| Rule | Description | Default |
|------|-------------|---------|
| **Minimum Margin** | Lowest acceptable margin | 10% |
| **Maximum Discount** | Cap on any discount | 30% |
| **Approval Threshold** | Discount needing manager approval | >15% |
| **Volume Discount Tiers** | Quantity-based discounts | 5/10/25/50/100 units |
| **Client Tier Discounts** | Loyalty-based discounts | Silver 5%, Gold 10%, Platinum 15% |

### 1.5 Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CATEGORY E DEPENDENCIES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   UPSTREAM (requires):                                                       │
│   ├── ai:agent:orchestrate (C) → Calls guardrails for validation            │
│   ├── gold_products → Product catalog with prices                           │
│   ├── price_rules → Discount rules per product/category                     │
│   └── client_tiers → Client loyalty levels                                  │
│                                                                              │
│   DOWNSTREAM (triggers):                                                     │
│   ├── hitl:approval:request (N) → When discount > threshold                 │
│   └── ai:response:regenerate (C) → When validation fails                    │
│                                                                              │
│   DATABASE:                                                                  │
│   ├── gold_products → List prices, cost prices, max discounts               │
│   ├── price_rules → Volume discounts, client discounts                      │
│   ├── shop_settings → Global pricing settings                               │
│   └── discount_approvals → Audit trail for approved discounts               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Worker #16: etapa3:pricing:discount:calculate

### 2.1 Specification

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `etapa3:pricing:discount:calculate` |
| **Concurrency** | 100 |
| **Timeout** | 5,000ms |
| **Retries** | 1 (fast fail for critical path) |
| **Priority** | HIGH |
| **Rate Limit** | None (internal use) |
| **Critical Path** | **YES** - Called before every price quote |

### 2.2 Responsibility

Acest worker calculează **discount maxim permis** pentru un produs:

1. **Fetch base prices** - List price și cost price din catalog
2. **Calculate margin** - Marjă curentă și minimă
3. **Apply volume discounts** - Discount bazat pe cantitate
4. **Apply client discounts** - Discount pentru clienți fideli
5. **Determine max discount** - Cap final bazat pe toate regulile
6. **Check approval requirements** - Manager approval dacă necesar

### 2.3 Job Data Interface

```typescript
// /workers/pricing/discount-calculate.worker.ts

import { z } from 'zod';

/**
 * Discount calculation job data
 */
export const DiscountCalculateJobDataSchema = z.object({
  correlationId: z.string().uuid(),
  shopId: z.string().uuid(),
  sku: z.string(),
  quantity: z.number().int().positive(),
  
  // Optional client context
  clientId: z.string().uuid().optional(),
  clientTier: z.enum(['STANDARD', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
  
  // Requested discount (AI or user proposed)
  requestedDiscount: z.number().min(0).max(100).optional(),
  
  // Context
  negotiationId: z.string().uuid().optional(),
  source: z.enum(['AI_AGENT', 'MANUAL', 'CART_UPDATE']).default('AI_AGENT'),
});

export type DiscountCalculateJobData = z.infer<typeof DiscountCalculateJobDataSchema>;

/**
 * Result interface
 */
export interface DiscountCalculateResult {
  sku: string;
  quantity: number;
  
  // Prices
  listPrice: number;           // Catalog price
  costPrice: number;           // Cost/purchase price
  minimumPrice: number;        // Floor price (with min margin)
  
  // Margins
  currentMargin: number;       // Margin at list price
  minimumMargin: number;       // Configured min margin
  marginAfterDiscount: number; // Margin if discount applied
  
  // Discount components
  baseMaxDiscount: number;     // Product-level max
  volumeDiscount: number;      // Quantity-based
  clientDiscount: number;      // Loyalty-based
  promotionalDiscount: number; // Time-limited promo
  
  // Final calculations
  maxAllowedDiscount: number;  // Combined cap
  recommendedDiscount: number; // Optimal discount
  finalPrice: number;          // Price after discount
  
  // Validation of requested discount
  requestedDiscountValid: boolean;
  requestedDiscountReason?: string;
  suggestedDiscount?: number;  // If requested invalid
  
  // Approval
  requiresApproval: boolean;
  approvalThreshold: number;
  approvalReason?: string;
  
  // Currency
  currency: string;
}
```

### 2.4 Worker Implementation

```typescript
// /workers/pricing/discount-calculate.worker.ts

import { Job, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { db } from '@cerniq/db';
import { 
  gold_products, 
  price_rules,
  shop_settings,
  client_tiers,
} from '@cerniq/db/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { createLogger } from '@cerniq/logger';
import { metricsClient } from '@cerniq/metrics';
import {
  DiscountCalculateJobData,
  DiscountCalculateJobDataSchema,
  DiscountCalculateResult,
} from './schemas';

/**
 * Volume discount tier structure
 */
interface VolumeDiscountTier {
  minQuantity: number;
  maxQuantity: number | null;
  discountPercent: number;
}

/**
 * Client tier discount mapping
 */
const CLIENT_TIER_DISCOUNTS: Record<string, number> = {
  'STANDARD': 0,
  'SILVER': 5,
  'GOLD': 10,
  'PLATINUM': 15,
};

/**
 * Get volume discount for quantity
 */
function calculateVolumeDiscount(
  quantity: number,
  volumeTiers: VolumeDiscountTier[]
): number {
  if (!volumeTiers || volumeTiers.length === 0) return 0;
  
  // Sort tiers by min quantity descending
  const sortedTiers = [...volumeTiers].sort((a, b) => b.minQuantity - a.minQuantity);
  
  // Find applicable tier
  for (const tier of sortedTiers) {
    if (quantity >= tier.minQuantity) {
      if (tier.maxQuantity === null || quantity <= tier.maxQuantity) {
        return tier.discountPercent;
      }
    }
  }
  
  return 0;
}

/**
 * Check for active promotions
 */
async function getActivePromotion(
  shopId: string,
  sku: string,
  productId: string
): Promise<number> {
  const now = new Date();
  
  const promo = await db.query.price_rules.findFirst({
    where: (pr, { and, eq, lte: leq, gte: geq }) => and(
      eq(pr.shop_id, shopId),
      or(
        eq(pr.sku, sku),
        eq(pr.product_id, productId)
      ),
      eq(pr.rule_type, 'PROMOTION'),
      eq(pr.is_active, true),
      leq(pr.start_date, now),
      geq(pr.end_date, now)
    ),
    orderBy: (pr, { desc }) => [desc(pr.discount_percent)],
  });
  
  return promo?.discount_percent || 0;
}

/**
 * Main processor function
 */
export async function discountCalculateProcessor(
  job: Job<DiscountCalculateJobData>,
  logger: Logger
): Promise<DiscountCalculateResult> {
  const startTime = Date.now();
  const data = DiscountCalculateJobDataSchema.parse(job.data);
  const { correlationId, shopId, sku, quantity, clientId, clientTier, requestedDiscount } = data;

  logger.info({
    correlationId,
    sku,
    quantity,
    requestedDiscount,
  }, 'Calculating discount');

  // Fetch product
  const product = await db.query.gold_products.findFirst({
    where: (gp, { and, eq }) => and(
      eq(gp.shop_id, shopId),
      eq(gp.sku, sku)
    ),
  });

  if (!product) {
    throw new Error(`Product ${sku} not found in shop ${shopId}`);
  }

  // Fetch shop settings
  const settings = await db.query.shop_settings.findFirst({
    where: (ss, { eq }) => eq(ss.shop_id, shopId),
  });

  // Base prices
  const listPrice = Number(product.price);
  const costPrice = Number(product.cost_price) || listPrice * 0.6; // Default 40% margin
  
  // Margin settings
  const minimumMargin = settings?.minimum_margin_percent || 10;
  const approvalThreshold = settings?.discount_approval_threshold || 15;
  
  // Calculate margin at list price
  const currentMargin = ((listPrice - costPrice) / listPrice) * 100;
  
  // Calculate minimum price (preserving minimum margin)
  const minimumPrice = costPrice / (1 - minimumMargin / 100);
  
  // Calculate maximum discount based on margin
  const maxDiscountFromMargin = ((listPrice - minimumPrice) / listPrice) * 100;
  
  // Get base max discount from product
  const baseMaxDiscount = Number(product.max_discount_percent) || 20;

  // Get volume discount tiers
  const volumeTiers = product.volume_discounts as VolumeDiscountTier[] || [];
  const volumeDiscount = calculateVolumeDiscount(quantity, volumeTiers);

  // Get client tier discount
  let clientDiscount = 0;
  if (clientTier) {
    clientDiscount = CLIENT_TIER_DISCOUNTS[clientTier] || 0;
  } else if (clientId) {
    // Fetch client tier from database
    const client = await db.query.gold_contacts.findFirst({
      where: (gc, { eq }) => eq(gc.id, clientId),
    });
    if (client?.tier) {
      clientDiscount = CLIENT_TIER_DISCOUNTS[client.tier] || 0;
    }
  }

  // Get promotional discount
  const promotionalDiscount = await getActivePromotion(shopId, sku, product.id);

  // Calculate combined discount (non-cumulative - take highest, capped by margin)
  const combinedDiscount = Math.max(
    baseMaxDiscount,
    volumeDiscount,
    clientDiscount,
    promotionalDiscount
  );
  
  // Cap at margin-preserving maximum
  const maxAllowedDiscount = Math.min(combinedDiscount, maxDiscountFromMargin);
  
  // Recommend optimal discount (volume + client, capped)
  const recommendedDiscount = Math.min(
    volumeDiscount + clientDiscount,
    maxAllowedDiscount
  );

  // Calculate final price
  const finalPrice = listPrice * (1 - recommendedDiscount / 100);
  const marginAfterDiscount = ((finalPrice - costPrice) / finalPrice) * 100;

  // Validate requested discount
  let requestedDiscountValid = true;
  let requestedDiscountReason: string | undefined;
  let suggestedDiscount: number | undefined;

  if (requestedDiscount !== undefined) {
    if (requestedDiscount > maxAllowedDiscount) {
      requestedDiscountValid = false;
      requestedDiscountReason = 
        `Discount-ul de ${requestedDiscount}% depășește maximul permis de ${maxAllowedDiscount.toFixed(1)}%. ` +
        `Marja minimă de ${minimumMargin}% trebuie menținută.`;
      suggestedDiscount = maxAllowedDiscount;
    } else if (requestedDiscount < 0) {
      requestedDiscountValid = false;
      requestedDiscountReason = 'Discount-ul nu poate fi negativ.';
      suggestedDiscount = 0;
    } else {
      requestedDiscountValid = true;
    }
  }

  // Check if approval required
  const effectiveDiscount = requestedDiscount !== undefined 
    ? requestedDiscount 
    : recommendedDiscount;
    
  const requiresApproval = effectiveDiscount > approvalThreshold;
  const approvalReason = requiresApproval
    ? `Discount-ul de ${effectiveDiscount.toFixed(1)}% depășește pragul de aprobare de ${approvalThreshold}%`
    : undefined;

  // Record metrics
  const duration = Date.now() - startTime;
  metricsClient.histogram('discount_calculation_duration_ms', duration);
  metricsClient.increment('discount_calculations_total', {
    has_client_tier: String(!!clientTier),
    has_volume: String(volumeDiscount > 0),
    requires_approval: String(requiresApproval),
  });

  if (!requestedDiscountValid) {
    metricsClient.increment('discount_validation_failures_total', {
      reason: 'exceeds_max',
    });
  }

  logger.info({
    correlationId,
    sku,
    quantity,
    listPrice,
    recommendedDiscount,
    maxAllowedDiscount,
    requestedDiscountValid,
    requiresApproval,
    duration,
  }, 'Discount calculated');

  return {
    sku,
    quantity,
    listPrice,
    costPrice,
    minimumPrice: Math.round(minimumPrice * 100) / 100,
    currentMargin: Math.round(currentMargin * 100) / 100,
    minimumMargin,
    marginAfterDiscount: Math.round(marginAfterDiscount * 100) / 100,
    baseMaxDiscount,
    volumeDiscount,
    clientDiscount,
    promotionalDiscount,
    maxAllowedDiscount: Math.round(maxAllowedDiscount * 100) / 100,
    recommendedDiscount: Math.round(recommendedDiscount * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    requestedDiscountValid,
    requestedDiscountReason,
    suggestedDiscount: suggestedDiscount !== undefined 
      ? Math.round(suggestedDiscount * 100) / 100 
      : undefined,
    requiresApproval,
    approvalThreshold,
    approvalReason,
    currency: 'RON',
  };
}

/**
 * Create worker instance
 */
export function createDiscountCalculateWorker(redis: Redis): Worker {
  const logger = createLogger('pricing:discount:calculate');

  return new Worker(
    'pricing:discount:calculate',
    async (job) => discountCalculateProcessor(job, logger),
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

## 3. Worker #17: etapa3:pricing:guardrail:validate

### 3.1 Specification

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `etapa3:pricing:guardrail:validate` |
| **Concurrency** | 200 |
| **Timeout** | 3,000ms |
| **Retries** | 0 (no retries - fast fail) |
| **Priority** | CRITICAL |
| **Rate Limit** | None |
| **Critical Path** | **YES** - Every AI response with prices |

### 3.2 Responsibility

Acest worker este **GUARDRAIL PRINCIPAL** pentru validarea prețurilor:

1. **Extract prices from AI response** - Parseează prețuri menționate
2. **Cross-reference with database** - Verifică vs catalog
3. **Validate discounts** - Verifică că discounturile sunt permise
4. **Return validation result** - Pass/Fail cu feedback corectiv

### 3.3 Job Data Interface

```typescript
// /workers/pricing/guardrail-validate.worker.ts

import { z } from 'zod';

/**
 * Price mention extracted from AI response
 */
export const PriceMentionSchema = z.object({
  sku: z.string(),
  mentionedPrice: z.number().positive(),
  mentionedDiscount: z.number().min(0).max(100).optional(),
  quantity: z.number().int().positive().optional(),
  context: z.string().optional(), // Text around price mention
});

export type PriceMention = z.infer<typeof PriceMentionSchema>;

/**
 * Job data for price guardrail validation
 */
export const PriceGuardrailJobDataSchema = z.object({
  correlationId: z.string().uuid(),
  shopId: z.string().uuid(),
  negotiationId: z.string().uuid().optional(),
  
  // AI response to validate
  aiResponse: z.string(),
  
  // Extracted price mentions (pre-parsed)
  priceMentions: z.array(PriceMentionSchema).optional(),
  
  // Client context
  clientId: z.string().uuid().optional(),
  clientTier: z.enum(['STANDARD', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
  
  // Validation strictness
  strictMode: z.boolean().default(true), // Reject on any error
});

export type PriceGuardrailJobData = z.infer<typeof PriceGuardrailJobDataSchema>;

/**
 * Validation result per price mention
 */
export interface PriceMentionValidation {
  sku: string;
  mentionedPrice: number;
  catalogPrice: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  correction?: {
    correctPrice: number;
    maxDiscount: number;
    message: string;
  };
}

/**
 * Overall validation result
 */
export interface PriceGuardrailResult {
  valid: boolean;
  strictMode: boolean;
  
  // Detailed validation
  validations: PriceMentionValidation[];
  
  // Summary
  totalMentions: number;
  validMentions: number;
  invalidMentions: number;
  
  // Feedback for AI regeneration
  correctionFeedback?: string;
  
  // Timing
  processingTimeMs: number;
}
```

### 3.4 Worker Implementation

```typescript
// /workers/pricing/guardrail-validate.worker.ts

import { Job, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { db } from '@cerniq/db';
import { gold_products } from '@cerniq/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { createLogger } from '@cerniq/logger';
import { metricsClient } from '@cerniq/metrics';
import {
  PriceGuardrailJobData,
  PriceGuardrailJobDataSchema,
  PriceGuardrailResult,
  PriceMention,
  PriceMentionValidation,
} from './schemas';

/**
 * Regular expressions for extracting prices from Romanian text
 */
const PRICE_PATTERNS = [
  // "500 lei", "500 RON", "500 de lei"
  /(\d+(?:[.,]\d{1,2})?)\s*(?:de\s+)?(?:lei|RON|ron)/gi,
  // "preț: 500", "pret 500"
  /pre[țt](?:ul)?[:=\s]+(\d+(?:[.,]\d{1,2})?)/gi,
  // "€50", "50€", "50 EUR"
  /€\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR|eur)/gi,
];

/**
 * Extract price mentions from AI response
 */
function extractPriceMentions(
  response: string,
  logger: Logger
): PriceMention[] {
  const mentions: PriceMention[] = [];
  const seenPrices = new Set<string>();

  // Try to find SKU-price associations
  // Pattern: "SKU-001 la 500 lei" or "produsul ABC costă 300 RON"
  const skuPricePattern = /([A-Z]{2,6}[-_]?\d{2,6})\s*(?:[-:@]|la|costă?|preț(?:ul)?)\s*(\d+(?:[.,]\d{1,2})?)\s*(?:lei|RON)/gi;
  
  let match;
  while ((match = skuPricePattern.exec(response)) !== null) {
    const sku = match[1].toUpperCase();
    const price = parseFloat(match[2].replace(',', '.'));
    const key = `${sku}-${price}`;
    
    if (!seenPrices.has(key) && price > 0) {
      seenPrices.add(key);
      mentions.push({
        sku,
        mentionedPrice: price,
        context: response.substring(
          Math.max(0, match.index - 30),
          Math.min(response.length, match.index + match[0].length + 30)
        ),
      });
    }
  }

  // Extract discount percentages
  const discountPattern = /(\d{1,2})\s*%\s*(?:discount|reducere|off)/gi;
  while ((match = discountPattern.exec(response)) !== null) {
    const discountPercent = parseInt(match[1], 10);
    // Associate with last mentioned SKU if exists
    if (mentions.length > 0) {
      const lastMention = mentions[mentions.length - 1];
      if (!lastMention.mentionedDiscount) {
        lastMention.mentionedDiscount = discountPercent;
      }
    }
  }

  logger.debug({
    responseLength: response.length,
    mentionsFound: mentions.length,
  }, 'Extracted price mentions');

  return mentions;
}

/**
 * Validate a single price mention
 */
async function validatePriceMention(
  shopId: string,
  mention: PriceMention,
  clientTier: string | undefined,
  logger: Logger
): Promise<PriceMentionValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Fetch product from catalog
  const product = await db.query.gold_products.findFirst({
    where: (gp, { and, eq }) => and(
      eq(gp.shop_id, shopId),
      eq(gp.sku, mention.sku)
    ),
  });

  if (!product) {
    return {
      sku: mention.sku,
      mentionedPrice: mention.mentionedPrice,
      catalogPrice: 0,
      valid: false,
      errors: [`SKU ${mention.sku} nu a fost găsit în catalog`],
      warnings: [],
      correction: {
        correctPrice: 0,
        maxDiscount: 0,
        message: `Produsul ${mention.sku} nu există. Verificați codul produsului.`,
      },
    };
  }

  const catalogPrice = Number(product.price);
  const costPrice = Number(product.cost_price) || catalogPrice * 0.6;
  const maxDiscountPercent = Number(product.max_discount_percent) || 20;
  const minimumMargin = 10; // Default 10%

  // Calculate minimum acceptable price
  const minimumPrice = costPrice / (1 - minimumMargin / 100);

  // Check if mentioned price is valid
  const allowedMaxDiscount = maxDiscountPercent;
  const minimumAllowedPrice = catalogPrice * (1 - allowedMaxDiscount / 100);

  if (mention.mentionedPrice > catalogPrice) {
    // Price higher than catalog - warn but allow
    warnings.push(
      `Prețul menționat (${mention.mentionedPrice} RON) este mai mare decât prețul din catalog (${catalogPrice} RON)`
    );
  } else if (mention.mentionedPrice < minimumPrice) {
    // Price below cost - CRITICAL ERROR
    errors.push(
      `Prețul de ${mention.mentionedPrice} RON este sub costul produsului! ` +
      `Prețul minim permis este ${minimumPrice.toFixed(2)} RON.`
    );
  } else if (mention.mentionedPrice < minimumAllowedPrice) {
    // Price implies discount > max allowed
    const impliedDiscount = ((catalogPrice - mention.mentionedPrice) / catalogPrice) * 100;
    errors.push(
      `Prețul de ${mention.mentionedPrice} RON implică un discount de ${impliedDiscount.toFixed(1)}%, ` +
      `care depășește maximul permis de ${maxDiscountPercent}%.`
    );
  }

  // Validate explicit discount if mentioned
  if (mention.mentionedDiscount !== undefined) {
    if (mention.mentionedDiscount > maxDiscountPercent) {
      errors.push(
        `Discount-ul de ${mention.mentionedDiscount}% depășește maximul permis de ${maxDiscountPercent}%`
      );
    }
    
    // Check if price matches discount
    const expectedPriceWithDiscount = catalogPrice * (1 - mention.mentionedDiscount / 100);
    const priceDifference = Math.abs(mention.mentionedPrice - expectedPriceWithDiscount);
    
    if (priceDifference > 0.5) { // Allow 0.50 RON tolerance
      warnings.push(
        `Prețul menționat (${mention.mentionedPrice} RON) nu corespunde cu discount-ul de ${mention.mentionedDiscount}% ` +
        `(ar trebui să fie ${expectedPriceWithDiscount.toFixed(2)} RON)`
      );
    }
  }

  // Build correction if needed
  let correction;
  if (errors.length > 0) {
    const recommendedPrice = Math.max(minimumAllowedPrice, minimumPrice);
    correction = {
      correctPrice: Math.round(recommendedPrice * 100) / 100,
      maxDiscount: maxDiscountPercent,
      message: `Pentru produsul ${mention.sku}, prețul corect cu discount maxim de ${maxDiscountPercent}% este ${recommendedPrice.toFixed(2)} RON.`,
    };
  }

  return {
    sku: mention.sku,
    mentionedPrice: mention.mentionedPrice,
    catalogPrice,
    valid: errors.length === 0,
    errors,
    warnings,
    correction,
  };
}

/**
 * Main processor function
 */
export async function priceGuardrailProcessor(
  job: Job<PriceGuardrailJobData>,
  logger: Logger
): Promise<PriceGuardrailResult> {
  const startTime = Date.now();
  const data = PriceGuardrailJobDataSchema.parse(job.data);
  const { correlationId, shopId, aiResponse, clientTier, strictMode } = data;

  logger.info({
    correlationId,
    responseLength: aiResponse.length,
    strictMode,
  }, 'Validating prices in AI response');

  // Extract or use provided price mentions
  const priceMentions = data.priceMentions || extractPriceMentions(aiResponse, logger);

  if (priceMentions.length === 0) {
    // No prices to validate
    const processingTime = Date.now() - startTime;
    metricsClient.histogram('price_guardrail_duration_ms', processingTime);
    metricsClient.increment('price_guardrail_validations_total', {
      result: 'no_prices',
    });

    return {
      valid: true,
      strictMode,
      validations: [],
      totalMentions: 0,
      validMentions: 0,
      invalidMentions: 0,
      processingTimeMs: processingTime,
    };
  }

  // Validate each mention
  const validations = await Promise.all(
    priceMentions.map(mention => 
      validatePriceMention(shopId, mention, clientTier, logger)
    )
  );

  const validMentions = validations.filter(v => v.valid).length;
  const invalidMentions = validations.filter(v => !v.valid).length;

  // Determine overall validity
  const valid = strictMode ? invalidMentions === 0 : invalidMentions === 0;

  // Build correction feedback for AI
  let correctionFeedback: string | undefined;
  if (!valid) {
    const corrections = validations
      .filter(v => v.correction)
      .map(v => v.correction!.message);
    
    correctionFeedback = 
      `Răspunsul conține erori de preț care trebuie corectate:\n` +
      corrections.join('\n') +
      `\n\nTe rog regenerează răspunsul cu prețurile corecte.`;
  }

  const processingTime = Date.now() - startTime;

  // Record metrics
  metricsClient.histogram('price_guardrail_duration_ms', processingTime);
  metricsClient.increment('price_guardrail_validations_total', {
    result: valid ? 'valid' : 'invalid',
    strict_mode: String(strictMode),
  });
  
  if (invalidMentions > 0) {
    metricsClient.increment('price_guardrail_errors_total', {
      error_type: 'price_mismatch',
    }, invalidMentions);
  }

  logger.info({
    correlationId,
    valid,
    totalMentions: priceMentions.length,
    validMentions,
    invalidMentions,
    processingTime,
  }, 'Price validation completed');

  return {
    valid,
    strictMode,
    validations,
    totalMentions: priceMentions.length,
    validMentions,
    invalidMentions,
    correctionFeedback,
    processingTimeMs: processingTime,
  };
}

/**
 * Create worker instance
 */
export function createPriceGuardrailWorker(redis: Redis): Worker {
  const logger = createLogger('pricing:guardrail:validate');

  return new Worker(
    'pricing:guardrail:validate',
    async (job) => priceGuardrailProcessor(job, logger),
    {
      connection: redis,
      concurrency: 200, // High concurrency for critical path
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 2000 },
    }
  );
}
```

---

## 4. Worker #18: etapa3:pricing:margin:check

### 4.1 Specification

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `etapa3:pricing:margin:check` |
| **Concurrency** | 100 |
| **Timeout** | 2,000ms |
| **Retries** | 0 |
| **Priority** | HIGH |
| **Rate Limit** | None |
| **Critical Path** | **YES** |

### 4.2 Responsibility

Verifică că **marja minimă** este menținută:

1. **Check individual items** - Margin per produs
2. **Check cart total** - Margin pe întreaga tranzacție
3. **Alert on low margin** - Warning dacă aproape de limită
4. **Block on negative margin** - Hard stop dacă sub cost

### 4.3 Job Data Interface

```typescript
// /workers/pricing/margin-check.worker.ts

import { z } from 'zod';

/**
 * Item to check margin
 */
export const MarginCheckItemSchema = z.object({
  sku: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export type MarginCheckItem = z.infer<typeof MarginCheckItemSchema>;

/**
 * Job data for margin check
 */
export const MarginCheckJobDataSchema = z.object({
  correlationId: z.string().uuid(),
  shopId: z.string().uuid(),
  negotiationId: z.string().uuid().optional(),
  
  // Items to check
  items: z.array(MarginCheckItemSchema),
  
  // Thresholds (optional - use shop settings if not provided)
  minimumMarginPercent: z.number().min(0).max(100).optional(),
  warningMarginPercent: z.number().min(0).max(100).optional(),
});

export type MarginCheckJobData = z.infer<typeof MarginCheckJobDataSchema>;

/**
 * Individual item margin result
 */
export interface ItemMarginResult {
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  lineRevenue: number;
  lineCost: number;
  lineMargin: number;
  marginPercent: number;
  status: 'OK' | 'WARNING' | 'CRITICAL' | 'NEGATIVE';
  message?: string;
}

/**
 * Overall margin check result
 */
export interface MarginCheckResult {
  valid: boolean;
  
  // Individual items
  items: ItemMarginResult[];
  
  // Totals
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  overallMarginPercent: number;
  
  // Status
  status: 'OK' | 'WARNING' | 'CRITICAL' | 'NEGATIVE';
  message: string;
  
  // Thresholds used
  minimumMarginPercent: number;
  warningMarginPercent: number;
}
```

### 4.4 Worker Implementation

```typescript
// /workers/pricing/margin-check.worker.ts

import { Job, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { db } from '@cerniq/db';
import { gold_products, shop_settings } from '@cerniq/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { createLogger } from '@cerniq/logger';
import { metricsClient } from '@cerniq/metrics';
import {
  MarginCheckJobData,
  MarginCheckJobDataSchema,
  MarginCheckResult,
  ItemMarginResult,
  MarginCheckItem,
} from './schemas';

/**
 * Determine margin status
 */
function getMarginStatus(
  marginPercent: number,
  minimum: number,
  warning: number
): 'OK' | 'WARNING' | 'CRITICAL' | 'NEGATIVE' {
  if (marginPercent < 0) return 'NEGATIVE';
  if (marginPercent < minimum) return 'CRITICAL';
  if (marginPercent < warning) return 'WARNING';
  return 'OK';
}

/**
 * Main processor function
 */
export async function marginCheckProcessor(
  job: Job<MarginCheckJobData>,
  logger: Logger
): Promise<MarginCheckResult> {
  const startTime = Date.now();
  const data = MarginCheckJobDataSchema.parse(job.data);
  const { correlationId, shopId, items } = data;

  logger.info({
    correlationId,
    itemCount: items.length,
  }, 'Checking margins');

  // Fetch shop settings
  const settings = await db.query.shop_settings.findFirst({
    where: (ss, { eq }) => eq(ss.shop_id, shopId),
  });

  const minimumMarginPercent = data.minimumMarginPercent || settings?.minimum_margin_percent || 10;
  const warningMarginPercent = data.warningMarginPercent || settings?.warning_margin_percent || 15;

  // Fetch all products at once
  const skus = items.map(i => i.sku);
  const products = await db.query.gold_products.findMany({
    where: (gp, { and, eq, inArray: inArr }) => and(
      eq(gp.shop_id, shopId),
      inArr(gp.sku, skus)
    ),
  });

  const productMap = new Map(products.map(p => [p.sku, p]));

  // Check each item
  const itemResults: ItemMarginResult[] = [];
  let totalRevenue = 0;
  let totalCost = 0;

  for (const item of items) {
    const product = productMap.get(item.sku);
    
    if (!product) {
      itemResults.push({
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: 0,
        lineRevenue: item.unitPrice * item.quantity,
        lineCost: 0,
        lineMargin: item.unitPrice * item.quantity,
        marginPercent: 100, // Unknown cost, assume 100%
        status: 'WARNING',
        message: `Produsul ${item.sku} nu a fost găsit - costul este necunoscut`,
      });
      totalRevenue += item.unitPrice * item.quantity;
      continue;
    }

    const costPrice = Number(product.cost_price) || Number(product.price) * 0.6;
    const effectivePrice = item.discountPercent 
      ? item.unitPrice * (1 - item.discountPercent / 100)
      : item.unitPrice;
    
    const lineRevenue = effectivePrice * item.quantity;
    const lineCost = costPrice * item.quantity;
    const lineMargin = lineRevenue - lineCost;
    const marginPercent = (lineMargin / lineRevenue) * 100;

    const status = getMarginStatus(marginPercent, minimumMarginPercent, warningMarginPercent);

    let message: string | undefined;
    if (status === 'NEGATIVE') {
      message = `CRITIC: Produsul ${item.sku} se vinde SUB COST! Pierdere de ${Math.abs(lineMargin).toFixed(2)} RON`;
    } else if (status === 'CRITICAL') {
      message = `Marja de ${marginPercent.toFixed(1)}% este sub minimul de ${minimumMarginPercent}%`;
    } else if (status === 'WARNING') {
      message = `Marja de ${marginPercent.toFixed(1)}% este aproape de limită`;
    }

    itemResults.push({
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: effectivePrice,
      costPrice,
      lineRevenue: Math.round(lineRevenue * 100) / 100,
      lineCost: Math.round(lineCost * 100) / 100,
      lineMargin: Math.round(lineMargin * 100) / 100,
      marginPercent: Math.round(marginPercent * 100) / 100,
      status,
      message,
    });

    totalRevenue += lineRevenue;
    totalCost += lineCost;
  }

  // Calculate overall margin
  const totalMargin = totalRevenue - totalCost;
  const overallMarginPercent = totalRevenue > 0 
    ? (totalMargin / totalRevenue) * 100 
    : 0;
  
  const overallStatus = getMarginStatus(
    overallMarginPercent, 
    minimumMarginPercent, 
    warningMarginPercent
  );

  // Determine validity (critical or negative = invalid)
  const valid = overallStatus === 'OK' || overallStatus === 'WARNING';
  const hasNegativeItems = itemResults.some(i => i.status === 'NEGATIVE');
  const hasCriticalItems = itemResults.some(i => i.status === 'CRITICAL');

  // Build message
  let message: string;
  if (hasNegativeItems) {
    const negativeCount = itemResults.filter(i => i.status === 'NEGATIVE').length;
    message = `BLOCAT: ${negativeCount} produs(e) se vând sub cost!`;
  } else if (hasCriticalItems || overallStatus === 'CRITICAL') {
    message = `Marja totală de ${overallMarginPercent.toFixed(1)}% este sub minimul de ${minimumMarginPercent}%`;
  } else if (overallStatus === 'WARNING') {
    message = `Atenție: Marja de ${overallMarginPercent.toFixed(1)}% este aproape de limită`;
  } else {
    message = `Marjă OK: ${overallMarginPercent.toFixed(1)}%`;
  }

  // Record metrics
  const duration = Date.now() - startTime;
  metricsClient.histogram('margin_check_duration_ms', duration);
  metricsClient.increment('margin_checks_total', {
    status: overallStatus,
    valid: String(valid),
  });

  if (!valid) {
    metricsClient.increment('margin_violations_total', {
      type: hasNegativeItems ? 'negative' : 'below_minimum',
    });
  }

  logger.info({
    correlationId,
    valid,
    overallStatus,
    overallMarginPercent: overallMarginPercent.toFixed(1),
    duration,
  }, 'Margin check completed');

  return {
    valid: valid && !hasNegativeItems,
    items: itemResults,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalMargin: Math.round(totalMargin * 100) / 100,
    overallMarginPercent: Math.round(overallMarginPercent * 100) / 100,
    status: hasNegativeItems ? 'NEGATIVE' : overallStatus,
    message,
    minimumMarginPercent,
    warningMarginPercent,
  };
}

/**
 * Create worker instance
 */
export function createMarginCheckWorker(redis: Redis): Worker {
  const logger = createLogger('pricing:margin:check');

  return new Worker(
    'pricing:margin:check',
    async (job) => marginCheckProcessor(job, logger),
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

## 5. Price Rules Engine

### 5.1 Rule Types

```typescript
// /workers/pricing/types/rules.ts

/**
 * Types of pricing rules
 */
export enum PriceRuleType {
  BASE_DISCOUNT = 'BASE_DISCOUNT',       // Product-level max discount
  VOLUME_TIER = 'VOLUME_TIER',           // Quantity-based discount
  CLIENT_TIER = 'CLIENT_TIER',           // Customer loyalty discount
  PROMOTION = 'PROMOTION',               // Time-limited promo
  BUNDLE = 'BUNDLE',                     // Bundle discount
  MARGIN_FLOOR = 'MARGIN_FLOOR',         // Minimum margin rule
}

/**
 * Rule priority (higher = takes precedence)
 */
export enum RulePriority {
  DEFAULT = 0,
  CATEGORY = 10,
  PRODUCT = 20,
  CLIENT = 30,
  PROMOTION = 40,
  MANAGER_OVERRIDE = 100,
}

/**
 * Price rule definition
 */
export interface PriceRule {
  id: string;
  shopId: string;
  ruleType: PriceRuleType;
  priority: RulePriority;
  
  // Scope
  sku?: string;           // Specific product
  categoryId?: string;    // Category-wide
  clientTier?: string;    // Client tier
  
  // Rule configuration
  discountPercent?: number;
  volumeTiers?: VolumeDiscountTier[];
  marginFloor?: number;
  
  // Time bounds
  startDate?: Date;
  endDate?: Date;
  
  // Status
  isActive: boolean;
}
```

### 5.2 Rule Resolution Algorithm

```typescript
// /workers/pricing/engine/rule-resolver.ts

/**
 * Resolve applicable rules for a pricing context
 */
export async function resolveApplicableRules(
  shopId: string,
  sku: string,
  categoryId: string | null,
  clientTier: string | null,
  quantity: number
): Promise<{
  baseMaxDiscount: number;
  volumeDiscount: number;
  clientDiscount: number;
  promotionalDiscount: number;
  marginFloor: number;
  appliedRules: PriceRule[];
}> {
  const now = new Date();
  
  // Fetch all potentially applicable rules
  const rules = await db.query.price_rules.findMany({
    where: (pr, { and, eq, or, lte, gte, isNull }) => and(
      eq(pr.shop_id, shopId),
      eq(pr.is_active, true),
      or(
        isNull(pr.start_date),
        lte(pr.start_date, now)
      ),
      or(
        isNull(pr.end_date),
        gte(pr.end_date, now)
      ),
      or(
        isNull(pr.sku),
        eq(pr.sku, sku)
      ),
      or(
        isNull(pr.category_id),
        eq(pr.category_id, categoryId)
      )
    ),
    orderBy: (pr, { desc }) => [desc(pr.priority)],
  });

  const appliedRules: PriceRule[] = [];
  let baseMaxDiscount = 20; // Default
  let volumeDiscount = 0;
  let clientDiscount = 0;
  let promotionalDiscount = 0;
  let marginFloor = 10; // Default 10%

  for (const rule of rules) {
    switch (rule.rule_type) {
      case PriceRuleType.BASE_DISCOUNT:
        if (rule.discount_percent !== null) {
          baseMaxDiscount = rule.discount_percent;
          appliedRules.push(rule);
        }
        break;
        
      case PriceRuleType.VOLUME_TIER:
        if (rule.volume_tiers) {
          const tierDiscount = calculateVolumeDiscount(
            quantity, 
            rule.volume_tiers as VolumeDiscountTier[]
          );
          if (tierDiscount > volumeDiscount) {
            volumeDiscount = tierDiscount;
            appliedRules.push(rule);
          }
        }
        break;
        
      case PriceRuleType.CLIENT_TIER:
        if (rule.client_tier === clientTier && rule.discount_percent !== null) {
          clientDiscount = rule.discount_percent;
          appliedRules.push(rule);
        }
        break;
        
      case PriceRuleType.PROMOTION:
        if (rule.discount_percent !== null && rule.discount_percent > promotionalDiscount) {
          promotionalDiscount = rule.discount_percent;
          appliedRules.push(rule);
        }
        break;
        
      case PriceRuleType.MARGIN_FLOOR:
        if (rule.margin_floor !== null) {
          marginFloor = rule.margin_floor;
          appliedRules.push(rule);
        }
        break;
    }
  }

  return {
    baseMaxDiscount,
    volumeDiscount,
    clientDiscount,
    promotionalDiscount,
    marginFloor,
    appliedRules,
  };
}
```

---

## 6. Volume Discount Configuration

### 6.1 Standard Tiers

```typescript
// /workers/pricing/config/volume-tiers.ts

/**
 * Default volume discount tiers for Cerniq agricultural products
 */
export const DEFAULT_VOLUME_TIERS: VolumeDiscountTier[] = [
  { minQuantity: 5, maxQuantity: 9, discountPercent: 2 },
  { minQuantity: 10, maxQuantity: 24, discountPercent: 5 },
  { minQuantity: 25, maxQuantity: 49, discountPercent: 8 },
  { minQuantity: 50, maxQuantity: 99, discountPercent: 10 },
  { minQuantity: 100, maxQuantity: null, discountPercent: 15 },
];

/**
 * Premium product tiers (lower discounts)
 */
export const PREMIUM_VOLUME_TIERS: VolumeDiscountTier[] = [
  { minQuantity: 10, maxQuantity: 24, discountPercent: 3 },
  { minQuantity: 25, maxQuantity: 49, discountPercent: 5 },
  { minQuantity: 50, maxQuantity: 99, discountPercent: 7 },
  { minQuantity: 100, maxQuantity: null, discountPercent: 10 },
];

/**
 * Seasonal/promotional tiers
 */
export const SEASONAL_VOLUME_TIERS: VolumeDiscountTier[] = [
  { minQuantity: 3, maxQuantity: 9, discountPercent: 5 },
  { minQuantity: 10, maxQuantity: 24, discountPercent: 10 },
  { minQuantity: 25, maxQuantity: 49, discountPercent: 15 },
  { minQuantity: 50, maxQuantity: null, discountPercent: 20 },
];
```

### 6.2 Client Tier Definitions

```typescript
// /workers/pricing/config/client-tiers.ts

/**
 * Client tier requirements and benefits
 */
export const CLIENT_TIERS = {
  STANDARD: {
    minPurchases: 0,
    minTotalSpend: 0,
    discountPercent: 0,
    creditDays: 0,
    prioritySupport: false,
  },
  SILVER: {
    minPurchases: 3,
    minTotalSpend: 5000,
    discountPercent: 5,
    creditDays: 15,
    prioritySupport: false,
  },
  GOLD: {
    minPurchases: 10,
    minTotalSpend: 25000,
    discountPercent: 10,
    creditDays: 30,
    prioritySupport: true,
  },
  PLATINUM: {
    minPurchases: 25,
    minTotalSpend: 100000,
    discountPercent: 15,
    creditDays: 45,
    prioritySupport: true,
  },
};

/**
 * Automatically determine client tier based on history
 */
export async function calculateClientTier(
  shopId: string,
  clientId: string
): Promise<string> {
  const stats = await db.query.client_purchase_stats.findFirst({
    where: (cps, { and, eq }) => and(
      eq(cps.shop_id, shopId),
      eq(cps.client_id, clientId)
    ),
  });

  if (!stats) return 'STANDARD';

  const purchases = stats.total_purchases || 0;
  const totalSpend = Number(stats.total_spend) || 0;

  // Check tiers from highest to lowest
  if (
    purchases >= CLIENT_TIERS.PLATINUM.minPurchases &&
    totalSpend >= CLIENT_TIERS.PLATINUM.minTotalSpend
  ) {
    return 'PLATINUM';
  }
  
  if (
    purchases >= CLIENT_TIERS.GOLD.minPurchases &&
    totalSpend >= CLIENT_TIERS.GOLD.minTotalSpend
  ) {
    return 'GOLD';
  }
  
  if (
    purchases >= CLIENT_TIERS.SILVER.minPurchases &&
    totalSpend >= CLIENT_TIERS.SILVER.minTotalSpend
  ) {
    return 'SILVER';
  }

  return 'STANDARD';
}
```

---

## 7. Monitoring & Alerts

### 7.1 Prometheus Metrics

```typescript
// /workers/pricing/metrics.ts

import { Counter, Histogram, Gauge } from 'prom-client';

// Discount calculations
export const discountCalculationsTotal = new Counter({
  name: 'pricing_discount_calculations_total',
  help: 'Total discount calculations',
  labelNames: ['has_client_tier', 'has_volume', 'requires_approval'],
});

export const discountValidationFailures = new Counter({
  name: 'pricing_discount_validation_failures_total',
  help: 'Discount validation failures',
  labelNames: ['reason'],
});

export const calculationDuration = new Histogram({
  name: 'pricing_discount_calculation_duration_ms',
  help: 'Discount calculation time',
  buckets: [5, 10, 25, 50, 100, 250, 500],
});

// Guardrail validations
export const guardrailValidationsTotal = new Counter({
  name: 'pricing_guardrail_validations_total',
  help: 'Total guardrail validations',
  labelNames: ['result', 'strict_mode'],
});

export const guardrailErrorsTotal = new Counter({
  name: 'pricing_guardrail_errors_total',
  help: 'Guardrail validation errors',
  labelNames: ['error_type'],
});

export const guardrailDuration = new Histogram({
  name: 'pricing_guardrail_duration_ms',
  help: 'Guardrail validation time',
  buckets: [10, 25, 50, 100, 250, 500, 1000],
});

// Margin checks
export const marginChecksTotal = new Counter({
  name: 'pricing_margin_checks_total',
  help: 'Total margin checks',
  labelNames: ['status', 'valid'],
});

export const marginViolationsTotal = new Counter({
  name: 'pricing_margin_violations_total',
  help: 'Margin violations detected',
  labelNames: ['type'],
});

// Business metrics
export const averageDiscountGauge = new Gauge({
  name: 'pricing_average_discount_percent',
  help: 'Average discount percentage',
  labelNames: ['shop_id'],
});

export const averageMarginGauge = new Gauge({
  name: 'pricing_average_margin_percent',
  help: 'Average margin percentage',
  labelNames: ['shop_id'],
});
```

### 7.2 Grafana Dashboard

```json
{
  "title": "Pricing Guardrails Dashboard",
  "uid": "pricing-guardrails",
  "panels": [
    {
      "title": "Guardrail Validation Rate",
      "type": "stat",
      "targets": [
        {
          "expr": "sum(rate(pricing_guardrail_validations_total{result='valid'}[1h])) / sum(rate(pricing_guardrail_validations_total[1h])) * 100",
          "legendFormat": "Pass Rate %"
        }
      ],
      "thresholds": {
        "steps": [
          { "color": "red", "value": 0 },
          { "color": "yellow", "value": 90 },
          { "color": "green", "value": 98 }
        ]
      }
    },
    {
      "title": "Guardrail Failures by Type",
      "type": "piechart",
      "targets": [
        {
          "expr": "sum(increase(pricing_guardrail_errors_total[24h])) by (error_type)",
          "legendFormat": "{{error_type}}"
        }
      ]
    },
    {
      "title": "Validation Latency P99",
      "type": "timeseries",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, sum(rate(pricing_guardrail_duration_ms_bucket[5m])) by (le))",
          "legendFormat": "P99"
        },
        {
          "expr": "histogram_quantile(0.50, sum(rate(pricing_guardrail_duration_ms_bucket[5m])) by (le))",
          "legendFormat": "P50"
        }
      ]
    },
    {
      "title": "Margin Violations",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(rate(pricing_margin_violations_total[1h])) by (type)",
          "legendFormat": "{{type}}"
        }
      ]
    },
    {
      "title": "Average Discount Applied",
      "type": "gauge",
      "targets": [
        {
          "expr": "avg(pricing_average_discount_percent)",
          "legendFormat": "Avg Discount %"
        }
      ],
      "thresholds": {
        "steps": [
          { "color": "green", "value": 0 },
          { "color": "yellow", "value": 10 },
          { "color": "red", "value": 20 }
        ]
      }
    },
    {
      "title": "Average Margin",
      "type": "gauge",
      "targets": [
        {
          "expr": "avg(pricing_average_margin_percent)",
          "legendFormat": "Avg Margin %"
        }
      ],
      "thresholds": {
        "steps": [
          { "color": "red", "value": 0 },
          { "color": "yellow", "value": 10 },
          { "color": "green", "value": 20 }
        ]
      }
    }
  ]
}
```

### 7.3 Alert Rules

```yaml
# /monitoring/alerts/pricing-guardrails.yaml
groups:
  - name: pricing-guardrails
    rules:
      - alert: HighGuardrailFailureRate
        expr: >
          sum(rate(pricing_guardrail_validations_total{result='invalid'}[15m])) /
          sum(rate(pricing_guardrail_validations_total[15m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High pricing guardrail failure rate"
          description: "More than 10% of AI responses failing price validation"
      
      - alert: MarginViolationDetected
        expr: >
          sum(rate(pricing_margin_violations_total{type='negative'}[15m])) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "CRITICAL: Negative margin detected"
          description: "Products being sold below cost!"
      
      - alert: SlowGuardrailValidation
        expr: >
          histogram_quantile(0.99, sum(rate(pricing_guardrail_duration_ms_bucket[5m])) by (le)) > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow guardrail validation"
          description: "P99 validation time exceeds 500ms"
      
      - alert: HighApprovalRate
        expr: >
          sum(rate(pricing_discount_calculations_total{requires_approval='true'}[1h])) /
          sum(rate(pricing_discount_calculations_total[1h])) > 0.2
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "High discount approval rate"
          description: "More than 20% of discounts require manager approval"
      
      - alert: AverageMarginLow
        expr: avg(pricing_average_margin_percent) < 12
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Average margin trending low"
          description: "Average transaction margin below 12%"
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// /workers/pricing/__tests__/discount-calculate.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { discountCalculateProcessor } from '../discount-calculate.worker';

describe('Discount Calculate Worker', () => {
  describe('Volume discounts', () => {
    it('applies 0% for quantity < 5', () => {
      const discount = calculateVolumeDiscount(3, DEFAULT_VOLUME_TIERS);
      expect(discount).toBe(0);
    });
    
    it('applies 5% for quantity 10-24', () => {
      const discount = calculateVolumeDiscount(15, DEFAULT_VOLUME_TIERS);
      expect(discount).toBe(5);
    });
    
    it('applies 15% for quantity >= 100', () => {
      const discount = calculateVolumeDiscount(150, DEFAULT_VOLUME_TIERS);
      expect(discount).toBe(15);
    });
  });
  
  describe('Margin preservation', () => {
    it('caps discount to preserve minimum margin', async () => {
      const result = await discountCalculateProcessor(createMockJob({
        sku: 'TEST-001',
        quantity: 1,
        requestedDiscount: 50, // Too high
      }), mockLogger);
      
      expect(result.requestedDiscountValid).toBe(false);
      expect(result.suggestedDiscount).toBeLessThanOrEqual(result.maxAllowedDiscount);
    });
    
    it('calculates correct minimum price from margin', () => {
      // Cost 60, margin 10% -> min price = 60 / 0.9 = 66.67
      const costPrice = 60;
      const minimumMargin = 10;
      const expectedMinPrice = costPrice / (1 - minimumMargin / 100);
      
      expect(expectedMinPrice).toBeCloseTo(66.67, 2);
    });
  });
  
  describe('Client tier discounts', () => {
    it('applies PLATINUM tier discount', async () => {
      const result = await discountCalculateProcessor(createMockJob({
        sku: 'TEST-001',
        quantity: 1,
        clientTier: 'PLATINUM',
      }), mockLogger);
      
      expect(result.clientDiscount).toBe(15);
    });
  });
});
```

### 8.2 Integration Tests

```typescript
// /workers/pricing/__tests__/guardrail.integration.test.ts

import { describe, it, expect } from 'vitest';
import { Queue } from 'bullmq';

describe('Price Guardrail Integration', () => {
  let guardrailQueue: Queue;
  
  beforeAll(() => {
    guardrailQueue = new Queue('pricing:guardrail:validate');
  });
  
  it('validates correct prices in AI response', async () => {
    const job = await guardrailQueue.add('validate', {
      correlationId: crypto.randomUUID(),
      shopId: TEST_SHOP_ID,
      aiResponse: 'Produsul TEST-001 este disponibil la prețul de 100 RON.',
      strictMode: true,
    });
    
    const result = await job.waitUntilFinished(guardrailQueue.events, 5000);
    
    expect(result.valid).toBe(true);
  });
  
  it('rejects below-cost prices', async () => {
    const job = await guardrailQueue.add('validate', {
      correlationId: crypto.randomUUID(),
      shopId: TEST_SHOP_ID,
      aiResponse: 'Vă ofer produsul TEST-001 la doar 30 RON!', // Below 60 RON cost
      strictMode: true,
    });
    
    const result = await job.waitUntilFinished(guardrailQueue.events, 5000);
    
    expect(result.valid).toBe(false);
    expect(result.correctionFeedback).toContain('sub cost');
  });
});
```

---

## 9. Document Information

| Field | Value |
|-------|-------|
| **Document ID** | ETAPA3-WORKERS-E-001 |
| **Version** | 1.0.0 |
| **Created** | 2026-01-18 |
| **Last Modified** | 2026-01-18 |
| **Author** | Cerniq Development Team |
| **Reviewers** | Technical Lead, Finance Team |
| **Status** | Draft |

### Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-18 | Dev Team | Initial documentation |

---

*End of Etapa 3 - Workers Categoria E: Pricing & Discount (Guardrails)*
