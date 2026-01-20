# Etapa 3 - Workers Categoria B: Hybrid Search
## Căutare Semantică + Lexicală cu RRF Fusion

**Versiune:** 1.0  
**Data:** Ianuarie 2026  
**Categoria:** B - Hybrid Search (RAG)  
**Workers:** 3  
**Criticalitate:** Nu (dar critical pentru UX)

---

## Cuprins

1. [Viziune Categoria B](#1-viziune-categoria-b)
2. [Worker #6: search:hybrid:execute](#2-worker-6-searchhybridexecute)
3. [Worker #7: search:query:understand](#3-worker-7-searchqueryunderstand)
4. [Worker #8: search:rerank:cross-encoder](#4-worker-8-searchrerankcross-encoder)
5. [Algoritm RRF (Reciprocal Rank Fusion)](#5-algoritm-rrf-reciprocal-rank-fusion)
6. [Dependențe și Triggere](#6-dependențe-și-triggere)
7. [Monitorizare și Alertare](#7-monitorizare-și-alertare)

---

## 1. Viziune Categoria B

### 1.1 Scopul Categoriei

Categoria B implementează **căutarea hibridă** pentru RAG (Retrieval-Augmented Generation):
- **Vector Search:** Căutare semantică prin embeddings (pgvector)
- **BM25 Search:** Căutare lexicală prin tsvector PostgreSQL
- **RRF Fusion:** Combinarea rezultatelor cu Reciprocal Rank Fusion
- **Cross-Encoder Reranking:** Re-ordonare finală pentru precizie maximă

### 1.2 Arhitectura Căutării

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         HYBRID SEARCH PIPELINE                                   │
│                                                                                  │
│   User Query: "îngrășământ organic pentru porumb rezistent la secetă"           │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                    search:query:understand (#7)                          │   │
│   │                                                                          │   │
│   │   Input: "îngrășământ organic pentru porumb rezistent la secetă"        │   │
│   │                                                                          │   │
│   │   Output:                                                                │   │
│   │   {                                                                      │   │
│   │     intent: "product_search",                                            │   │
│   │     entities: ["îngrășământ", "organic", "porumb"],                      │   │
│   │     filters: { category: "Îngrășăminte", organic: true },                │   │
│   │     expandedQuery: "îngrășământ fertilizant organic natural bio          │   │
│   │                     porumb cereale rezistență secetă"                    │   │
│   │   }                                                                      │   │
│   └──────────────────────────────┬──────────────────────────────────────────┘   │
│                                  │                                               │
│                                  ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                    search:hybrid:execute (#6)                            │   │
│   │                                                                          │   │
│   │   ┌───────────────────┐         ┌───────────────────┐                   │   │
│   │   │   VECTOR SEARCH   │         │    BM25 SEARCH    │                   │   │
│   │   │   (pgvector)      │         │   (tsvector)      │                   │   │
│   │   │                   │         │                   │                   │   │
│   │   │ cosine_distance   │         │ ts_rank_cd        │                   │   │
│   │   │ Top 50 results    │         │ Top 50 results    │                   │   │
│   │   └─────────┬─────────┘         └─────────┬─────────┘                   │   │
│   │             │                             │                              │   │
│   │             └──────────┬──────────────────┘                              │   │
│   │                        │                                                 │   │
│   │                        ▼                                                 │   │
│   │              ┌─────────────────────┐                                     │   │
│   │              │    RRF FUSION       │                                     │   │
│   │              │                     │                                     │   │
│   │              │ score = Σ 1/(k+rank)│                                     │   │
│   │              │ k = 60              │                                     │   │
│   │              │ weights: 60%/40%    │                                     │   │
│   │              └─────────┬───────────┘                                     │   │
│   │                        │                                                 │   │
│   │                        ▼                                                 │   │
│   │               Top 20 Candidates                                          │   │
│   └──────────────────────────────┬──────────────────────────────────────────┘   │
│                                  │                                               │
│                                  ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                 search:rerank:cross-encoder (#8)                         │   │
│   │                                                                          │   │
│   │   Cross-Encoder Model: sentence-transformers/ms-marco-MiniLM-L-6-v2     │   │
│   │                                                                          │   │
│   │   For each candidate:                                                    │   │
│   │     score = model(query, candidate.text)                                 │   │
│   │                                                                          │   │
│   │   Final ranking by cross-encoder score                                   │   │
│   └──────────────────────────────┬──────────────────────────────────────────┘   │
│                                  │                                               │
│                                  ▼                                               │
│                        Top 10 Final Results                                      │
│                                                                                  │
│   1. Îngrășământ Organic Bio-Porumb Plus (score: 0.94)                          │
│   2. Fertilizant Natural Cereale Premium (score: 0.89)                          │
│   3. Bio-Humus pentru Culturi de Câmp (score: 0.85)                             │
│   ...                                                                            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 De ce Hybrid Search?

| Metodă | Puncte Forte | Puncte Slabe |
|--------|--------------|--------------|
| **Vector Only** | Înțelege sinonime și context | Pierde cuvinte cheie exacte |
| **BM25 Only** | Precizie pe termeni exacți | Nu înțelege semantica |
| **Hybrid (RRF)** | Combină ambele avantaje | Complexitate mai mare |

### 1.4 Metrici Cheie

| Metrică | Target | Alertă |
|---------|--------|--------|
| Search Latency (p50) | < 100ms | > 200ms |
| Search Latency (p99) | < 500ms | > 1s |
| Recall@10 | > 0.85 | < 0.75 |
| MRR (Mean Reciprocal Rank) | > 0.70 | < 0.60 |

---

## 2. Worker #6: search:hybrid:execute

### 2.1 Specificații Tehnice

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `search:hybrid:execute` |
| **Categoria** | B - Hybrid Search |
| **Index** | #6 |
| **Rate Limit** | Fără (CPU-bound) |
| **Concurrency** | 50 |
| **Timeout** | 10s |
| **Retries** | 1 |
| **Backoff** | Immediate |
| **Critical** | Nu |
| **Priority** | High (20) |

### 2.2 Responsabilitate

Execută căutarea hibridă:
- Generează embedding pentru query (sau primește de la #7)
- Execută căutare vector în pgvector
- Execută căutare BM25 în tsvector
- Aplică RRF Fusion pentru combinare
- Returnează candidați pentru reranking

### 2.3 Job Data Interface

```typescript
// packages/workers/src/etapa3/types/hybrid-search.types.ts

import { z } from 'zod';

export const HybridSearchJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  query: z.string().min(1).max(500),
  queryEmbedding: z.array(z.number()).length(1536).optional(),
  expandedQuery: z.string().optional(),
  filters: z.object({
    categoryId: z.string().uuid().optional(),
    categoryPath: z.string().optional(),
    brand: z.string().optional(),
    priceMin: z.number().positive().optional(),
    priceMax: z.number().positive().optional(),
    inStock: z.boolean().optional(),
    organic: z.boolean().optional(),
    tags: z.array(z.string()).optional()
  }).optional(),
  limit: z.number().min(1).max(100).default(20),
  vectorWeight: z.number().min(0).max(1).default(0.6),
  bm25Weight: z.number().min(0).max(1).default(0.4),
  rrfK: z.number().positive().default(60),
  includeChunks: z.boolean().default(false),
  correlationId: z.string().optional()
});

export type HybridSearchJobData = z.infer<typeof HybridSearchJobDataSchema>;

export const SearchResultItemSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  description: z.string().optional(),
  categoryPath: z.string().optional(),
  brand: z.string().optional(),
  currentPrice: z.number(),
  imageUrl: z.string().url().optional(),
  vectorScore: z.number(),
  bm25Score: z.number(),
  rrfScore: z.number(),
  vectorRank: z.number(),
  bm25Rank: z.number(),
  matchedChunks: z.array(z.object({
    chunkId: z.string().uuid(),
    content: z.string(),
    score: z.number()
  })).optional()
});

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

export const HybridSearchResultSchema = z.object({
  success: z.boolean(),
  query: z.string(),
  totalResults: z.number(),
  results: z.array(SearchResultItemSchema),
  vectorResultsCount: z.number(),
  bm25ResultsCount: z.number(),
  fusedResultsCount: z.number(),
  searchLatency_ms: z.number(),
  vectorLatency_ms: z.number(),
  bm25Latency_ms: z.number(),
  fusionLatency_ms: z.number(),
  error: z.string().optional()
});

export type HybridSearchResult = z.infer<typeof HybridSearchResultSchema>;
```

### 2.4 Implementare Worker

```typescript
// packages/workers/src/etapa3/workers/search-hybrid-execute.worker.ts

import { Worker, Job } from 'bullmq';
import { eq, and, or, gte, lte, sql, inArray } from 'drizzle-orm';
import { db } from '@cerniq/database';
import { 
  goldProducts, 
  goldProductEmbeddings,
  goldProductChunks,
  stockInventory
} from '@cerniq/database/schema/etapa3';
import { 
  HybridSearchJobData, 
  HybridSearchJobDataSchema,
  HybridSearchResult,
  SearchResultItem
} from '../types/hybrid-search.types';
import { redisConnection, redis } from '@cerniq/shared/redis';
import { logger } from '@cerniq/shared/logger';
import { metrics } from '@cerniq/shared/metrics';
import OpenAI from 'openai';

const QUEUE_NAME = 'search:hybrid:execute';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const CACHE_TTL = 300; // 5 minutes cache for search results
const CACHE_PREFIX = 'search:hybrid:';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export const searchHybridExecuteWorker = new Worker<HybridSearchJobData, HybridSearchResult>(
  QUEUE_NAME,
  async (job: Job<HybridSearchJobData>): Promise<HybridSearchResult> => {
    const startTime = Date.now();
    const timer = metrics.histogram('worker_duration_ms', { queue: QUEUE_NAME });
    
    try {
      // 1. Validare input
      const data = HybridSearchJobDataSchema.parse(job.data);
      
      logger.info('Hybrid search started', {
        jobId: job.id,
        query: data.query,
        correlationId: data.correlationId
      });

      // 2. Check cache
      const cacheKey = `${CACHE_PREFIX}${data.tenantId}:${hashQuery(data)}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const cachedResult = JSON.parse(cached) as HybridSearchResult;
        cachedResult.searchLatency_ms = Date.now() - startTime;
        metrics.counter('search_cache_hits_total').inc();
        return cachedResult;
      }

      // 3. Generate query embedding (if not provided)
      let queryEmbedding = data.queryEmbedding;
      let embeddingLatency = 0;
      
      if (!queryEmbedding) {
        const embeddingStart = Date.now();
        const embeddingResponse = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: data.expandedQuery || data.query
        });
        queryEmbedding = embeddingResponse.data[0].embedding;
        embeddingLatency = Date.now() - embeddingStart;
      }

      // 4. Build filter conditions
      const filterConditions = buildFilterConditions(data);

      // 5. Vector Search
      const vectorStart = Date.now();
      const vectorResults = await executeVectorSearch(
        data.tenantId,
        queryEmbedding,
        filterConditions,
        data.limit * 2 // Get more for fusion
      );
      const vectorLatency = Date.now() - vectorStart;

      // 6. BM25 Search
      const bm25Start = Date.now();
      const bm25Results = await executeBM25Search(
        data.tenantId,
        data.expandedQuery || data.query,
        filterConditions,
        data.limit * 2
      );
      const bm25Latency = Date.now() - bm25Start;

      // 7. RRF Fusion
      const fusionStart = Date.now();
      const fusedResults = applyRRFFusion(
        vectorResults,
        bm25Results,
        data.vectorWeight,
        data.bm25Weight,
        data.rrfK
      );
      const fusionLatency = Date.now() - fusionStart;

      // 8. Get chunk matches if requested
      let resultsWithChunks = fusedResults.slice(0, data.limit);
      
      if (data.includeChunks) {
        resultsWithChunks = await enrichWithChunks(
          data.tenantId,
          resultsWithChunks,
          queryEmbedding
        );
      }

      // 9. Build final result
      const result: HybridSearchResult = {
        success: true,
        query: data.query,
        totalResults: fusedResults.length,
        results: resultsWithChunks,
        vectorResultsCount: vectorResults.length,
        bm25ResultsCount: bm25Results.length,
        fusedResultsCount: fusedResults.length,
        searchLatency_ms: Date.now() - startTime,
        vectorLatency_ms: vectorLatency,
        bm25Latency_ms: bm25Latency,
        fusionLatency_ms: fusionLatency
      };

      // 10. Cache result
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

      metrics.counter('search_requests_total').inc();
      metrics.histogram('search_latency_ms').observe(Date.now() - startTime);
      metrics.histogram('search_results_count').observe(fusedResults.length);
      timer.observe(Date.now() - startTime);

      logger.info('Hybrid search completed', {
        jobId: job.id,
        resultsCount: fusedResults.length,
        latency_ms: Date.now() - startTime
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Hybrid search failed', {
        jobId: job.id,
        query: job.data.query,
        error: errorMessage
      });

      metrics.counter('search_errors_total').inc();

      return {
        success: false,
        query: job.data.query,
        totalResults: 0,
        results: [],
        vectorResultsCount: 0,
        bm25ResultsCount: 0,
        fusedResultsCount: 0,
        searchLatency_ms: Date.now() - startTime,
        vectorLatency_ms: 0,
        bm25Latency_ms: 0,
        fusionLatency_ms: 0,
        error: errorMessage
      };
    }
  },
  {
    connection: redisConnection,
    concurrency: 50
  }
);

// Helper Functions

interface VectorSearchResult {
  productId: string;
  sku: string;
  name: string;
  description: string | null;
  categoryPath: string | null;
  brand: string | null;
  currentPrice: number;
  imageUrl: string | null;
  distance: number;
}

interface BM25SearchResult {
  productId: string;
  sku: string;
  name: string;
  description: string | null;
  categoryPath: string | null;
  brand: string | null;
  currentPrice: number;
  imageUrl: string | null;
  rank: number;
}

function buildFilterConditions(data: HybridSearchJobData): any[] {
  const conditions: any[] = [eq(goldProducts.tenant_id, data.tenantId)];
  conditions.push(eq(goldProducts.status, 'ACTIVE'));
  
  if (data.filters) {
    const f = data.filters;
    
    if (f.categoryId) {
      conditions.push(eq(goldProducts.category_id, f.categoryId));
    }
    
    if (f.categoryPath) {
      conditions.push(sql`${goldProducts.category_path} LIKE ${f.categoryPath + '%'}`);
    }
    
    if (f.brand) {
      conditions.push(eq(goldProducts.brand, f.brand));
    }
    
    if (f.priceMin !== undefined) {
      conditions.push(gte(goldProducts.current_price, f.priceMin));
    }
    
    if (f.priceMax !== undefined) {
      conditions.push(lte(goldProducts.current_price, f.priceMax));
    }
    
    if (f.tags && f.tags.length > 0) {
      conditions.push(sql`${goldProducts.tags} && ${f.tags}`);
    }
  }
  
  return conditions;
}

async function executeVectorSearch(
  tenantId: string,
  queryEmbedding: number[],
  filterConditions: any[],
  limit: number
): Promise<VectorSearchResult[]> {
  const embeddingString = `[${queryEmbedding.join(',')}]`;
  
  const results = await db
    .select({
      productId: goldProducts.id,
      sku: goldProducts.sku,
      name: goldProducts.name,
      description: goldProducts.description,
      categoryPath: goldProducts.category_path,
      brand: goldProducts.brand,
      currentPrice: goldProducts.current_price,
      imageUrl: sql<string>`(${goldProducts.images}->0->>'url')`,
      distance: sql<number>`${goldProductEmbeddings.embedding} <=> ${embeddingString}::vector`
    })
    .from(goldProducts)
    .innerJoin(
      goldProductEmbeddings,
      and(
        eq(goldProductEmbeddings.product_id, goldProducts.id),
        eq(goldProductEmbeddings.is_current, true)
      )
    )
    .where(and(...filterConditions))
    .orderBy(sql`${goldProductEmbeddings.embedding} <=> ${embeddingString}::vector`)
    .limit(limit);
  
  return results;
}

async function executeBM25Search(
  tenantId: string,
  query: string,
  filterConditions: any[],
  limit: number
): Promise<BM25SearchResult[]> {
  // Normalize query for tsquery
  const tsQuery = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .join(' & ');
  
  const results = await db
    .select({
      productId: goldProducts.id,
      sku: goldProducts.sku,
      name: goldProducts.name,
      description: goldProducts.description,
      categoryPath: goldProducts.category_path,
      brand: goldProducts.brand,
      currentPrice: goldProducts.current_price,
      imageUrl: sql<string>`(${goldProducts.images}->0->>'url')`,
      rank: sql<number>`ts_rank_cd(${goldProducts.search_vector}, to_tsquery('romanian', ${tsQuery}))`
    })
    .from(goldProducts)
    .where(and(
      ...filterConditions,
      sql`${goldProducts.search_vector} @@ to_tsquery('romanian', ${tsQuery})`
    ))
    .orderBy(sql`ts_rank_cd(${goldProducts.search_vector}, to_tsquery('romanian', ${tsQuery})) DESC`)
    .limit(limit);
  
  return results;
}

function applyRRFFusion(
  vectorResults: VectorSearchResult[],
  bm25Results: BM25SearchResult[],
  vectorWeight: number,
  bm25Weight: number,
  k: number
): SearchResultItem[] {
  // Build rank maps
  const vectorRanks = new Map<string, number>();
  vectorResults.forEach((r, idx) => {
    vectorRanks.set(r.productId, idx + 1);
  });
  
  const bm25Ranks = new Map<string, number>();
  bm25Results.forEach((r, idx) => {
    bm25Ranks.set(r.productId, idx + 1);
  });
  
  // Get all unique product IDs
  const allProductIds = new Set([
    ...vectorResults.map(r => r.productId),
    ...bm25Results.map(r => r.productId)
  ]);
  
  // Calculate RRF scores
  const rrfScores: Map<string, {
    rrfScore: number;
    vectorRank: number;
    bm25Rank: number;
    vectorScore: number;
    bm25Score: number;
    product: VectorSearchResult | BM25SearchResult;
  }> = new Map();
  
  for (const productId of allProductIds) {
    const vectorRank = vectorRanks.get(productId) ?? vectorResults.length + 1;
    const bm25Rank = bm25Ranks.get(productId) ?? bm25Results.length + 1;
    
    // RRF formula: score = Σ weight / (k + rank)
    const vectorContribution = vectorWeight / (k + vectorRank);
    const bm25Contribution = bm25Weight / (k + bm25Rank);
    const rrfScore = vectorContribution + bm25Contribution;
    
    // Get product data from whichever result set has it
    const product = vectorResults.find(r => r.productId === productId) 
      || bm25Results.find(r => r.productId === productId)!;
    
    rrfScores.set(productId, {
      rrfScore,
      vectorRank,
      bm25Rank,
      vectorScore: 1 - (vectorResults.find(r => r.productId === productId)?.distance ?? 1),
      bm25Score: bm25Results.find(r => r.productId === productId)?.rank ?? 0,
      product
    });
  }
  
  // Sort by RRF score
  const sorted = [...rrfScores.entries()]
    .sort((a, b) => b[1].rrfScore - a[1].rrfScore);
  
  // Map to SearchResultItem
  return sorted.map(([productId, data]) => ({
    productId,
    sku: data.product.sku,
    name: data.product.name,
    description: data.product.description ?? undefined,
    categoryPath: data.product.categoryPath ?? undefined,
    brand: data.product.brand ?? undefined,
    currentPrice: data.product.currentPrice,
    imageUrl: data.product.imageUrl ?? undefined,
    vectorScore: data.vectorScore,
    bm25Score: data.bm25Score,
    rrfScore: data.rrfScore,
    vectorRank: data.vectorRank,
    bm25Rank: data.bm25Rank
  }));
}

async function enrichWithChunks(
  tenantId: string,
  results: SearchResultItem[],
  queryEmbedding: number[]
): Promise<SearchResultItem[]> {
  const productIds = results.map(r => r.productId);
  const embeddingString = `[${queryEmbedding.join(',')}]`;
  
  const chunks = await db
    .select({
      productId: goldProductChunks.product_id,
      chunkId: goldProductChunks.id,
      content: goldProductChunks.content,
      score: sql<number>`1 - (${goldProductChunks.embedding} <=> ${embeddingString}::vector)`
    })
    .from(goldProductChunks)
    .where(and(
      eq(goldProductChunks.tenant_id, tenantId),
      inArray(goldProductChunks.product_id, productIds)
    ))
    .orderBy(sql`${goldProductChunks.embedding} <=> ${embeddingString}::vector`)
    .limit(results.length * 3); // Top 3 chunks per product
  
  // Group by product
  const chunksByProduct = new Map<string, typeof chunks>();
  chunks.forEach(chunk => {
    const existing = chunksByProduct.get(chunk.productId) ?? [];
    existing.push(chunk);
    chunksByProduct.set(chunk.productId, existing);
  });
  
  // Enrich results
  return results.map(result => ({
    ...result,
    matchedChunks: (chunksByProduct.get(result.productId) ?? [])
      .slice(0, 3)
      .map(c => ({
        chunkId: c.chunkId,
        content: c.content,
        score: c.score
      }))
  }));
}

function hashQuery(data: HybridSearchJobData): string {
  const crypto = require('crypto');
  const key = JSON.stringify({
    query: data.query,
    expandedQuery: data.expandedQuery,
    filters: data.filters,
    limit: data.limit
  });
  return crypto.createHash('md5').update(key).digest('hex');
}

export default searchHybridExecuteWorker;
```

---

## 3. Worker #7: search:query:understand

### 3.1 Specificații Tehnice

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `search:query:understand` |
| **Categoria** | B - Hybrid Search |
| **Index** | #7 |
| **Rate Limit** | 60/min (LLM calls) |
| **Concurrency** | 20 |
| **Timeout** | 15s |
| **Retries** | 2 |
| **Backoff** | Exponential (1s, 2s) |
| **Critical** | Nu |
| **Priority** | Normal (50) |

### 3.2 Responsabilitate

Analizează și expandează query-ul utilizatorului:
- Extrage intenția (product_search, price_check, stock_check, etc.)
- Identifică entități (produse, categorii, branduri)
- Generează filtre structurate
- Expandează query cu sinonime și termeni relevanți

### 3.3 Job Data Interface

```typescript
// packages/workers/src/etapa3/types/query-understand.types.ts

import { z } from 'zod';

export const QueryUnderstandJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  query: z.string().min(1).max(500),
  conversationContext: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional(),
  userPreferences: z.object({
    preferredCategories: z.array(z.string()).optional(),
    preferredBrands: z.array(z.string()).optional(),
    priceRange: z.object({
      min: z.number().optional(),
      max: z.number().optional()
    }).optional()
  }).optional(),
  correlationId: z.string().optional()
});

export type QueryUnderstandJobData = z.infer<typeof QueryUnderstandJobDataSchema>;

export const QueryUnderstandResultSchema = z.object({
  success: z.boolean(),
  originalQuery: z.string(),
  intent: z.enum([
    'product_search',
    'price_check',
    'stock_check',
    'comparison',
    'recommendation',
    'question',
    'other'
  ]),
  intentConfidence: z.number().min(0).max(1),
  entities: z.array(z.object({
    type: z.enum(['product', 'category', 'brand', 'attribute', 'quantity', 'price']),
    value: z.string(),
    normalized: z.string().optional(),
    confidence: z.number().min(0).max(1)
  })),
  filters: z.object({
    categoryId: z.string().uuid().optional(),
    categoryPath: z.string().optional(),
    brand: z.string().optional(),
    priceMin: z.number().optional(),
    priceMax: z.number().optional(),
    inStock: z.boolean().optional(),
    attributes: z.record(z.string()).optional()
  }),
  expandedQuery: z.string(),
  synonymsUsed: z.array(z.string()),
  suggestedQueries: z.array(z.string()).optional(),
  duration_ms: z.number(),
  error: z.string().optional()
});

export type QueryUnderstandResult = z.infer<typeof QueryUnderstandResultSchema>;
```

### 3.4 Implementare Worker

```typescript
// packages/workers/src/etapa3/workers/search-query-understand.worker.ts

import { Worker, Job } from 'bullmq';
import { eq, ilike, sql } from 'drizzle-orm';
import { db } from '@cerniq/database';
import { goldProductCategories } from '@cerniq/database/schema/etapa3';
import { 
  QueryUnderstandJobData, 
  QueryUnderstandJobDataSchema,
  QueryUnderstandResult 
} from '../types/query-understand.types';
import { redisConnection } from '@cerniq/shared/redis';
import { logger } from '@cerniq/shared/logger';
import { metrics } from '@cerniq/shared/metrics';
import OpenAI from 'openai';

const QUEUE_NAME = 'search:query:understand';

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY!, // Using xAI Grok
  baseURL: 'https://api.x.ai/v1'
});

// Romanian agricultural synonyms dictionary
const AGRICULTURAL_SYNONYMS: Record<string, string[]> = {
  'îngrășământ': ['fertilizant', 'nutrient', 'îmbogățitor sol', 'compost'],
  'pesticid': ['fitosanitar', 'insecticid', 'fungicid', 'erbicid'],
  'semințe': ['sămânță', 'material săditor', 'semințe certificate'],
  'porumb': ['porumbul', 'cereale', 'corn', 'grâu'],
  'organic': ['bio', 'ecologic', 'natural', 'fără chimicale'],
  'irigație': ['udare', 'stropire', 'irigare', 'sistem de apă'],
  'tractor': ['utilaj agricol', 'mașină agricolă', 'echipament'],
  'recoltă': ['producție', 'randament', 'yield', 'rod'],
  'sol': ['pământ', 'teren', 'arabil', 'agricol'],
  'seceră': ['drought', 'uscăciune', 'deficit apă', 'rezistent secetă']
};

export const searchQueryUnderstandWorker = new Worker<QueryUnderstandJobData, QueryUnderstandResult>(
  QUEUE_NAME,
  async (job: Job<QueryUnderstandJobData>): Promise<QueryUnderstandResult> => {
    const startTime = Date.now();
    const timer = metrics.histogram('worker_duration_ms', { queue: QUEUE_NAME });
    
    try {
      // 1. Validare input
      const data = QueryUnderstandJobDataSchema.parse(job.data);
      
      logger.info('Query understanding started', {
        jobId: job.id,
        query: data.query,
        correlationId: data.correlationId
      });

      // 2. Call LLM for intent and entity extraction
      const llmResult = await analyzeQueryWithLLM(data.query, data.conversationContext);

      // 3. Match entities to database
      const enrichedEntities = await enrichEntities(data.tenantId, llmResult.entities);

      // 4. Build filters from entities
      const filters = buildFiltersFromEntities(enrichedEntities, data.userPreferences);

      // 5. Expand query with synonyms
      const { expandedQuery, synonymsUsed } = expandQueryWithSynonyms(
        data.query, 
        enrichedEntities
      );

      // 6. Generate suggestions
      const suggestedQueries = generateSuggestions(data.query, enrichedEntities);

      const result: QueryUnderstandResult = {
        success: true,
        originalQuery: data.query,
        intent: llmResult.intent,
        intentConfidence: llmResult.intentConfidence,
        entities: enrichedEntities,
        filters,
        expandedQuery,
        synonymsUsed,
        suggestedQueries,
        duration_ms: Date.now() - startTime
      };

      metrics.counter('queries_understood_total', { intent: llmResult.intent }).inc();
      timer.observe(Date.now() - startTime);

      logger.info('Query understanding completed', {
        jobId: job.id,
        intent: llmResult.intent,
        entitiesCount: enrichedEntities.length,
        duration_ms: Date.now() - startTime
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Query understanding failed', {
        jobId: job.id,
        query: job.data.query,
        error: errorMessage
      });

      metrics.counter('query_understand_errors_total').inc();

      // Return fallback result
      return {
        success: false,
        originalQuery: job.data.query,
        intent: 'product_search',
        intentConfidence: 0.5,
        entities: [],
        filters: {},
        expandedQuery: job.data.query,
        synonymsUsed: [],
        duration_ms: Date.now() - startTime,
        error: errorMessage
      };
    }
  },
  {
    connection: redisConnection,
    concurrency: 20,
    limiter: {
      max: 1,
      duration: 1000 // 1 req/sec = 60/min
    }
  }
);

// LLM Analysis

interface LLMAnalysisResult {
  intent: 'product_search' | 'price_check' | 'stock_check' | 'comparison' | 'recommendation' | 'question' | 'other';
  intentConfidence: number;
  entities: Array<{
    type: 'product' | 'category' | 'brand' | 'attribute' | 'quantity' | 'price';
    value: string;
    confidence: number;
  }>;
}

async function analyzeQueryWithLLM(
  query: string,
  context?: Array<{ role: string; content: string }>
): Promise<LLMAnalysisResult> {
  const systemPrompt = `Ești un asistent specializat în analiza query-urilor pentru un sistem de căutare produse agricole.

Analizează query-ul și returnează JSON cu:
- intent: unul din [product_search, price_check, stock_check, comparison, recommendation, question, other]
- intentConfidence: 0-1
- entities: array de {type, value, confidence}
  - type: product, category, brand, attribute, quantity, price

Categorii disponibile: Semințe, Îngrășăminte, Pesticide, Echipamente, Irigații, Servicii

Răspunde DOAR cu JSON valid, fără explicații.`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  if (context && context.length > 0) {
    messages.push(...context.slice(-3)); // Last 3 messages for context
  }

  messages.push({ role: 'user', content: query });

  const response = await openai.chat.completions.create({
    model: 'grok-2-latest',
    messages,
    temperature: 0.1,
    max_tokens: 500,
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0].message.content || '{}';
  const parsed = JSON.parse(content);

  return {
    intent: parsed.intent || 'product_search',
    intentConfidence: parsed.intentConfidence || 0.7,
    entities: parsed.entities || []
  };
}

// Entity Enrichment

interface EnrichedEntity {
  type: 'product' | 'category' | 'brand' | 'attribute' | 'quantity' | 'price';
  value: string;
  normalized?: string;
  confidence: number;
}

async function enrichEntities(
  tenantId: string,
  entities: LLMAnalysisResult['entities']
): Promise<EnrichedEntity[]> {
  const enriched: EnrichedEntity[] = [];

  for (const entity of entities) {
    if (entity.type === 'category') {
      // Try to match category in database
      const category = await db.query.goldProductCategories.findFirst({
        where: ilike(goldProductCategories.name, `%${entity.value}%`)
      });

      enriched.push({
        ...entity,
        normalized: category?.name || entity.value
      });
    } else {
      enriched.push({
        ...entity,
        normalized: entity.value.toLowerCase()
      });
    }
  }

  return enriched;
}

// Filter Building

function buildFiltersFromEntities(
  entities: EnrichedEntity[],
  preferences?: QueryUnderstandJobData['userPreferences']
): QueryUnderstandResult['filters'] {
  const filters: QueryUnderstandResult['filters'] = {};

  for (const entity of entities) {
    switch (entity.type) {
      case 'category':
        filters.categoryPath = entity.normalized;
        break;
      case 'brand':
        filters.brand = entity.value;
        break;
      case 'price':
        const priceMatch = entity.value.match(/(\d+)/);
        if (priceMatch) {
          // Simple heuristic: if contains "sub" or "maxim", set as max
          if (entity.value.includes('sub') || entity.value.includes('maxim')) {
            filters.priceMax = parseInt(priceMatch[1]);
          } else if (entity.value.includes('peste') || entity.value.includes('minim')) {
            filters.priceMin = parseInt(priceMatch[1]);
          }
        }
        break;
      case 'attribute':
        if (!filters.attributes) filters.attributes = {};
        filters.attributes[entity.type] = entity.value;
        break;
    }
  }

  // Apply user preferences
  if (preferences?.priceRange) {
    if (preferences.priceRange.min && !filters.priceMin) {
      filters.priceMin = preferences.priceRange.min;
    }
    if (preferences.priceRange.max && !filters.priceMax) {
      filters.priceMax = preferences.priceRange.max;
    }
  }

  return filters;
}

// Query Expansion

function expandQueryWithSynonyms(
  query: string,
  entities: EnrichedEntity[]
): { expandedQuery: string; synonymsUsed: string[] } {
  const words = query.toLowerCase().split(/\s+/);
  const synonymsUsed: string[] = [];
  const expandedTerms: string[] = [...words];

  for (const word of words) {
    // Check dictionary
    const synonyms = AGRICULTURAL_SYNONYMS[word];
    if (synonyms) {
      expandedTerms.push(...synonyms);
      synonymsUsed.push(...synonyms);
    }
  }

  // Add entity-based expansions
  for (const entity of entities) {
    if (entity.type === 'category' && entity.normalized) {
      expandedTerms.push(entity.normalized);
    }
  }

  // Deduplicate
  const uniqueTerms = [...new Set(expandedTerms)];
  
  return {
    expandedQuery: uniqueTerms.join(' '),
    synonymsUsed
  };
}

// Suggestion Generation

function generateSuggestions(
  query: string,
  entities: EnrichedEntity[]
): string[] {
  const suggestions: string[] = [];

  // Category-specific suggestions
  const categoryEntity = entities.find(e => e.type === 'category');
  if (categoryEntity) {
    suggestions.push(`${categoryEntity.value} cele mai populare`);
    suggestions.push(`${categoryEntity.value} promoții`);
  }

  // Brand suggestions if product mentioned
  const productEntity = entities.find(e => e.type === 'product');
  if (productEntity) {
    suggestions.push(`alternative la ${productEntity.value}`);
    suggestions.push(`${productEntity.value} review`);
  }

  return suggestions.slice(0, 3);
}

export default searchQueryUnderstandWorker;
```

---

## 4. Worker #8: search:rerank:cross-encoder

### 4.1 Specificații Tehnice

| Atribut | Valoare |
|---------|---------|
| **Queue Name** | `search:rerank:cross-encoder` |
| **Categoria** | B - Hybrid Search |
| **Index** | #8 |
| **Rate Limit** | Fără (CPU/GPU-bound) |
| **Concurrency** | 20 |
| **Timeout** | 30s |
| **Retries** | 1 |
| **Backoff** | Immediate |
| **Critical** | Nu |
| **Priority** | Normal (50) |

### 4.2 Responsabilitate

Re-ordonează rezultatele cu Cross-Encoder:
- Primește candidații de la hybrid search
- Calculează scor cross-encoder pentru (query, document)
- Re-ordonează pentru precizie maximă
- Filtrează rezultatele sub threshold

### 4.3 Job Data Interface

```typescript
// packages/workers/src/etapa3/types/rerank.types.ts

import { z } from 'zod';
import { SearchResultItemSchema } from './hybrid-search.types';

export const RerankJobDataSchema = z.object({
  tenantId: z.string().uuid(),
  query: z.string(),
  candidates: z.array(SearchResultItemSchema),
  model: z.enum(['cross-encoder/ms-marco-MiniLM-L-6-v2', 'BAAI/bge-reranker-base']).default('cross-encoder/ms-marco-MiniLM-L-6-v2'),
  topK: z.number().min(1).max(50).default(10),
  scoreThreshold: z.number().min(0).max(1).default(0.3),
  correlationId: z.string().optional()
});

export type RerankJobData = z.infer<typeof RerankJobDataSchema>;

export const RerankResultSchema = z.object({
  success: z.boolean(),
  query: z.string(),
  results: z.array(SearchResultItemSchema.extend({
    crossEncoderScore: z.number()
  })),
  totalCandidates: z.number(),
  filteredCount: z.number(),
  rerankLatency_ms: z.number(),
  modelUsed: z.string(),
  error: z.string().optional()
});

export type RerankResult = z.infer<typeof RerankResultSchema>;
```

### 4.4 Implementare Worker

```typescript
// packages/workers/src/etapa3/workers/search-rerank-cross-encoder.worker.ts

import { Worker, Job } from 'bullmq';
import { 
  RerankJobData, 
  RerankJobDataSchema,
  RerankResult 
} from '../types/rerank.types';
import { redisConnection } from '@cerniq/shared/redis';
import { logger } from '@cerniq/shared/logger';
import { metrics } from '@cerniq/shared/metrics';
import { pipeline, env } from '@xenova/transformers';

const QUEUE_NAME = 'search:rerank:cross-encoder';

// Disable local model check (use remote)
env.allowLocalModels = false;

// Cache the pipeline
let rerankPipeline: any = null;

async function getRerankPipeline(model: string) {
  if (!rerankPipeline) {
    logger.info('Loading cross-encoder model', { model });
    rerankPipeline = await pipeline('text-classification', model, {
      quantized: true // Use quantized for speed
    });
  }
  return rerankPipeline;
}

export const searchRerankCrossEncoderWorker = new Worker<RerankJobData, RerankResult>(
  QUEUE_NAME,
  async (job: Job<RerankJobData>): Promise<RerankResult> => {
    const startTime = Date.now();
    const timer = metrics.histogram('worker_duration_ms', { queue: QUEUE_NAME });
    
    try {
      // 1. Validare input
      const data = RerankJobDataSchema.parse(job.data);
      
      logger.info('Reranking started', {
        jobId: job.id,
        query: data.query,
        candidatesCount: data.candidates.length,
        correlationId: data.correlationId
      });

      if (data.candidates.length === 0) {
        return {
          success: true,
          query: data.query,
          results: [],
          totalCandidates: 0,
          filteredCount: 0,
          rerankLatency_ms: Date.now() - startTime,
          modelUsed: data.model
        };
      }

      // 2. Get rerank pipeline
      const reranker = await getRerankPipeline(data.model);

      // 3. Prepare query-document pairs
      const pairs = data.candidates.map(candidate => ({
        text: data.query,
        text_pair: `${candidate.name}. ${candidate.description || ''}`
      }));

      // 4. Run cross-encoder
      const rerankStart = Date.now();
      const scores = await reranker(pairs, {
        batch_size: 32
      });
      const rerankLatency = Date.now() - rerankStart;

      // 5. Combine scores with candidates
      const scoredCandidates = data.candidates.map((candidate, idx) => ({
        ...candidate,
        crossEncoderScore: scores[idx]?.score ?? 0
      }));

      // 6. Filter by threshold and sort
      const filteredResults = scoredCandidates
        .filter(c => c.crossEncoderScore >= data.scoreThreshold)
        .sort((a, b) => b.crossEncoderScore - a.crossEncoderScore)
        .slice(0, data.topK);

      const result: RerankResult = {
        success: true,
        query: data.query,
        results: filteredResults,
        totalCandidates: data.candidates.length,
        filteredCount: data.candidates.length - filteredResults.length,
        rerankLatency_ms: rerankLatency,
        modelUsed: data.model
      };

      metrics.counter('rerank_requests_total').inc();
      metrics.histogram('rerank_latency_ms').observe(rerankLatency);
      metrics.histogram('rerank_results_count').observe(filteredResults.length);
      timer.observe(Date.now() - startTime);

      logger.info('Reranking completed', {
        jobId: job.id,
        resultsCount: filteredResults.length,
        filtered: data.candidates.length - filteredResults.length,
        latency_ms: rerankLatency
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Reranking failed', {
        jobId: job.id,
        query: job.data.query,
        error: errorMessage
      });

      metrics.counter('rerank_errors_total').inc();

      // Return candidates without reranking as fallback
      return {
        success: false,
        query: job.data.query,
        results: job.data.candidates.slice(0, job.data.topK).map(c => ({
          ...c,
          crossEncoderScore: c.rrfScore
        })),
        totalCandidates: job.data.candidates.length,
        filteredCount: 0,
        rerankLatency_ms: Date.now() - startTime,
        modelUsed: job.data.model,
        error: errorMessage
      };
    }
  },
  {
    connection: redisConnection,
    concurrency: 20
  }
);

export default searchRerankCrossEncoderWorker;
```

---

## 5. Algoritm RRF (Reciprocal Rank Fusion)

### 5.1 Formula Matematică

```
RRF(d) = Σ (weight_i / (k + rank_i(d)))
```

Unde:
- `d` = documentul
- `k` = constantă de smoothing (default: 60)
- `rank_i(d)` = poziția documentului în rezultatele retriever-ului i
- `weight_i` = ponderea retriever-ului i

### 5.2 Exemplu Calcul

```
Query: "îngrășământ organic porumb"

Vector Search Results (weight: 0.6):
1. Produs A (rank 1)
2. Produs B (rank 2)
3. Produs C (rank 3)
4. Produs D (rank 5)

BM25 Search Results (weight: 0.4):
1. Produs C (rank 1)
2. Produs A (rank 2)
3. Produs E (rank 3)
4. Produs B (rank 6)

RRF Calculation (k=60):

Produs A:
  Vector: 0.6 / (60 + 1) = 0.00984
  BM25:   0.4 / (60 + 2) = 0.00645
  Total:  0.01629

Produs B:
  Vector: 0.6 / (60 + 2) = 0.00968
  BM25:   0.4 / (60 + 6) = 0.00606
  Total:  0.01574

Produs C:
  Vector: 0.6 / (60 + 3) = 0.00952
  BM25:   0.4 / (60 + 1) = 0.00656
  Total:  0.01608

Produs D:
  Vector: 0.6 / (60 + 5) = 0.00923
  BM25:   0.4 / (60 + 100) = 0.00250 (not in BM25, use max+1)
  Total:  0.01173

Produs E:
  Vector: 0.6 / (60 + 100) = 0.00375 (not in vector, use max+1)
  BM25:   0.4 / (60 + 3) = 0.00635
  Total:  0.01010

Final Ranking:
1. Produs A (0.01629)
2. Produs C (0.01608)
3. Produs B (0.01574)
4. Produs D (0.01173)
5. Produs E (0.01010)
```

### 5.3 SQL Implementation (Funcție PostgreSQL)

```sql
-- Funcție pentru RRF în PostgreSQL
CREATE OR REPLACE FUNCTION hybrid_product_search(
  p_tenant_id UUID,
  p_query_embedding vector(1536),
  p_query_text TEXT,
  p_k INTEGER DEFAULT 60,
  p_vector_weight NUMERIC DEFAULT 0.6,
  p_bm25_weight NUMERIC DEFAULT 0.4,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  product_id UUID,
  sku TEXT,
  name TEXT,
  description TEXT,
  category_path TEXT,
  brand TEXT,
  current_price NUMERIC,
  vector_score NUMERIC,
  bm25_score NUMERIC,
  rrf_score NUMERIC,
  vector_rank INTEGER,
  bm25_rank INTEGER
)
LANGUAGE plpgsql AS $$
DECLARE
  v_tsquery tsquery;
BEGIN
  -- Prepare tsquery
  v_tsquery := plainto_tsquery('romanian', p_query_text);

  RETURN QUERY
  WITH vector_results AS (
    SELECT 
      p.id,
      1 - (e.embedding <=> p_query_embedding) as score,
      ROW_NUMBER() OVER (ORDER BY e.embedding <=> p_query_embedding) as rank
    FROM gold_products p
    JOIN gold_product_embeddings e ON e.product_id = p.id AND e.is_current = true
    WHERE p.tenant_id = p_tenant_id
      AND p.status = 'ACTIVE'
    ORDER BY e.embedding <=> p_query_embedding
    LIMIT p_limit * 3
  ),
  bm25_results AS (
    SELECT 
      p.id,
      ts_rank_cd(p.search_vector, v_tsquery) as score,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(p.search_vector, v_tsquery) DESC) as rank
    FROM gold_products p
    WHERE p.tenant_id = p_tenant_id
      AND p.status = 'ACTIVE'
      AND p.search_vector @@ v_tsquery
    ORDER BY ts_rank_cd(p.search_vector, v_tsquery) DESC
    LIMIT p_limit * 3
  ),
  combined AS (
    SELECT 
      COALESCE(v.id, b.id) as id,
      COALESCE(v.score, 0) as vector_score,
      COALESCE(b.score, 0) as bm25_score,
      COALESCE(v.rank, p_limit * 3 + 1) as vector_rank,
      COALESCE(b.rank, p_limit * 3 + 1) as bm25_rank,
      -- RRF Formula
      (p_vector_weight / (p_k + COALESCE(v.rank, p_limit * 3 + 1))) +
      (p_bm25_weight / (p_k + COALESCE(b.rank, p_limit * 3 + 1))) as rrf_score
    FROM vector_results v
    FULL OUTER JOIN bm25_results b ON v.id = b.id
  )
  SELECT 
    p.id,
    p.sku,
    p.name,
    p.description,
    p.category_path,
    p.brand,
    p.current_price,
    c.vector_score::NUMERIC,
    c.bm25_score::NUMERIC,
    c.rrf_score::NUMERIC,
    c.vector_rank::INTEGER,
    c.bm25_rank::INTEGER
  FROM combined c
  JOIN gold_products p ON p.id = c.id
  ORDER BY c.rrf_score DESC
  LIMIT p_limit;
END;
$$;
```

---

## 6. Dependențe și Triggere

### 6.1 Diagrama Dependențe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    CATEGORIA B - HYBRID SEARCH FLOW                              │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                     AI AGENT (Categoria C)                               │   │
│   │   "Căutați produse pentru: îngrășământ organic porumb"                  │   │
│   └─────────────────────────────┬───────────────────────────────────────────┘   │
│                                 │                                               │
│                                 ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                 search:query:understand (#7)                             │   │
│   │   - Extract intent: product_search                                       │   │
│   │   - Extract entities: [îngrășământ, organic, porumb]                     │   │
│   │   - Build filters: { category: "Îngrășăminte" }                          │   │
│   │   - Expand query with synonyms                                           │   │
│   └─────────────────────────────┬───────────────────────────────────────────┘   │
│                                 │                                               │
│                   ┌─────────────┴─────────────┐                                │
│                   │                           │                                 │
│                   ▼                           ▼                                 │
│   ┌─────────────────────────┐   ┌─────────────────────────┐                    │
│   │    OpenAI Embeddings    │   │    Filters + Expanded   │                    │
│   │    (text-embedding-3)   │   │         Query           │                    │
│   └───────────┬─────────────┘   └───────────┬─────────────┘                    │
│               │                             │                                   │
│               └─────────────┬───────────────┘                                   │
│                             │                                                   │
│                             ▼                                                   │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                   search:hybrid:execute (#6)                             │   │
│   │                                                                          │   │
│   │   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │   │
│   │   │ Vector Search   │     │  BM25 Search    │     │   RRF Fusion    │   │   │
│   │   │ (pgvector)      │────▶│  (tsvector)     │────▶│   (k=60)        │   │   │
│   │   │ 50 results      │     │  50 results     │     │   20 candidates │   │   │
│   │   └─────────────────┘     └─────────────────┘     └─────────────────┘   │   │
│   └─────────────────────────────┬───────────────────────────────────────────┘   │
│                                 │                                               │
│                                 │ (Optional, for high precision)                │
│                                 ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │               search:rerank:cross-encoder (#8)                           │   │
│   │   - Model: ms-marco-MiniLM-L-6-v2                                        │   │
│   │   - Score each (query, document) pair                                    │   │
│   │   - Filter below threshold                                               │   │
│   │   - Return top 10                                                        │   │
│   └─────────────────────────────┬───────────────────────────────────────────┘   │
│                                 │                                               │
│                                 ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                     FINAL SEARCH RESULTS                                 │   │
│   │   Returned to AI Agent for response generation                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Configurație Queues

```typescript
// packages/workers/src/etapa3/queues/search-queues.ts

import { Queue } from 'bullmq';
import { redisConnection } from '@cerniq/shared/redis';

export const hybridSearchQueue = new Queue('search:hybrid:execute', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    timeout: 10000,
    removeOnComplete: 500,
    removeOnFail: 1000
  }
});

export const queryUnderstandQueue = new Queue('search:query:understand', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    timeout: 15000,
    removeOnComplete: 500,
    removeOnFail: 1000
  }
});

export const rerankQueue = new Queue('search:rerank:cross-encoder', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    timeout: 30000,
    removeOnComplete: 500,
    removeOnFail: 1000
  }
});

export const searchQueues = {
  hybridSearchQueue,
  queryUnderstandQueue,
  rerankQueue
};
```

---

## 7. Monitorizare și Alertare

### 7.1 Metrici Prometheus

```typescript
// packages/workers/src/etapa3/metrics/search-metrics.ts

import { Counter, Histogram, Gauge } from 'prom-client';

// Search Metrics
export const searchRequestsTotal = new Counter({
  name: 'search_requests_total',
  help: 'Total search requests'
});

export const searchCacheHitsTotal = new Counter({
  name: 'search_cache_hits_total',
  help: 'Total search cache hits'
});

export const searchLatency = new Histogram({
  name: 'search_latency_ms',
  help: 'Search latency in milliseconds',
  buckets: [10, 25, 50, 100, 200, 500, 1000, 2000]
});

export const searchResultsCount = new Histogram({
  name: 'search_results_count',
  help: 'Number of search results returned',
  buckets: [0, 1, 5, 10, 20, 50]
});

// Query Understanding Metrics
export const queriesUnderstoodTotal = new Counter({
  name: 'queries_understood_total',
  help: 'Total queries analyzed',
  labelNames: ['intent']
});

// Rerank Metrics
export const rerankRequestsTotal = new Counter({
  name: 'rerank_requests_total',
  help: 'Total rerank requests'
});

export const rerankLatency = new Histogram({
  name: 'rerank_latency_ms',
  help: 'Rerank latency in milliseconds',
  buckets: [50, 100, 200, 500, 1000, 2000, 5000]
});
```

### 7.2 Alerte

```yaml
# alerts/search-workers.yaml

groups:
  - name: search-workers
    rules:
      - alert: SearchLatencyHigh
        expr: histogram_quantile(0.99, rate(search_latency_ms_bucket[5m])) > 1000
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Search latency P99 > 1s"
          description: "P99 search latency: {{ $value }}ms"

      - alert: SearchCacheHitRateLow
        expr: |
          rate(search_cache_hits_total[5m]) /
          rate(search_requests_total[5m]) < 0.5
        for: 10m
        labels:
          severity: info
          team: backend
        annotations:
          summary: "Search cache hit rate < 50%"
          description: "Cache hit rate: {{ $value | humanizePercentage }}"
```

---

## Document Info

**Fișier:** `etapa3-workers-B-hybrid-search.md`  
**Versiune:** 1.0  
**Ultima Actualizare:** Ianuarie 2026  
**Workers Documentați:** 3 (#6, #7, #8)  
**Linii Cod Exemplu:** ~1,000  
**Algoritm Principal:** RRF (Reciprocal Rank Fusion)
