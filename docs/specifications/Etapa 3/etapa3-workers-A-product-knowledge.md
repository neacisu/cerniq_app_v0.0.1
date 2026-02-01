# Etapa 3 - Workers Categoria A: Product Knowledge
## Sincronizare, Embeddings și Validare Produse

**Versiune:** 1.0  
**Data:** Ianuarie 2026  
**Categoria:** A - Product Knowledge  
**Workers:** 6 (5 core + 1 adițional)  
**Criticalitate:** 2 workers critici (#4, #5)

---

## Cuprins

1. [Viziune Categoria A](#1-viziune-categoria-a)
2. [Worker #1: product:sync:shopify](#2-worker-1-productsyncshopify)
3. [Worker #2: product:embedding:generate](#3-worker-2-productembeddinggenerate)
4. [Worker #3: product:chunk:create](#4-worker-3-productchunkcreate)
5. [Worker #4: product:stock:realtime-check](#5-worker-4-productstockrealtime-check)
6. [Worker #5: product:price:validate](#6-worker-5-productpricevalidate)
7. [Worker #6: product:category:sync](#7-worker-6-productcategorysync)
8. [Dependențe și Triggere](#8-dependențe-și-triggere)
9. [Monitorizare și Alertare](#9-monitorizare-și-alertare)

---

## 1. Viziune Categoria A

### 1.1 Scopul Categoriei

Categoria A gestionează **cunoașterea produselor** în sistem:
- Sincronizare cu surse externe (Shopify, ERP)
- Generare embeddings pentru căutare semantică
- Chunking pentru RAG (Retrieval-Augmented Generation)
- Validare stoc și preț în timp real

### 1.2 Fluxul de Date

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    PRODUCT KNOWLEDGE PIPELINE                                   │
│                                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │   SHOPIFY   │───▶│   SYNC      │───▶│  EMBEDDING  │───▶│   CHUNK     │    │
│   │   Webhook   │    │   Worker    │    │   Worker    │    │   Worker    │    │
│   │             │    │   (#1)      │    │   (#2)      │    │   (#3)      │    │
│   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    │
│                            │                  │                  │             │
│                            ▼                  ▼                  ▼             │
│                    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│                    │ gold_       │    │ gold_       │    │ gold_       │      │
│                    │ products    │    │ product_    │    │ product_    │      │
│                    │             │    │ embeddings  │    │ chunks      │      │
│                    └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                                                 │
│   Runtime Validation (Critical Path):                                          │
│   ┌─────────────┐    ┌─────────────┐                                          │
│   │   STOCK     │    │   PRICE     │  ◄── Guardrails calls                    │
│   │   CHECK     │    │   VALIDATE  │                                          │
│   │   (#4)      │    │   (#5)      │                                          │
│   └─────────────┘    └─────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Metrici Cheie

| Metrică | Target | Alertă |
|---------|--------|--------|
| Sync Latency | < 5s | > 10s |
| Embedding Generation | < 2s/product | > 5s/product |
| Stock Check Response | < 100ms | > 500ms |
| Price Validation | < 50ms | > 200ms |
| Chunk Creation | < 1s/product | > 3s/product |

---

## 2. Worker #1: etapa3:product:sync:shopify

### 2.1 Specificații Tehnice

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `etapa3:product:sync:shopify` |
| **Categoria** | A - Product Knowledge |
| **Index** | #1 |
| **Rate Limit** | 40/sec (Shopify API limit) |
| **Concurrency** | 10 |
| **Timeout** | 30s |
| **Retries** | 3 |
| **Backoff** | Exponential (1s, 2s, 4s) |
| **Critical** | Nu |
| **Priority** | Normal (50) |

### 2.2 Responsabilitate

Sincronizează produsele din Shopify cu tabelul `gold_products`:
- Recepționează webhooks de la Shopify (create/update/delete)
- Mapează câmpurile Shopify → schema internă
- Actualizează `search_vector` și `name_trigram` pentru căutare
- Declanșează embedding generation pentru produsele modificate

### 2.3 Job Data Interface

```typescript
// packages/workers/src/etapa3/types/product-sync.types.ts

import { z } from 'zod';

// Shopify Product Webhook Payload
export const ShopifyProductWebhookSchema = z.object({
  id: z.number(),
  title: z.string(),
  body_html: z.string().nullable(),
  vendor: z.string(),
  product_type: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  published_at: z.string().datetime().nullable(),
  handle: z.string(),
  status: z.enum(['active', 'archived', 'draft']),
  tags: z.string(), // comma-separated
  variants: z.array(z.object({
    id: z.number(),
    product_id: z.number(),
    title: z.string(),
    sku: z.string().nullable(),
    price: z.string(), // Shopify sends as string
    compare_at_price: z.string().nullable(),
    inventory_quantity: z.number(),
    inventory_management: z.enum(['shopify', 'manual', null]).nullable(),
    weight: z.number().nullable(),
    weight_unit: z.enum(['kg', 'g', 'lb', 'oz']).nullable(),
    barcode: z.string().nullable(),
    requires_shipping: z.boolean()
  })),
  images: z.array(z.object({
    id: z.number(),
    product_id: z.number(),
    position: z.number(),
    src: z.string().url(),
    alt: z.string().nullable()
  })),
  options: z.array(z.object({
    id: z.number(),
    product_id: z.number(),
    name: z.string(),
    position: z.number(),
    values: z.array(z.string())
  }))
});

export type ShopifyProductWebhook = z.infer<typeof ShopifyProductWebhookSchema>;

// Job Data pentru Sync
export const ProductSyncJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  action: z.enum(['create', 'update', 'delete']),
  shopifyProduct: ShopifyProductWebhookSchema.optional(),
  shopifyProductId: z.number(),
  webhookTopic: z.string(),
  webhookId: z.string(),
  receivedAt: z.string().datetime()
});

export type ProductSyncJobData = z.infer<typeof ProductSyncJobDataSchema>;

// Rezultatul sincronizării
export const ProductSyncResultSchema = z.object({
  success: z.boolean(),
  action: z.enum(['created', 'updated', 'deleted', 'skipped']),
  productId: z.string().uuid().optional(),
  sku: z.string().optional(),
  shopifyId: z.number(),
  changedFields: z.array(z.string()).optional(),
  embeddingTriggered: z.boolean(),
  duration_ms: z.number(),
  error: z.string().optional()
});

export type ProductSyncResult = z.infer<typeof ProductSyncResultSchema>;
```

### 2.4 Implementare Worker

```typescript
// packages/workers/src/etapa3/workers/product-sync-shopify.worker.ts

import { Worker, Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { db } from '@cerniq/database';
import { goldProducts } from '@cerniq/database/schema/etapa3';
import { 
  ProductSyncJobData, 
  ProductSyncJobDataSchema,
  ProductSyncResult 
} from '../types/product-sync.types';
import { redisConnection } from '@cerniq/shared/redis';
import { logger } from '@cerniq/shared/logger';
import { metrics } from '@cerniq/shared/metrics';
import { embeddingQueue } from '../queues';
import { stripHtml } from '@cerniq/shared/utils';

const QUEUE_NAME = 'product:sync:shopify';

export const productSyncShopifyWorker = new Worker<ProductSyncJobData, ProductSyncResult>(
  QUEUE_NAME,
  async (job: Job<ProductSyncJobData>): Promise<ProductSyncResult> => {
    const startTime = Date.now();
    const timer = metrics.histogram('worker_duration_ms', { queue: QUEUE_NAME });
    
    try {
      // 1. Validare input
      const data = ProductSyncJobDataSchema.parse(job.data);
      
      logger.info('Product sync started', {
        jobId: job.id,
        tenantId: data.tenantId,
        action: data.action,
        shopifyId: data.shopifyProductId
      });

      // 2. Handle DELETE
      if (data.action === 'delete') {
        const deleted = await db
          .update(goldProducts)
          .set({ 
            status: 'DISCONTINUED',
            updated_at: new Date()
          })
          .where(and(
            eq(goldProducts.tenant_id, data.tenantId),
            eq(goldProducts.shopify_id, data.shopifyProductId.toString())
          ))
          .returning({ id: goldProducts.id, sku: goldProducts.sku });

        if (deleted.length === 0) {
          return {
            success: true,
            action: 'skipped',
            shopifyId: data.shopifyProductId,
            embeddingTriggered: false,
            duration_ms: Date.now() - startTime
          };
        }

        metrics.counter('products_synced_total', { action: 'deleted' }).inc();
        
        return {
          success: true,
          action: 'deleted',
          productId: deleted[0].id,
          sku: deleted[0].sku,
          shopifyId: data.shopifyProductId,
          embeddingTriggered: false,
          duration_ms: Date.now() - startTime
        };
      }

      // 3. Handle CREATE/UPDATE
      if (!data.shopifyProduct) {
        throw new Error('Shopify product data required for create/update');
      }

      const shopifyProduct = data.shopifyProduct;
      
      // 4. Map Shopify → Internal Schema
      const primaryVariant = shopifyProduct.variants[0];
      const sku = primaryVariant?.sku || `SHOP-${shopifyProduct.id}`;
      
      const productData = {
        tenant_id: data.tenantId,
        sku: sku,
        name: shopifyProduct.title,
        description: stripHtml(shopifyProduct.body_html || ''),
        category_path: shopifyProduct.product_type || 'Uncategorized',
        brand: shopifyProduct.vendor,
        base_price: parseFloat(primaryVariant?.price || '0'),
        current_price: parseFloat(primaryVariant?.price || '0'),
        compare_at_price: primaryVariant?.compare_at_price 
          ? parseFloat(primaryVariant.compare_at_price) 
          : null,
        unit: 'BUC' as const,
        shopify_id: shopifyProduct.id.toString(),
        shopify_handle: shopifyProduct.handle,
        status: mapShopifyStatus(shopifyProduct.status),
        specifications: extractSpecifications(shopifyProduct),
        tags: shopifyProduct.tags.split(',').map(t => t.trim()).filter(Boolean),
        images: shopifyProduct.images.map(img => ({
          url: img.src,
          alt: img.alt,
          position: img.position
        })),
        updated_at: new Date()
      };

      // 5. Upsert în baza de date
      const existing = await db.query.goldProducts.findFirst({
        where: and(
          eq(goldProducts.tenant_id, data.tenantId),
          eq(goldProducts.shopify_id, shopifyProduct.id.toString())
        ),
        columns: { id: true, sku: true }
      });

      let result: { id: string; sku: string };
      let action: 'created' | 'updated';
      let changedFields: string[] = [];

      if (existing) {
        // UPDATE
        const updated = await db
          .update(goldProducts)
          .set(productData)
          .where(eq(goldProducts.id, existing.id))
          .returning({ id: goldProducts.id, sku: goldProducts.sku });
        
        result = updated[0];
        action = 'updated';
        changedFields = detectChangedFields(existing, productData);
      } else {
        // CREATE
        const created = await db
          .insert(goldProducts)
          .values({
            ...productData,
            created_at: new Date()
          })
          .returning({ id: goldProducts.id, sku: goldProducts.sku });
        
        result = created[0];
        action = 'created';
      }

      // 6. Trigger Embedding Generation
      await embeddingQueue.add('generate', {
        tenantId: data.tenantId,
        productId: result.id,
        sku: result.sku,
        action: action,
        priority: action === 'created' ? 'high' : 'normal'
      }, {
        priority: action === 'created' ? 10 : 50,
        removeOnComplete: 1000,
        removeOnFail: 5000
      });

      metrics.counter('products_synced_total', { action }).inc();
      timer.observe(Date.now() - startTime);

      logger.info('Product sync completed', {
        jobId: job.id,
        productId: result.id,
        sku: result.sku,
        action,
        duration_ms: Date.now() - startTime
      });

      return {
        success: true,
        action,
        productId: result.id,
        sku: result.sku,
        shopifyId: data.shopifyProductId,
        changedFields,
        embeddingTriggered: true,
        duration_ms: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Product sync failed', {
        jobId: job.id,
        error: errorMessage,
        shopifyId: job.data.shopifyProductId
      });

      metrics.counter('products_sync_errors_total').inc();

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
    limiter: {
      max: 40,
      duration: 1000
    },
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        return Math.min(1000 * Math.pow(2, attemptsMade - 1), 30000);
      }
    }
  }
);

// Helper Functions

function mapShopifyStatus(status: string): 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' {
  switch (status) {
    case 'active': return 'ACTIVE';
    case 'draft': return 'INACTIVE';
    case 'archived': return 'DISCONTINUED';
    default: return 'INACTIVE';
  }
}

function extractSpecifications(product: ShopifyProductWebhook): Record<string, string> {
  const specs: Record<string, string> = {};
  
  // Extract from metafields if available
  if (product.options) {
    product.options.forEach(opt => {
      if (opt.name !== 'Title' && opt.values.length > 0) {
        specs[opt.name] = opt.values.join(', ');
      }
    });
  }
  
  const variant = product.variants[0];
  if (variant?.weight && variant?.weight_unit) {
    specs['Greutate'] = `${variant.weight} ${variant.weight_unit}`;
  }
  
  return specs;
}

function detectChangedFields(
  existing: { id: string; sku: string }, 
  newData: Partial<typeof goldProducts.$inferInsert>
): string[] {
  // Simplified change detection
  // In production, compare all fields
  return Object.keys(newData).filter(k => k !== 'updated_at');
}

// Event Handlers
productSyncShopifyWorker.on('completed', (job, result) => {
  logger.debug('Job completed', { jobId: job.id, action: result.action });
});

productSyncShopifyWorker.on('failed', (job, error) => {
  logger.error('Job failed', { 
    jobId: job?.id, 
    error: error.message,
    attempts: job?.attemptsMade 
  });
});

export default productSyncShopifyWorker;
```

### 2.5 Webhook Handler (Fastify)

```typescript
// apps/api/src/routes/webhooks/shopify.ts

import { FastifyPluginAsync } from 'fastify';
import { createHmac } from 'crypto';
import { productSyncQueue } from '@cerniq/workers/queues';
import { ShopifyProductWebhookSchema } from '@cerniq/workers/types';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET!;

export const shopifyWebhooksPlugin: FastifyPluginAsync = async (fastify) => {
  
  // Verify Shopify HMAC
  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/webhooks/shopify')) return;
    
    const hmacHeader = request.headers['x-shopify-hmac-sha256'] as string;
    const topic = request.headers['x-shopify-topic'] as string;
    
    if (!hmacHeader || !topic) {
      return reply.status(401).send({ error: 'Missing Shopify headers' });
    }
    
    const rawBody = (request as any).rawBody as Buffer;
    const calculatedHmac = createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('base64');
    
    if (calculatedHmac !== hmacHeader) {
      return reply.status(401).send({ error: 'Invalid HMAC' });
    }
    
    (request as any).shopifyTopic = topic;
  });

  // Product Create/Update/Delete
  fastify.post<{
    Body: unknown;
    Headers: { 'x-shopify-topic': string; 'x-shopify-webhook-id': string };
  }>('/webhooks/shopify/products', async (request, reply) => {
    const topic = (request as any).shopifyTopic as string;
    const webhookId = request.headers['x-shopify-webhook-id'];
    const tenantId = request.headers['x-tenant-id'] as string;
    
    // Map topic to action
    let action: 'create' | 'update' | 'delete';
    switch (topic) {
      case 'products/create': action = 'create'; break;
      case 'products/update': action = 'update'; break;
      case 'products/delete': action = 'delete'; break;
      default:
        return reply.status(400).send({ error: 'Unsupported topic' });
    }
    
    const shopifyProduct = action !== 'delete' 
      ? ShopifyProductWebhookSchema.parse(request.body)
      : undefined;
    
    const shopifyProductId = shopifyProduct?.id || (request.body as any).id;
    
    // Enqueue sync job
    const job = await productSyncQueue.add('sync', {
      tenantId,
      action,
      shopifyProduct,
      shopifyProductId,
      webhookTopic: topic,
      webhookId,
      receivedAt: new Date().toISOString()
    }, {
      jobId: `shopify-${webhookId}`, // Dedupe by webhook ID
      removeOnComplete: 1000,
      removeOnFail: 5000
    });
    
    return reply.status(202).send({ 
      accepted: true, 
      jobId: job.id 
    });
  });
};
```

---

## 3. Worker #2: etapa3:product:embedding:generate

### 3.1 Specificații Tehnice

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `etapa3:product:embedding:generate` |
| **Categoria** | A - Product Knowledge |
| **Index** | #2 |
| **Rate Limit** | 3000/min (OpenAI limit) |
| **Concurrency** | 50 |
| **Timeout** | 60s |
| **Retries** | 3 |
| **Backoff** | Exponential (2s, 4s, 8s) |
| **Critical** | Nu |
| **Priority** | Normal (50) |

### 3.2 Responsabilitate

Generează embeddings vectoriale pentru produse:
- Crează text compozit din nume, descriere, specificații
- Apelează OpenAI Embeddings API (text-embedding-3-small)
- Salvează în `gold_product_embeddings` cu `is_current = true`
- Invalidează embedding-urile anterioare

### 3.3 Job Data Interface

```typescript
// packages/workers/src/etapa3/types/embedding.types.ts

import { z } from 'zod';

export const EmbeddingJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  sku: z.string(),
  action: z.enum(['created', 'updated']),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  forceRegenerate: z.boolean().default(false)
});

export type EmbeddingJobData = z.infer<typeof EmbeddingJobDataSchema>;

export const EmbeddingResultSchema = z.object({
  success: z.boolean(),
  embeddingId: z.string().uuid().optional(),
  productId: z.string().uuid(),
  dimensions: z.number().optional(),
  model: z.string().optional(),
  tokensUsed: z.number().optional(),
  chunksTriggered: z.number().optional(),
  duration_ms: z.number(),
  error: z.string().optional()
});

export type EmbeddingResult = z.infer<typeof EmbeddingResultSchema>;
```

### 3.4 Implementare Worker

```typescript
// packages/workers/src/etapa3/workers/product-embedding-generate.worker.ts

import { Worker, Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { db } from '@cerniq/database';
import { 
  goldProducts, 
  goldProductEmbeddings 
} from '@cerniq/database/schema/etapa3';
import { 
  EmbeddingJobData, 
  EmbeddingJobDataSchema,
  EmbeddingResult 
} from '../types/embedding.types';
import { redisConnection } from '@cerniq/shared/redis';
import { logger } from '@cerniq/shared/logger';
import { metrics } from '@cerniq/shared/metrics';
import { chunkQueue } from '../queues';
import OpenAI from 'openai';

const QUEUE_NAME = 'product:embedding:generate';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export const productEmbeddingGenerateWorker = new Worker<EmbeddingJobData, EmbeddingResult>(
  QUEUE_NAME,
  async (job: Job<EmbeddingJobData>): Promise<EmbeddingResult> => {
    const startTime = Date.now();
    const timer = metrics.histogram('worker_duration_ms', { queue: QUEUE_NAME });
    
    try {
      // 1. Validare input
      const data = EmbeddingJobDataSchema.parse(job.data);
      
      logger.info('Embedding generation started', {
        jobId: job.id,
        productId: data.productId,
        sku: data.sku
      });

      // 2. Fetch product data
      const product = await db.query.goldProducts.findFirst({
        where: and(
          eq(goldProducts.id, data.productId),
          eq(goldProducts.tenant_id, data.tenantId)
        )
      });

      if (!product) {
        throw new Error(`Product not found: ${data.productId}`);
      }

      // 3. Check if embedding already exists (skip if not forced)
      if (!data.forceRegenerate) {
        const existingEmbedding = await db.query.goldProductEmbeddings.findFirst({
          where: and(
            eq(goldProductEmbeddings.product_id, data.productId),
            eq(goldProductEmbeddings.is_current, true)
          ),
          columns: { id: true, created_at: true }
        });

        // Skip if embedding is less than 24h old and product wasn't updated
        if (existingEmbedding && data.action !== 'created') {
          const embeddingAge = Date.now() - existingEmbedding.created_at.getTime();
          const productAge = Date.now() - product.updated_at.getTime();
          
          if (productAge < embeddingAge) {
            logger.info('Embedding up to date, skipping', {
              productId: data.productId,
              embeddingId: existingEmbedding.id
            });

            return {
              success: true,
              embeddingId: existingEmbedding.id,
              productId: data.productId,
              chunksTriggered: 0,
              duration_ms: Date.now() - startTime
            };
          }
        }
      }

      // 4. Compose text for embedding
      const embeddingText = composeEmbeddingText(product);
      
      // 5. Generate embedding via OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: embeddingText,
        dimensions: EMBEDDING_DIMENSIONS
      });

      const embedding = embeddingResponse.data[0].embedding;
      const tokensUsed = embeddingResponse.usage.total_tokens;

      // 6. Invalidate previous embeddings
      await db
        .update(goldProductEmbeddings)
        .set({ is_current: false })
        .where(and(
          eq(goldProductEmbeddings.product_id, data.productId),
          eq(goldProductEmbeddings.is_current, true)
        ));

      // 7. Insert new embedding
      const [newEmbedding] = await db
        .insert(goldProductEmbeddings)
        .values({
          tenant_id: data.tenantId,
          product_id: data.productId,
          embedding: embedding,
          embedding_model: EMBEDDING_MODEL,
          text_hash: hashText(embeddingText),
          is_current: true
        })
        .returning({ id: goldProductEmbeddings.id });

      // 8. Trigger chunk creation
      const chunkJob = await chunkQueue.add('create', {
        tenantId: data.tenantId,
        productId: data.productId,
        embeddingId: newEmbedding.id
      }, {
        priority: data.priority === 'high' ? 10 : 50,
        removeOnComplete: 1000
      });

      metrics.counter('embeddings_generated_total').inc();
      metrics.counter('openai_tokens_used_total', { model: EMBEDDING_MODEL }).inc(tokensUsed);
      timer.observe(Date.now() - startTime);

      logger.info('Embedding generation completed', {
        jobId: job.id,
        embeddingId: newEmbedding.id,
        tokensUsed,
        duration_ms: Date.now() - startTime
      });

      return {
        success: true,
        embeddingId: newEmbedding.id,
        productId: data.productId,
        dimensions: EMBEDDING_DIMENSIONS,
        model: EMBEDDING_MODEL,
        tokensUsed,
        chunksTriggered: 1,
        duration_ms: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Embedding generation failed', {
        jobId: job.id,
        productId: job.data.productId,
        error: errorMessage
      });

      metrics.counter('embeddings_errors_total').inc();

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 50,
    limiter: {
      max: 50,
      duration: 1000 // 50/sec = 3000/min
    }
  }
);

// Helper Functions

function composeEmbeddingText(product: typeof goldProducts.$inferSelect): string {
  const parts: string[] = [];
  
  // Name (weighted by repetition)
  parts.push(product.name);
  parts.push(product.name); // Repeat for weight
  
  // Description
  if (product.description) {
    parts.push(product.description);
  }
  
  // Category
  if (product.category_path) {
    parts.push(`Categorie: ${product.category_path}`);
  }
  
  // Brand
  if (product.brand) {
    parts.push(`Brand: ${product.brand}`);
  }
  
  // Specifications
  if (product.specifications) {
    const specs = product.specifications as Record<string, string>;
    Object.entries(specs).forEach(([key, value]) => {
      parts.push(`${key}: ${value}`);
    });
  }
  
  // Tags
  if (product.tags && Array.isArray(product.tags)) {
    parts.push(`Tags: ${product.tags.join(', ')}`);
  }
  
  // Agricultural context (domain-specific)
  parts.push('agricultură România produse agricole ferme');
  
  return parts.join('\n');
}

function hashText(text: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Event Handlers
productEmbeddingGenerateWorker.on('completed', (job, result) => {
  logger.debug('Embedding job completed', { 
    jobId: job.id, 
    embeddingId: result.embeddingId 
  });
});

productEmbeddingGenerateWorker.on('failed', (job, error) => {
  logger.error('Embedding job failed', { 
    jobId: job?.id, 
    error: error.message 
  });
});

export default productEmbeddingGenerateWorker;
```


---

## 4. Worker #3: etapa3:product:chunk:create

### 4.1 Specificații Tehnice

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `etapa3:product:chunk:create` |
| **Categoria** | A - Product Knowledge |
| **Index** | #3 |
| **Rate Limit** | Fără (CPU-bound) |
| **Concurrency** | 50 |
| **Timeout** | 30s |
| **Retries** | 2 |
| **Backoff** | Fixed (1s) |
| **Critical** | Nu |
| **Priority** | Normal (50) |

### 4.2 Responsabilitate

Creează chunk-uri de text pentru RAG (Retrieval-Augmented Generation):
- Împarte descrierea și specificațiile în chunk-uri de ~500 tokens
- Generează embedding pentru fiecare chunk
- Salvează în `gold_product_chunks` cu metadata
- Permite căutare granulară în conținutul produselor

### 4.3 Job Data Interface

```typescript
// packages/workers/src/etapa3/types/chunk.types.ts

import { z } from 'zod';

export const ChunkCreateJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  embeddingId: z.string().uuid(),
  chunkSize: z.number().default(500), // tokens
  chunkOverlap: z.number().default(50) // tokens
});

export type ChunkCreateJobData = z.infer<typeof ChunkCreateJobDataSchema>;

export const ChunkResultSchema = z.object({
  success: z.boolean(),
  productId: z.string().uuid(),
  chunksCreated: z.number(),
  totalTokens: z.number(),
  duration_ms: z.number(),
  error: z.string().optional()
});

export type ChunkResult = z.infer<typeof ChunkResultSchema>;
```

### 4.4 Implementare Worker

```typescript
// packages/workers/src/etapa3/workers/product-chunk-create.worker.ts

import { Worker, Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { db } from '@cerniq/database';
import { 
  goldProducts, 
  goldProductChunks 
} from '@cerniq/database/schema/etapa3';
import { 
  ChunkCreateJobData, 
  ChunkCreateJobDataSchema,
  ChunkResult 
} from '../types/chunk.types';
import { redisConnection } from '@cerniq/shared/redis';
import { logger } from '@cerniq/shared/logger';
import { metrics } from '@cerniq/shared/metrics';
import OpenAI from 'openai';
import { encode, decode } from 'gpt-tokenizer';

const QUEUE_NAME = 'product:chunk:create';
const EMBEDDING_MODEL = 'text-embedding-3-small';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export const productChunkCreateWorker = new Worker<ChunkCreateJobData, ChunkResult>(
  QUEUE_NAME,
  async (job: Job<ChunkCreateJobData>): Promise<ChunkResult> => {
    const startTime = Date.now();
    const timer = metrics.histogram('worker_duration_ms', { queue: QUEUE_NAME });
    
    try {
      // 1. Validare input
      const data = ChunkCreateJobDataSchema.parse(job.data);
      
      logger.info('Chunk creation started', {
        jobId: job.id,
        productId: data.productId
      });

      // 2. Fetch product data
      const product = await db.query.goldProducts.findFirst({
        where: and(
          eq(goldProducts.id, data.productId),
          eq(goldProducts.tenant_id, data.tenantId)
        )
      });

      if (!product) {
        throw new Error(`Product not found: ${data.productId}`);
      }

      // 3. Delete existing chunks
      await db
        .delete(goldProductChunks)
        .where(eq(goldProductChunks.product_id, data.productId));

      // 4. Create content sections for chunking
      const sections = createContentSections(product);
      
      // 5. Chunk each section
      const chunks: {
        chunkIndex: number;
        chunkType: string;
        content: string;
        tokenCount: number;
      }[] = [];
      
      let globalIndex = 0;
      
      for (const section of sections) {
        const sectionChunks = chunkText(
          section.content, 
          data.chunkSize, 
          data.chunkOverlap
        );
        
        for (const chunkContent of sectionChunks) {
          chunks.push({
            chunkIndex: globalIndex++,
            chunkType: section.type,
            content: chunkContent,
            tokenCount: encode(chunkContent).length
          });
        }
      }

      if (chunks.length === 0) {
        logger.info('No chunks to create (product has no content)', {
          productId: data.productId
        });

        return {
          success: true,
          productId: data.productId,
          chunksCreated: 0,
          totalTokens: 0,
          duration_ms: Date.now() - startTime
        };
      }

      // 6. Generate embeddings for all chunks (batched)
      const batchSize = 20;
      const chunkEmbeddings: number[][] = [];
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const texts = batch.map(c => c.content);
        
        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: texts
        });
        
        response.data.forEach(d => {
          chunkEmbeddings.push(d.embedding);
        });
        
        // Progress update
        await job.updateProgress(Math.round((i / chunks.length) * 100));
      }

      // 7. Insert all chunks
      const chunkRecords = chunks.map((chunk, idx) => ({
        tenant_id: data.tenantId,
        product_id: data.productId,
        chunk_index: chunk.chunkIndex,
        chunk_type: chunk.chunkType,
        content: chunk.content,
        token_count: chunk.tokenCount,
        embedding: chunkEmbeddings[idx],
        embedding_model: EMBEDDING_MODEL
      }));

      await db.insert(goldProductChunks).values(chunkRecords);

      const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);

      metrics.counter('chunks_created_total').inc(chunks.length);
      metrics.counter('chunk_tokens_total').inc(totalTokens);
      timer.observe(Date.now() - startTime);

      logger.info('Chunk creation completed', {
        jobId: job.id,
        productId: data.productId,
        chunksCreated: chunks.length,
        totalTokens,
        duration_ms: Date.now() - startTime
      });

      return {
        success: true,
        productId: data.productId,
        chunksCreated: chunks.length,
        totalTokens,
        duration_ms: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Chunk creation failed', {
        jobId: job.id,
        productId: job.data.productId,
        error: errorMessage
      });

      metrics.counter('chunks_errors_total').inc();

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 50
  }
);

// Helper Functions

interface ContentSection {
  type: string;
  content: string;
}

function createContentSections(product: typeof goldProducts.$inferSelect): ContentSection[] {
  const sections: ContentSection[] = [];
  
  // Name + Category
  sections.push({
    type: 'header',
    content: `${product.name}. Categorie: ${product.category_path || 'Necategorizat'}. Brand: ${product.brand || 'N/A'}.`
  });
  
  // Description
  if (product.description && product.description.length > 0) {
    sections.push({
      type: 'description',
      content: product.description
    });
  }
  
  // Specifications
  if (product.specifications) {
    const specs = product.specifications as Record<string, string>;
    const specText = Object.entries(specs)
      .map(([k, v]) => `${k}: ${v}`)
      .join('. ');
    
    if (specText.length > 0) {
      sections.push({
        type: 'specifications',
        content: `Specificații tehnice: ${specText}`
      });
    }
  }
  
  // Usage instructions (if available in specs)
  const specs = product.specifications as Record<string, string> | null;
  if (specs?.['Mod de utilizare']) {
    sections.push({
      type: 'usage',
      content: `Mod de utilizare: ${specs['Mod de utilizare']}`
    });
  }
  
  return sections;
}

function chunkText(
  text: string, 
  maxTokens: number, 
  overlapTokens: number
): string[] {
  const tokens = encode(text);
  
  if (tokens.length <= maxTokens) {
    return [text];
  }
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < tokens.length) {
    const end = Math.min(start + maxTokens, tokens.length);
    const chunkTokens = tokens.slice(start, end);
    chunks.push(decode(chunkTokens));
    
    // Move start, accounting for overlap
    start = end - overlapTokens;
    
    // Prevent infinite loop
    if (start >= tokens.length - overlapTokens) {
      break;
    }
  }
  
  return chunks;
}

export default productChunkCreateWorker;
```

---

## 5. Worker #4: etapa3:product:stock:realtime-check (CRITICAL)

### 5.1 Specificații Tehnice

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `etapa3:product:stock:realtime-check` |
| **Categoria** | A - Product Knowledge |
| **Index** | #4 |
| **Rate Limit** | Fără (critical path) |
| **Concurrency** | 100 |
| **Timeout** | 10s |
| **Retries** | 1 |
| **Backoff** | Immediate |
| **Critical** | **DA** ⚠️ |
| **Priority** | High (10) |

### 5.2 Responsabilitate

**CRITICAL PATH** - Verifică stocul în timp real:
- Interogare directă la ERP/Shopify
- Compară cu `stock_inventory` local
- Returnează disponibilitate exactă
- Actualizează cache Redis pentru performanță
- **NU PERMITE vânzare peste stoc**

### 5.3 Job Data Interface

```typescript
// packages/workers/src/etapa3/types/stock.types.ts

import { z } from 'zod';

export const StockCheckJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  sku: z.string(),
  productId: z.string().uuid().optional(),
  requestedQuantity: z.number().positive().optional(),
  checkSource: z.enum(['erp', 'shopify', 'local', 'all']).default('all'),
  negotiationId: z.string().uuid().optional(),
  correlationId: z.string().optional()
});

export type StockCheckJobData = z.infer<typeof StockCheckJobDataSchema>;

export const StockCheckResultSchema = z.object({
  success: z.boolean(),
  sku: z.string(),
  available: z.boolean(),
  totalQuantity: z.number(),
  reservedQuantity: z.number(),
  availableQuantity: z.number(),
  requestedQuantity: z.number().optional(),
  canFulfill: z.boolean(),
  source: z.string(),
  checkedAt: z.string().datetime(),
  cacheHit: z.boolean(),
  duration_ms: z.number(),
  warning: z.string().optional(),
  error: z.string().optional()
});

export type StockCheckResult = z.infer<typeof StockCheckResultSchema>;
```

### 5.4 Implementare Worker

```typescript
// packages/workers/src/etapa3/workers/product-stock-realtime-check.worker.ts

import { Worker, Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { db } from '@cerniq/database';
import { stockInventory, goldProducts } from '@cerniq/database/schema/etapa3';
import { 
  StockCheckJobData, 
  StockCheckJobDataSchema,
  StockCheckResult 
} from '../types/stock.types';
import { redisConnection, redis } from '@cerniq/shared/redis';
import { logger } from '@cerniq/shared/logger';
import { metrics } from '@cerniq/shared/metrics';

const QUEUE_NAME = 'product:stock:realtime-check';
const CACHE_TTL = 30; // 30 seconds cache
const CACHE_PREFIX = 'stock:realtime:';

export const productStockRealtimeCheckWorker = new Worker<StockCheckJobData, StockCheckResult>(
  QUEUE_NAME,
  async (job: Job<StockCheckJobData>): Promise<StockCheckResult> => {
    const startTime = Date.now();
    const timer = metrics.histogram('worker_duration_ms', { queue: QUEUE_NAME });
    
    try {
      // 1. Validare input
      const data = StockCheckJobDataSchema.parse(job.data);
      
      logger.info('Stock check started', {
        jobId: job.id,
        sku: data.sku,
        correlationId: data.correlationId
      });

      // 2. Check cache first
      const cacheKey = `${CACHE_PREFIX}${data.tenantId}:${data.sku}`;
      const cached = await redis.get(cacheKey);
      
      if (cached && data.checkSource !== 'erp') {
        const cachedResult = JSON.parse(cached) as StockCheckResult;
        
        // Verify can fulfill if quantity requested
        if (data.requestedQuantity) {
          cachedResult.requestedQuantity = data.requestedQuantity;
          cachedResult.canFulfill = cachedResult.availableQuantity >= data.requestedQuantity;
        }
        
        cachedResult.cacheHit = true;
        cachedResult.duration_ms = Date.now() - startTime;
        
        metrics.counter('stock_checks_total', { cache: 'hit' }).inc();
        timer.observe(Date.now() - startTime);
        
        return cachedResult;
      }

      // 3. Get product ID if not provided
      let productId = data.productId;
      if (!productId) {
        const product = await db.query.goldProducts.findFirst({
          where: and(
            eq(goldProducts.tenant_id, data.tenantId),
            eq(goldProducts.sku, data.sku)
          ),
          columns: { id: true }
        });
        
        if (!product) {
          return {
            success: false,
            sku: data.sku,
            available: false,
            totalQuantity: 0,
            reservedQuantity: 0,
            availableQuantity: 0,
            canFulfill: false,
            source: 'none',
            checkedAt: new Date().toISOString(),
            cacheHit: false,
            duration_ms: Date.now() - startTime,
            error: `Product not found: ${data.sku}`
          };
        }
        productId = product.id;
      }

      // 4. Check local inventory
      const inventory = await db.query.stockInventory.findFirst({
        where: and(
          eq(stockInventory.tenant_id, data.tenantId),
          eq(stockInventory.product_id, productId)
        )
      });

      let totalQuantity = inventory?.total_quantity ?? 0;
      let reservedQuantity = inventory?.reserved_quantity ?? 0;
      let source = 'local';

      // 5. If configured, check external source
      if (data.checkSource === 'erp' || data.checkSource === 'all') {
        try {
          const erpStock = await checkERPStock(data.tenantId, data.sku);
          if (erpStock !== null) {
            // Sync local with ERP
            if (erpStock !== totalQuantity) {
              await db
                .update(stockInventory)
                .set({ 
                  total_quantity: erpStock,
                  last_sync_at: new Date()
                })
                .where(and(
                  eq(stockInventory.tenant_id, data.tenantId),
                  eq(stockInventory.product_id, productId)
                ));
              
              totalQuantity = erpStock;
              source = 'erp';
            }
          }
        } catch (erpError) {
          logger.warn('ERP stock check failed, using local', {
            sku: data.sku,
            error: (erpError as Error).message
          });
          // Continue with local data
        }
      }

      if (data.checkSource === 'shopify' || data.checkSource === 'all') {
        try {
          const shopifyStock = await checkShopifyStock(data.tenantId, data.sku);
          if (shopifyStock !== null && source === 'local') {
            totalQuantity = shopifyStock;
            source = 'shopify';
          }
        } catch (shopifyError) {
          logger.warn('Shopify stock check failed', {
            sku: data.sku,
            error: (shopifyError as Error).message
          });
        }
      }

      // 6. Calculate available
      const availableQuantity = Math.max(0, totalQuantity - reservedQuantity);
      const canFulfill = data.requestedQuantity 
        ? availableQuantity >= data.requestedQuantity 
        : availableQuantity > 0;

      const result: StockCheckResult = {
        success: true,
        sku: data.sku,
        available: availableQuantity > 0,
        totalQuantity,
        reservedQuantity,
        availableQuantity,
        requestedQuantity: data.requestedQuantity,
        canFulfill,
        source,
        checkedAt: new Date().toISOString(),
        cacheHit: false,
        duration_ms: Date.now() - startTime
      };

      // 7. Add warning if low stock
      if (inventory?.low_stock_threshold && availableQuantity <= inventory.low_stock_threshold) {
        result.warning = `Low stock alert: only ${availableQuantity} units available`;
      }

      // 8. Cache result
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

      metrics.counter('stock_checks_total', { cache: 'miss' }).inc();
      metrics.gauge('stock_available', { sku: data.sku }).set(availableQuantity);
      timer.observe(Date.now() - startTime);

      logger.info('Stock check completed', {
        jobId: job.id,
        sku: data.sku,
        available: availableQuantity,
        canFulfill,
        duration_ms: Date.now() - startTime
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Stock check failed', {
        jobId: job.id,
        sku: job.data.sku,
        error: errorMessage
      });

      metrics.counter('stock_check_errors_total').inc();

      // Return safe result (no stock) on error
      return {
        success: false,
        sku: job.data.sku,
        available: false,
        totalQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        canFulfill: false,
        source: 'error',
        checkedAt: new Date().toISOString(),
        cacheHit: false,
        duration_ms: Date.now() - startTime,
        error: errorMessage
      };
    }
  },
  {
    connection: redisConnection,
    concurrency: 100, // High concurrency for real-time
    settings: {
      // No backoff for critical path
      backoffStrategy: () => 0
    }
  }
);

// External Stock Check Functions

async function checkERPStock(tenantId: string, sku: string): Promise<number | null> {
  // TODO: Implement actual ERP integration
  // This would call your ERP API
  
  // Placeholder - returns null to use local data
  return null;
}

async function checkShopifyStock(tenantId: string, sku: string): Promise<number | null> {
  // TODO: Implement Shopify inventory check
  // GET /admin/api/2024-01/inventory_levels.json?inventory_item_ids={id}
  
  // Placeholder
  return null;
}

export default productStockRealtimeCheckWorker;
```

### 5.5 Guardrail Integration

Acest worker este apelat de `guardrail:stock:check` pentru a valida răspunsurile AI:

```typescript
// packages/workers/src/etapa3/guardrails/stock-guardrail.ts

import { stockCheckQueue } from '../queues';

export async function validateStockClaim(
  tenantId: string,
  sku: string,
  claimedQuantity: number,
  correlationId: string
): Promise<{
  valid: boolean;
  actualQuantity: number;
  correction?: string;
}> {
  // Execute stock check
  const job = await stockCheckQueue.add('validate', {
    tenantId,
    sku,
    requestedQuantity: claimedQuantity,
    checkSource: 'all',
    correlationId
  }, {
    priority: 1, // Highest priority
    removeOnComplete: 100
  });

  const result = await job.waitUntilFinished(stockCheckQueue.events, 10000);

  if (!result.success || !result.canFulfill) {
    return {
      valid: false,
      actualQuantity: result.availableQuantity,
      correction: `Stoc insuficient pentru ${sku}. Disponibil: ${result.availableQuantity} unități.`
    };
  }

  return {
    valid: true,
    actualQuantity: result.availableQuantity
  };
}
```

---

## 6. Worker #5: etapa3:product:price:validate (CRITICAL)

### 6.1 Specificații Tehnice

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `etapa3:product:price:validate` |
| **Categoria** | A - Product Knowledge |
| **Index** | #5 |
| **Rate Limit** | Fără (critical path) |
| **Concurrency** | 100 |
| **Timeout** | 5s |
| **Retries** | 1 |
| **Backoff** | Immediate |
| **Critical** | **DA** ⚠️ |
| **Priority** | High (10) |

### 6.2 Responsabilitate

**CRITICAL PATH** - Validează prețurile menționate de AI:
- Compară prețul menționat cu `gold_products.current_price`
- Verifică discount vs reguli din `price_rules`
- Calculează marja minimă acceptabilă
- **REJECTEAZĂ prețuri halaciute**
- Returnează corecție pentru regenerare AI

### 6.3 Job Data Interface

```typescript
// packages/workers/src/etapa3/types/price-validate.types.ts

import { z } from 'zod';

export const PriceValidateJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  sku: z.string(),
  productId: z.string().uuid().optional(),
  mentionedPrice: z.number().positive(),
  mentionedDiscount: z.number().min(0).max(100).optional(),
  quantity: z.number().positive().default(1),
  clientCif: z.string().optional(),
  negotiationId: z.string().uuid().optional(),
  correlationId: z.string().optional()
});

export type PriceValidateJobData = z.infer<typeof PriceValidateJobDataSchema>;

export const PriceValidateResultSchema = z.object({
  success: z.boolean(),
  valid: z.boolean(),
  sku: z.string(),
  // Actual values
  actualBasePrice: z.number(),
  actualCurrentPrice: z.number(),
  actualMinPrice: z.number(),
  actualMaxDiscount: z.number(),
  // Mentioned values
  mentionedPrice: z.number(),
  mentionedDiscount: z.number().optional(),
  // Calculated
  effectiveDiscount: z.number(),
  margin: z.number(),
  minMargin: z.number(),
  // Validation
  priceValid: z.boolean(),
  discountValid: z.boolean(),
  marginValid: z.boolean(),
  // Corrections
  correction: z.string().optional(),
  suggestedPrice: z.number().optional(),
  suggestedDiscount: z.number().optional(),
  // Meta
  duration_ms: z.number(),
  error: z.string().optional()
});

export type PriceValidateResult = z.infer<typeof PriceValidateResultSchema>;
```

### 6.4 Implementare Worker

```typescript
// packages/workers/src/etapa3/workers/product-price-validate.worker.ts

import { Worker, Job } from 'bullmq';
import { eq, and, or, isNull, gte, lte, sql } from 'drizzle-orm';
import { db } from '@cerniq/database';
import { goldProducts, priceRules } from '@cerniq/database/schema/etapa3';
import { 
  PriceValidateJobData, 
  PriceValidateJobDataSchema,
  PriceValidateResult 
} from '../types/price-validate.types';
import { redisConnection } from '@cerniq/shared/redis';
import { logger } from '@cerniq/shared/logger';
import { metrics } from '@cerniq/shared/metrics';

const QUEUE_NAME = 'product:price:validate';
const DEFAULT_MIN_MARGIN = 0.10; // 10% minimum margin
const DEFAULT_MAX_DISCOUNT = 0.20; // 20% maximum discount

export const productPriceValidateWorker = new Worker<PriceValidateJobData, PriceValidateResult>(
  QUEUE_NAME,
  async (job: Job<PriceValidateJobData>): Promise<PriceValidateResult> => {
    const startTime = Date.now();
    const timer = metrics.histogram('worker_duration_ms', { queue: QUEUE_NAME });
    
    try {
      // 1. Validare input
      const data = PriceValidateJobDataSchema.parse(job.data);
      
      logger.info('Price validation started', {
        jobId: job.id,
        sku: data.sku,
        mentionedPrice: data.mentionedPrice,
        correlationId: data.correlationId
      });

      // 2. Get product data
      const product = await db.query.goldProducts.findFirst({
        where: and(
          eq(goldProducts.tenant_id, data.tenantId),
          eq(goldProducts.sku, data.sku)
        )
      });

      if (!product) {
        return {
          success: false,
          valid: false,
          sku: data.sku,
          actualBasePrice: 0,
          actualCurrentPrice: 0,
          actualMinPrice: 0,
          actualMaxDiscount: 0,
          mentionedPrice: data.mentionedPrice,
          mentionedDiscount: data.mentionedDiscount,
          effectiveDiscount: 0,
          margin: 0,
          minMargin: DEFAULT_MIN_MARGIN,
          priceValid: false,
          discountValid: false,
          marginValid: false,
          correction: `Produsul ${data.sku} nu există în catalog.`,
          duration_ms: Date.now() - startTime,
          error: 'Product not found'
        };
      }

      // 3. Get applicable price rules
      const rules = await db.query.priceRules.findMany({
        where: and(
          eq(priceRules.tenant_id, data.tenantId),
          eq(priceRules.is_active, true),
          or(
            eq(priceRules.product_id, product.id),
            eq(priceRules.category_id, product.category_id),
            and(isNull(priceRules.product_id), isNull(priceRules.category_id))
          ),
          or(
            isNull(priceRules.valid_from),
            lte(priceRules.valid_from, new Date())
          ),
          or(
            isNull(priceRules.valid_until),
            gte(priceRules.valid_until, new Date())
          )
        ),
        orderBy: (rules, { desc }) => [desc(rules.priority)]
      });

      // 4. Calculate effective pricing
      const basePrice = product.base_price;
      const currentPrice = product.current_price;
      let minPrice = product.min_price ?? basePrice * (1 - DEFAULT_MAX_DISCOUNT);
      let maxDiscount = product.max_discount_percent ?? DEFAULT_MAX_DISCOUNT * 100;
      let minMargin = DEFAULT_MIN_MARGIN;

      // Apply rules (highest priority first)
      for (const rule of rules) {
        if (rule.rule_type === 'MIN_PRICE' && rule.min_price) {
          minPrice = Math.max(minPrice, rule.min_price);
        }
        if (rule.rule_type === 'MAX_DISCOUNT' && rule.max_discount_percent) {
          maxDiscount = Math.min(maxDiscount, rule.max_discount_percent);
        }
        if (rule.rule_type === 'MIN_MARGIN' && rule.min_margin_percent) {
          minMargin = Math.max(minMargin, rule.min_margin_percent / 100);
        }
        
        // Volume discounts
        if (rule.rule_type === 'VOLUME_DISCOUNT' && rule.volume_tiers && data.quantity > 1) {
          const tiers = rule.volume_tiers as Array<{ min_qty: number; discount: number }>;
          const applicableTier = tiers
            .filter(t => data.quantity >= t.min_qty)
            .sort((a, b) => b.min_qty - a.min_qty)[0];
          
          if (applicableTier) {
            maxDiscount = Math.max(maxDiscount, applicableTier.discount);
          }
        }
      }

      // 5. Validate mentioned price
      const effectiveDiscount = ((currentPrice - data.mentionedPrice) / currentPrice) * 100;
      const margin = (data.mentionedPrice - (product.cost_price ?? basePrice * 0.7)) / data.mentionedPrice;

      const priceValid = data.mentionedPrice >= minPrice;
      const discountValid = effectiveDiscount <= maxDiscount;
      const marginValid = margin >= minMargin;

      const valid = priceValid && discountValid && marginValid;

      // 6. Generate correction if invalid
      let correction: string | undefined;
      let suggestedPrice: number | undefined;
      let suggestedDiscount: number | undefined;

      if (!valid) {
        if (!priceValid) {
          suggestedPrice = minPrice;
          correction = `Prețul de ${data.mentionedPrice} RON este sub minimul permis. Prețul minim este ${minPrice.toFixed(2)} RON.`;
        } else if (!discountValid) {
          suggestedDiscount = maxDiscount;
          suggestedPrice = currentPrice * (1 - maxDiscount / 100);
          correction = `Discountul de ${effectiveDiscount.toFixed(1)}% depășește maximul permis de ${maxDiscount}%. Prețul corect cu discount maxim: ${suggestedPrice.toFixed(2)} RON.`;
        } else if (!marginValid) {
          // Calculate price that gives minimum margin
          const costPrice = product.cost_price ?? basePrice * 0.7;
          suggestedPrice = costPrice / (1 - minMargin);
          correction = `Prețul nu asigură marja minimă de ${(minMargin * 100).toFixed(0)}%. Prețul minim pentru marja corectă: ${suggestedPrice.toFixed(2)} RON.`;
        }

        metrics.counter('price_validations_total', { valid: 'false' }).inc();
      } else {
        metrics.counter('price_validations_total', { valid: 'true' }).inc();
      }

      timer.observe(Date.now() - startTime);

      logger.info('Price validation completed', {
        jobId: job.id,
        sku: data.sku,
        valid,
        mentionedPrice: data.mentionedPrice,
        effectiveDiscount: effectiveDiscount.toFixed(2),
        duration_ms: Date.now() - startTime
      });

      return {
        success: true,
        valid,
        sku: data.sku,
        actualBasePrice: basePrice,
        actualCurrentPrice: currentPrice,
        actualMinPrice: minPrice,
        actualMaxDiscount: maxDiscount,
        mentionedPrice: data.mentionedPrice,
        mentionedDiscount: data.mentionedDiscount,
        effectiveDiscount,
        margin,
        minMargin,
        priceValid,
        discountValid,
        marginValid,
        correction,
        suggestedPrice,
        suggestedDiscount,
        duration_ms: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Price validation failed', {
        jobId: job.id,
        sku: job.data.sku,
        error: errorMessage
      });

      metrics.counter('price_validation_errors_total').inc();

      // Return invalid on error (safe default)
      return {
        success: false,
        valid: false,
        sku: job.data.sku,
        actualBasePrice: 0,
        actualCurrentPrice: 0,
        actualMinPrice: 0,
        actualMaxDiscount: 0,
        mentionedPrice: job.data.mentionedPrice,
        mentionedDiscount: job.data.mentionedDiscount,
        effectiveDiscount: 0,
        margin: 0,
        minMargin: DEFAULT_MIN_MARGIN,
        priceValid: false,
        discountValid: false,
        marginValid: false,
        correction: 'Eroare la validarea prețului. Vă rugăm verificați manual.',
        duration_ms: Date.now() - startTime,
        error: errorMessage
      };
    }
  },
  {
    connection: redisConnection,
    concurrency: 100
  }
);

export default productPriceValidateWorker;
```

---

## 7. Worker #6: etapa3:product:category:sync

### 7.1 Specificații Tehnice

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `etapa3:product:category:sync` |
| **Categoria** | A - Product Knowledge |
| **Index** | #6 (Adițional) |
| **Rate Limit** | 10/min |
| **Concurrency** | 5 |
| **Timeout** | 60s |
| **Retries** | 3 |
| **Backoff** | Exponential (5s, 10s, 20s) |
| **Critical** | Nu |
| **Priority** | Low (80) |

### 7.2 Responsabilitate

Sincronizează ierarhia de categorii:
- Import categorii din Shopify/ERP
- Actualizează `gold_product_categories`
- Recalculează `materialized_path` pentru fiecare categorie
- Trigger reîndexare produse când se schimbă categoria

### 7.3 Job Data Interface

```typescript
// packages/workers/src/etapa3/types/category-sync.types.ts

import { z } from 'zod';

export const CategorySyncJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  source: z.enum(['shopify', 'erp', 'manual']),
  fullSync: z.boolean().default(false),
  categories: z.array(z.object({
    externalId: z.string(),
    name: z.string(),
    parentExternalId: z.string().nullable(),
    description: z.string().optional(),
    imageUrl: z.string().url().optional()
  })).optional()
});

export type CategorySyncJobData = z.infer<typeof CategorySyncJobDataSchema>;

export const CategorySyncResultSchema = z.object({
  success: z.boolean(),
  categoriesCreated: z.number(),
  categoriesUpdated: z.number(),
  categoriesDeleted: z.number(),
  pathsRecalculated: z.number(),
  productsAffected: z.number(),
  duration_ms: z.number(),
  error: z.string().optional()
});

export type CategorySyncResult = z.infer<typeof CategorySyncResultSchema>;
```

### 7.4 Implementare Worker

```typescript
// packages/workers/src/etapa3/workers/product-category-sync.worker.ts

import { Worker, Job } from 'bullmq';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '@cerniq/database';
import { goldProductCategories, goldProducts } from '@cerniq/database/schema/etapa3';
import { 
  CategorySyncJobData, 
  CategorySyncJobDataSchema,
  CategorySyncResult 
} from '../types/category-sync.types';
import { redisConnection } from '@cerniq/shared/redis';
import { logger } from '@cerniq/shared/logger';
import { metrics } from '@cerniq/shared/metrics';
import { embeddingQueue } from '../queues';

const QUEUE_NAME = 'product:category:sync';

export const productCategorySyncWorker = new Worker<CategorySyncJobData, CategorySyncResult>(
  QUEUE_NAME,
  async (job: Job<CategorySyncJobData>): Promise<CategorySyncResult> => {
    const startTime = Date.now();
    const timer = metrics.histogram('worker_duration_ms', { queue: QUEUE_NAME });
    
    try {
      // 1. Validare input
      const data = CategorySyncJobDataSchema.parse(job.data);
      
      logger.info('Category sync started', {
        jobId: job.id,
        tenantId: data.tenantId,
        source: data.source,
        fullSync: data.fullSync
      });

      let categoriesCreated = 0;
      let categoriesUpdated = 0;
      let categoriesDeleted = 0;
      let pathsRecalculated = 0;
      let productsAffected = 0;

      // 2. Fetch categories from source
      let categories = data.categories;
      
      if (!categories && data.source === 'shopify') {
        categories = await fetchShopifyCategories(data.tenantId);
      }

      if (!categories) {
        throw new Error('No categories provided and could not fetch from source');
      }

      // 3. Build external ID to internal ID mapping
      const existingCategories = await db.query.goldProductCategories.findMany({
        where: eq(goldProductCategories.tenant_id, data.tenantId)
      });

      const externalToInternal = new Map<string, string>();
      existingCategories.forEach(cat => {
        if (cat.external_id) {
          externalToInternal.set(cat.external_id, cat.id);
        }
      });

      // 4. Process categories (parents first)
      // Sort to ensure parents are processed before children
      const sortedCategories = [...categories].sort((a, b) => {
        if (a.parentExternalId === null && b.parentExternalId !== null) return -1;
        if (a.parentExternalId !== null && b.parentExternalId === null) return 1;
        return 0;
      });

      for (const cat of sortedCategories) {
        const existingId = externalToInternal.get(cat.externalId);
        const parentId = cat.parentExternalId 
          ? externalToInternal.get(cat.parentExternalId) 
          : null;

        if (existingId) {
          // Update
          await db
            .update(goldProductCategories)
            .set({
              name: cat.name,
              parent_id: parentId,
              description: cat.description,
              image_url: cat.imageUrl,
              updated_at: new Date()
            })
            .where(eq(goldProductCategories.id, existingId));
          
          categoriesUpdated++;
        } else {
          // Create
          const [newCat] = await db
            .insert(goldProductCategories)
            .values({
              tenant_id: data.tenantId,
              external_id: cat.externalId,
              name: cat.name,
              parent_id: parentId,
              description: cat.description,
              image_url: cat.imageUrl,
              slug: generateSlug(cat.name)
            })
            .returning({ id: goldProductCategories.id });
          
          externalToInternal.set(cat.externalId, newCat.id);
          categoriesCreated++;
        }
      }

      // 5. Delete removed categories (if full sync)
      if (data.fullSync) {
        const currentExternalIds = categories.map(c => c.externalId);
        const toDelete = existingCategories.filter(
          c => c.external_id && !currentExternalIds.includes(c.external_id)
        );

        for (const cat of toDelete) {
          // Move products to parent or uncategorized
          await db
            .update(goldProducts)
            .set({ 
              category_id: cat.parent_id,
              updated_at: new Date()
            })
            .where(eq(goldProducts.category_id, cat.id));
          
          await db
            .delete(goldProductCategories)
            .where(eq(goldProductCategories.id, cat.id));
          
          categoriesDeleted++;
        }
      }

      // 6. Recalculate materialized paths
      pathsRecalculated = await recalculateMaterializedPaths(data.tenantId);

      // 7. Count affected products
      const affectedResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(goldProducts)
        .where(and(
          eq(goldProducts.tenant_id, data.tenantId),
          sql`${goldProducts.updated_at} > now() - interval '1 hour'`
        ));
      
      productsAffected = affectedResult[0]?.count ?? 0;

      metrics.counter('categories_synced_total', { source: data.source }).inc(
        categoriesCreated + categoriesUpdated
      );
      timer.observe(Date.now() - startTime);

      logger.info('Category sync completed', {
        jobId: job.id,
        categoriesCreated,
        categoriesUpdated,
        categoriesDeleted,
        pathsRecalculated,
        duration_ms: Date.now() - startTime
      });

      return {
        success: true,
        categoriesCreated,
        categoriesUpdated,
        categoriesDeleted,
        pathsRecalculated,
        productsAffected,
        duration_ms: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Category sync failed', {
        jobId: job.id,
        error: errorMessage
      });

      metrics.counter('category_sync_errors_total').inc();

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 60000 // 10/min
    }
  }
);

// Helper Functions

async function fetchShopifyCategories(tenantId: string): Promise<{
  externalId: string;
  name: string;
  parentExternalId: string | null;
}[]> {
  // TODO: Implement Shopify collections fetch
  // GET /admin/api/2024-01/custom_collections.json
  // GET /admin/api/2024-01/smart_collections.json
  
  return [];
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function recalculateMaterializedPaths(tenantId: string): Promise<number> {
  // Recursive CTE to calculate paths
  const result = await db.execute(sql`
    WITH RECURSIVE category_tree AS (
      -- Root categories
      SELECT 
        id,
        name,
        parent_id,
        name::text as materialized_path,
        1 as depth
      FROM gold_product_categories
      WHERE tenant_id = ${tenantId}
        AND parent_id IS NULL
      
      UNION ALL
      
      -- Child categories
      SELECT 
        c.id,
        c.name,
        c.parent_id,
        ct.materialized_path || ' > ' || c.name,
        ct.depth + 1
      FROM gold_product_categories c
      JOIN category_tree ct ON c.parent_id = ct.id
      WHERE c.tenant_id = ${tenantId}
    )
    UPDATE gold_product_categories
    SET 
      materialized_path = ct.materialized_path,
      depth = ct.depth,
      updated_at = now()
    FROM category_tree ct
    WHERE gold_product_categories.id = ct.id
      AND gold_product_categories.tenant_id = ${tenantId}
  `);

  return Number(result.rowCount ?? 0);
}

export default productCategorySyncWorker;
```

---

## 8. Dependențe și Triggere

### 8.1 Diagrama Dependențe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    CATEGORIA A - DEPENDENȚE ȘI TRIGGERE                          │
│                                                                                  │
│                         EXTERNAL TRIGGERS                                        │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                        │
│   │   Shopify   │    │     ERP     │    │   Manual    │                        │
│   │   Webhook   │    │    Cron     │    │    API      │                        │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                        │
│          │                  │                   │                               │
│          ▼                  ▼                   ▼                               │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │                    product:sync:shopify (#1)                     │          │
│   │   Input: ShopifyProductWebhook                                   │          │
│   │   Output: ProductSyncResult                                      │          │
│   └───────────────────────────┬─────────────────────────────────────┘          │
│                               │                                                 │
│                               │ ON SUCCESS (create/update)                      │
│                               ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │                  product:embedding:generate (#2)                 │          │
│   │   Input: EmbeddingJobData                                        │          │
│   │   Output: EmbeddingResult                                        │          │
│   │   Dependency: OpenAI API                                         │          │
│   └───────────────────────────┬─────────────────────────────────────┘          │
│                               │                                                 │
│                               │ ON SUCCESS                                      │
│                               ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │                    product:chunk:create (#3)                     │          │
│   │   Input: ChunkCreateJobData                                      │          │
│   │   Output: ChunkResult                                            │          │
│   │   Dependency: OpenAI API (batch embeddings)                      │          │
│   └─────────────────────────────────────────────────────────────────┘          │
│                                                                                 │
│   ══════════════════════════ RUNTIME VALIDATION ════════════════════════════   │
│                                                                                 │
│           GUARDRAILS                              AI AGENT                      │
│   ┌─────────────────────┐                ┌─────────────────────┐               │
│   │ guardrail:stock:    │                │  ai:agent:          │               │
│   │     check           │◄───────────────│     orchestrate     │               │
│   └──────────┬──────────┘                └─────────┬───────────┘               │
│              │                                     │                            │
│              ▼                                     ▼                            │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │              product:stock:realtime-check (#4) ⚠️               │          │
│   │   CRITICAL PATH - Sub-second response required                  │          │
│   │   Caching: Redis 30s TTL                                        │          │
│   └─────────────────────────────────────────────────────────────────┘          │
│                                                                                 │
│   ┌─────────────────────┐                ┌─────────────────────┐               │
│   │ guardrail:price:    │                │  pricing:discount:  │               │
│   │     check           │◄───────────────│     calculate       │               │
│   └──────────┬──────────┘                └─────────┬───────────┘               │
│              │                                     │                            │
│              ▼                                     ▼                            │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │                product:price:validate (#5) ⚠️                   │          │
│   │   CRITICAL PATH - Previne prețuri halaciute                     │          │
│   │   No caching (always fresh validation)                          │          │
│   └─────────────────────────────────────────────────────────────────┘          │
│                                                                                 │
│   ══════════════════════════ CATEGORY SYNC ═════════════════════════════════   │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐          │
│   │                  product:category:sync (#6)                      │          │
│   │   Trigger: Shopify webhook / Manual / Cron daily                 │          │
│   │   Effect: Updates materialized_path, triggers product reindex    │          │
│   └─────────────────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Tabel Triggere

| Worker | Triggered By | Triggers | Condition |
|--------|--------------|----------|-----------|
| `product:sync:shopify` | Shopify Webhook | `product:embedding:generate` | On create/update |
| `product:embedding:generate` | Sync worker | `product:chunk:create` | Always |
| `product:chunk:create` | Embedding worker | None | - |
| `product:stock:realtime-check` | Guardrail / Direct | None | - |
| `product:price:validate` | Guardrail / Direct | None | - |
| `product:category:sync` | Webhook / Cron | `product:embedding:generate` (bulk) | On path change |

### 8.3 Configurație Queues

```typescript
// packages/workers/src/etapa3/queues/product-queues.ts

import { Queue } from 'bullmq';
import { redisConnection } from '@cerniq/shared/redis';

// Product Sync Queue
export const productSyncQueue = new Queue('product:sync:shopify', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
});

// Embedding Queue
export const embeddingQueue = new Queue('product:embedding:generate', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
});

// Chunk Queue
export const chunkQueue = new Queue('product:chunk:create', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 1000
    },
    removeOnComplete: 500,
    removeOnFail: 2000
  }
});

// Stock Check Queue (CRITICAL)
export const stockCheckQueue = new Queue('product:stock:realtime-check', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1, // Fast fail
    timeout: 10000, // 10s max
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

// Price Validate Queue (CRITICAL)
export const priceValidateQueue = new Queue('product:price:validate', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    timeout: 5000, // 5s max
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

// Category Sync Queue
export const categorySyncQueue = new Queue('product:category:sync', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

export const productQueues = {
  productSyncQueue,
  embeddingQueue,
  chunkQueue,
  stockCheckQueue,
  priceValidateQueue,
  categorySyncQueue
};
```

---

## 9. Monitorizare și Alertare

### 9.1 Metrici Prometheus

```typescript
// packages/workers/src/etapa3/metrics/product-metrics.ts

import { Counter, Histogram, Gauge } from 'prom-client';

// Sync Metrics
export const productsSyncedTotal = new Counter({
  name: 'products_synced_total',
  help: 'Total products synced from external sources',
  labelNames: ['action'] // created, updated, deleted
});

export const productSyncDuration = new Histogram({
  name: 'product_sync_duration_seconds',
  help: 'Product sync duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

// Embedding Metrics
export const embeddingsGeneratedTotal = new Counter({
  name: 'embeddings_generated_total',
  help: 'Total embeddings generated'
});

export const openaiTokensUsedTotal = new Counter({
  name: 'openai_tokens_used_total',
  help: 'Total OpenAI tokens used',
  labelNames: ['model']
});

// Chunk Metrics
export const chunksCreatedTotal = new Counter({
  name: 'chunks_created_total',
  help: 'Total chunks created for RAG'
});

// Stock Check Metrics (CRITICAL)
export const stockChecksTotal = new Counter({
  name: 'stock_checks_total',
  help: 'Total stock checks performed',
  labelNames: ['cache'] // hit, miss
});

export const stockCheckDuration = new Histogram({
  name: 'stock_check_duration_ms',
  help: 'Stock check duration in milliseconds',
  buckets: [10, 25, 50, 100, 200, 500, 1000]
});

export const stockAvailable = new Gauge({
  name: 'stock_available_units',
  help: 'Available stock units',
  labelNames: ['sku']
});

// Price Validation Metrics (CRITICAL)
export const priceValidationsTotal = new Counter({
  name: 'price_validations_total',
  help: 'Total price validations',
  labelNames: ['valid'] // true, false
});

export const priceValidationDuration = new Histogram({
  name: 'price_validation_duration_ms',
  help: 'Price validation duration in milliseconds',
  buckets: [5, 10, 25, 50, 100, 200]
});

// Error Metrics
export const productWorkerErrorsTotal = new Counter({
  name: 'product_worker_errors_total',
  help: 'Total errors in product workers',
  labelNames: ['worker', 'error_type']
});
```

### 9.2 Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Etapa 3 - Product Knowledge Workers",
    "panels": [
      {
        "title": "Products Synced (Last Hour)",
        "type": "stat",
        "targets": [{
          "expr": "increase(products_synced_total[1h])"
        }]
      },
      {
        "title": "Stock Check Latency (p99)",
        "type": "gauge",
        "targets": [{
          "expr": "histogram_quantile(0.99, rate(stock_check_duration_ms_bucket[5m]))"
        }],
        "thresholds": {
          "mode": "absolute",
          "steps": [
            { "color": "green", "value": null },
            { "color": "yellow", "value": 100 },
            { "color": "red", "value": 500 }
          ]
        }
      },
      {
        "title": "Price Validation Success Rate",
        "type": "gauge",
        "targets": [{
          "expr": "rate(price_validations_total{valid='true'}[5m]) / rate(price_validations_total[5m]) * 100"
        }],
        "thresholds": {
          "mode": "absolute",
          "steps": [
            { "color": "red", "value": null },
            { "color": "yellow", "value": 90 },
            { "color": "green", "value": 98 }
          ]
        }
      },
      {
        "title": "OpenAI Tokens Used",
        "type": "timeseries",
        "targets": [{
          "expr": "rate(openai_tokens_used_total[5m])"
        }]
      },
      {
        "title": "Worker Errors",
        "type": "timeseries",
        "targets": [{
          "expr": "rate(product_worker_errors_total[5m])"
        }]
      }
    ]
  }
}
```

### 9.3 Alerte SigNoz

```yaml
# alerts/product-workers.yaml

groups:
  - name: product-workers-critical
    rules:
      # Stock Check Latency
      - alert: StockCheckLatencyHigh
        expr: histogram_quantile(0.99, rate(stock_check_duration_ms_bucket[5m])) > 500
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Stock check latency > 500ms (Critical Path)"
          description: "P99 latency: {{ $value }}ms. AI may timeout waiting for stock data."

      # Price Validation Failures
      - alert: PriceValidationFailureRateHigh
        expr: |
          rate(price_validations_total{valid='false'}[5m]) 
          / rate(price_validations_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Price validation failure rate > 10%"
          description: "{{ $value | humanizePercentage }} of prices being rejected."

      # Embedding Generation Failures
      - alert: EmbeddingGenerationBacklog
        expr: bullmq_queue_waiting{queue="product:embedding:generate"} > 1000
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Embedding generation backlog > 1000 jobs"
          description: "{{ $value }} jobs waiting. Check OpenAI rate limits."

      # Sync Failures
      - alert: ProductSyncFailureRateHigh
        expr: rate(products_sync_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Product sync error rate elevated"
          description: "{{ $value }} errors/sec. Check Shopify API status."
```

### 9.4 Runbook Operațional

```markdown
## Runbook: Product Knowledge Workers

### Issue: Stock Check Timeout

**Symptoms:**
- Alert: `StockCheckLatencyHigh`
- AI responses delayed or timing out
- Guardrail failures increasing

**Investigation:**
1. Check Redis latency: `redis-cli --latency`
2. Check ERP API status
3. Check database connection pool

**Resolution:**
1. Increase Redis cache TTL temporarily: `CACHE_TTL=60`
2. Disable ERP check if down: `CHECK_SOURCE=local`
3. Scale stock check workers: `STOCK_CHECK_CONCURRENCY=200`

---

### Issue: Embedding Queue Backlog

**Symptoms:**
- Alert: `EmbeddingGenerationBacklog`
- New products not searchable
- Queue depth > 1000

**Investigation:**
1. Check OpenAI API status
2. Check rate limit errors in logs
3. Check worker process health

**Resolution:**
1. Increase concurrency: `EMBEDDING_CONCURRENCY=100`
2. Reduce embedding batch size temporarily
3. Contact OpenAI if rate limits persistent
```

---

## Document Info

**Fișier:** `etapa3-workers-A-product-knowledge.md`  
**Versiune:** 1.0  
**Ultima Actualizare:** Ianuarie 2026  
**Autor:** Cerniq Development Team  
**Total Workers Documentați:** 6  
**Linii Cod Exemplu:** ~1,200  
**Categorii Acoperite:** Sync, Embeddings, Chunks, Stock, Price, Categories
