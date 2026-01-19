# CERNIQ.APP — ETAPA 3: DATABASE SCHEMA - PRODUCTS & CATALOG
## Gold Layer Extension pentru AI Sales Agent
### Versiunea 1.0 | 18 Ianuarie 2026

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** Schema completă pentru produse, catalog, embeddings și hybrid search  
**DATABASE:** PostgreSQL 18.1 + pgvector + pg_trgm  
**ORM:** Drizzle ORM

---

# CUPRINS

1. [Overview Schema Products](#1-overview-schema-products)
2. [Tabel gold_products](#2-tabel-gold_products)
3. [Tabel gold_product_categories](#3-tabel-gold_product_categories)
4. [Tabel gold_product_embeddings](#4-tabel-gold_product_embeddings)
5. [Tabel gold_product_chunks](#5-tabel-gold_product_chunks)
6. [Tabel gold_product_images](#6-tabel-gold_product_images)
7. [Tabel price_rules](#7-tabel-price_rules)
8. [Funcții pentru Hybrid Search](#8-funcții-pentru-hybrid-search)
9. [Indexes și Performance](#9-indexes-și-performance)
10. [Drizzle Schema](#10-drizzle-schema)

---

# 1. Overview Schema Products

## 1.1 Diagrama Relații

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRODUCT SCHEMA - GOLD LAYER                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐         ┌─────────────────────┐               │
│  │ gold_product_       │         │    gold_products    │               │
│  │ categories          │◄────────│                     │               │
│  │                     │  1:N    │  - Core product data│               │
│  │  - id               │         │  - Pricing info     │               │
│  │  - name             │         │  - Search vectors   │               │
│  │  - parent_id        │         │                     │               │
│  └─────────────────────┘         └──────────┬──────────┘               │
│                                              │                          │
│                    ┌─────────────────────────┼─────────────────────────┐│
│                    │                         │                         ││
│                    ▼                         ▼                         ▼│
│  ┌─────────────────────┐   ┌─────────────────────┐   ┌───────────────┐ │
│  │ gold_product_       │   │ gold_product_       │   │ gold_product_ │ │
│  │ embeddings          │   │ chunks              │   │ images        │ │
│  │                     │   │                     │   │               │ │
│  │ - vector(1536)      │   │ - chunk content     │   │ - url         │ │
│  │ - model_version     │   │ - chunk_index       │   │ - alt_text    │ │
│  └─────────────────────┘   └─────────────────────┘   └───────────────┘ │
│                                                                         │
│  ┌─────────────────────┐                                               │
│  │    price_rules      │                                               │
│  │                     │                                               │
│  │  - category/product │                                               │
│  │  - min_price        │                                               │
│  │  - max_discount     │                                               │
│  │  - margin_percent   │                                               │
│  └─────────────────────┘                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 1.2 Estimări Volume

| Tabel | Rows Estimate | Size Estimate |
|-------|--------------|---------------|
| gold_products | 10,000 | 50 MB |
| gold_product_categories | 200 | 1 MB |
| gold_product_embeddings | 10,000 | 100 MB (vectors) |
| gold_product_chunks | 50,000 | 200 MB |
| gold_product_images | 30,000 | 5 MB (metadata) |
| price_rules | 500 | 1 MB |

---

# 2. Tabel gold_products

## 2.1 SQL Schema

```sql
-- Extensii necesare
CREATE EXTENSION IF NOT EXISTS pgvector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enum pentru status produs
CREATE TYPE product_status_enum AS ENUM (
    'DRAFT',
    'ACTIVE', 
    'DISCONTINUED',
    'OUT_OF_STOCK',
    'ARCHIVED'
);

-- Enum pentru unități de măsură
CREATE TYPE product_unit_enum AS ENUM (
    'buc',      -- Bucăți
    'kg',       -- Kilograme
    'l',        -- Litri
    'mp',       -- Metri pătrați
    'm',        -- Metri
    'set',      -- Set
    'pachet'    -- Pachet
);

-- Tabel principal produse
CREATE TABLE gold_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identificare
    sku VARCHAR(50) NOT NULL,
    barcode VARCHAR(50),
    external_id VARCHAR(100), -- ID din ERP/Shopify/etc
    
    -- Informații de bază
    name VARCHAR(255) NOT NULL,
    short_description VARCHAR(500),
    description TEXT,
    
    -- Categorie
    category_id UUID REFERENCES gold_product_categories(id),
    
    -- Pricing
    base_price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',
    cost_price DECIMAL(12,2), -- Cost achiziție
    min_price DECIMAL(12,2), -- Preț minim permis
    vat_percent DECIMAL(5,2) DEFAULT 19.00,
    
    -- Discount rules
    max_discount_percent DECIMAL(5,2) DEFAULT 15.00,
    volume_discount_enabled BOOLEAN DEFAULT FALSE,
    volume_discount_threshold INTEGER, -- Cantitate pentru volume discount
    volume_discount_percent DECIMAL(5,2),
    
    -- Stoc (overview - detalii în stock_inventory)
    track_inventory BOOLEAN DEFAULT TRUE,
    allow_backorder BOOLEAN DEFAULT FALSE,
    low_stock_threshold INTEGER DEFAULT 10,
    
    -- Unitate
    unit product_unit_enum DEFAULT 'buc',
    weight_kg DECIMAL(10,3),
    dimensions_cm JSONB, -- {length, width, height}
    
    -- Specificații tehnice
    specifications JSONB DEFAULT '{}',
    
    -- Agricultură specific
    crop_types TEXT[], -- Tipuri culturi compatibile
    application_season TEXT[], -- Sezoane aplicare
    certification_ids TEXT[], -- Certificate (bio, eco, etc)
    
    -- Search vectors (pentru BM25)
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('romanian', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('romanian', coalesce(short_description, '')), 'B') ||
        setweight(to_tsvector('romanian', coalesce(description, '')), 'C')
    ) STORED,
    
    -- Trigram pentru fuzzy search
    name_trigram TEXT GENERATED ALWAYS AS (lower(name)) STORED,
    
    -- Status
    status product_status_enum DEFAULT 'DRAFT',
    is_featured BOOLEAN DEFAULT FALSE,
    is_best_seller BOOLEAN DEFAULT FALSE,
    
    -- SEO
    slug VARCHAR(255),
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    
    -- Source tracking
    source_system VARCHAR(50), -- 'shopify', 'erp', 'manual'
    source_synced_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_tenant_sku UNIQUE(tenant_id, sku),
    CONSTRAINT price_positive CHECK (base_price > 0),
    CONSTRAINT min_price_valid CHECK (min_price IS NULL OR min_price <= base_price),
    CONSTRAINT max_discount_valid CHECK (max_discount_percent >= 0 AND max_discount_percent <= 100)
);

-- Comentarii
COMMENT ON TABLE gold_products IS 'Golden Records pentru produse - sursa de adevăr pentru AI Sales Agent';
COMMENT ON COLUMN gold_products.min_price IS 'Prețul minim sub care AI-ul nu poate oferta (Guardrail)';
COMMENT ON COLUMN gold_products.max_discount_percent IS 'Discountul maxim auto-aprobat. Peste această valoare = HITL';
COMMENT ON COLUMN gold_products.search_vector IS 'Vector tsvector pentru full-text search BM25 în română';
```

## 2.2 Indexes

```sql
-- Primary indexes
CREATE INDEX idx_products_tenant ON gold_products(tenant_id);
CREATE INDEX idx_products_category ON gold_products(category_id);
CREATE INDEX idx_products_status ON gold_products(tenant_id, status);

-- Search indexes
CREATE INDEX idx_products_search_vector ON gold_products USING GIN(search_vector);
CREATE INDEX idx_products_name_trigram ON gold_products USING GIN(name_trigram gin_trgm_ops);
CREATE INDEX idx_products_tags ON gold_products USING GIN(tags);

-- SKU lookup
CREATE INDEX idx_products_sku ON gold_products(tenant_id, sku);
CREATE INDEX idx_products_barcode ON gold_products(tenant_id, barcode) WHERE barcode IS NOT NULL;

-- Pricing queries
CREATE INDEX idx_products_price_range ON gold_products(tenant_id, base_price);

-- Featured/bestseller
CREATE INDEX idx_products_featured ON gold_products(tenant_id, is_featured) WHERE is_featured = TRUE;
```

---

# 3. Tabel gold_product_categories

## 3.1 SQL Schema

```sql
CREATE TABLE gold_product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Hierarchy
    parent_id UUID REFERENCES gold_product_categories(id),
    level INTEGER NOT NULL DEFAULT 0,
    path TEXT NOT NULL, -- Materialized path: '1/5/12'
    
    -- Info
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    image_url VARCHAR(500),
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    is_visible BOOLEAN DEFAULT TRUE,
    
    -- Pricing rules defaults
    default_vat_percent DECIMAL(5,2) DEFAULT 19.00,
    default_max_discount DECIMAL(5,2) DEFAULT 15.00,
    
    -- Metadata
    custom_fields JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_tenant_category_slug UNIQUE(tenant_id, slug)
);

-- Index pentru hierarchy
CREATE INDEX idx_categories_parent ON gold_product_categories(parent_id);
CREATE INDEX idx_categories_path ON gold_product_categories USING GIST(path gist_trgm_ops);
CREATE INDEX idx_categories_level ON gold_product_categories(tenant_id, level);

-- Function pentru actualizare path
CREATE OR REPLACE FUNCTION update_category_path()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path := NEW.id::TEXT;
        NEW.level := 0;
    ELSE
        SELECT path || '/' || NEW.id::TEXT, level + 1
        INTO NEW.path, NEW.level
        FROM gold_product_categories
        WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_category_path
BEFORE INSERT ON gold_product_categories
FOR EACH ROW EXECUTE FUNCTION update_category_path();
```

---

# 4. Tabel gold_product_embeddings

## 4.1 SQL Schema

```sql
-- Tabel pentru vectori embedding (pgvector)
CREATE TABLE gold_product_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES gold_products(id) ON DELETE CASCADE,
    
    -- Vector
    embedding vector(1536) NOT NULL, -- OpenAI text-embedding-3-small
    
    -- Metadata embedding
    model_name VARCHAR(50) NOT NULL DEFAULT 'text-embedding-3-small',
    model_version VARCHAR(20),
    
    -- Source text (pentru regenerare)
    source_text_hash VARCHAR(64) NOT NULL, -- SHA256 of source text
    token_count INTEGER,
    
    -- Validity
    is_current BOOLEAN DEFAULT TRUE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Pentru invalidare periodică
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pentru vector similarity search
CREATE INDEX idx_embeddings_product ON gold_product_embeddings(product_id);
CREATE INDEX idx_embeddings_current ON gold_product_embeddings(product_id, is_current) WHERE is_current = TRUE;

-- HNSW index pentru fast approximate nearest neighbor
CREATE INDEX idx_embeddings_vector ON gold_product_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Comentarii
COMMENT ON TABLE gold_product_embeddings IS 'Vectori embedding pentru semantic search cu pgvector';
COMMENT ON COLUMN gold_product_embeddings.embedding IS 'Vector 1536-dimensional de la OpenAI';
```

---

# 5. Tabel gold_product_chunks

## 5.1 SQL Schema

```sql
-- Chunks pentru RAG (Retrieval Augmented Generation)
CREATE TABLE gold_product_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES gold_products(id) ON DELETE CASCADE,
    
    -- Chunk info
    chunk_index INTEGER NOT NULL,
    chunk_type VARCHAR(30) NOT NULL DEFAULT 'description', -- description, specs, usage, faq
    
    -- Content
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    token_count INTEGER NOT NULL,
    
    -- Embedding pentru acest chunk
    embedding vector(1536),
    
    -- Overlap info
    overlap_start INTEGER, -- Start position în text original
    overlap_end INTEGER,   -- End position
    
    -- Search vector pentru BM25
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('romanian', content)
    ) STORED,
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Section headers, etc
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_product_chunk UNIQUE(product_id, chunk_index)
);

-- Indexes
CREATE INDEX idx_chunks_product ON gold_product_chunks(product_id);
CREATE INDEX idx_chunks_type ON gold_product_chunks(chunk_type);
CREATE INDEX idx_chunks_search ON gold_product_chunks USING GIN(search_vector);
CREATE INDEX idx_chunks_embedding ON gold_product_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE embedding IS NOT NULL;

COMMENT ON TABLE gold_product_chunks IS 'Chunks de text pentru RAG - permit retrieval granular';
```

---

# 6. Tabel gold_product_images

## 6.1 SQL Schema

```sql
CREATE TABLE gold_product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES gold_products(id) ON DELETE CASCADE,
    
    -- Image info
    url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    
    -- Metadata
    alt_text VARCHAR(255),
    title VARCHAR(255),
    
    -- Dimensions
    width INTEGER,
    height INTEGER,
    file_size_bytes INTEGER,
    format VARCHAR(10), -- jpg, png, webp
    
    -- Order
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- AI generated description (pentru search)
    ai_description TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_images_product ON gold_product_images(product_id, sort_order);
CREATE INDEX idx_images_primary ON gold_product_images(product_id, is_primary) WHERE is_primary = TRUE;
```

---

# 7. Tabel price_rules

## 7.1 SQL Schema

```sql
-- Reguli de pricing per categorie sau produs
CREATE TABLE price_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Scope (mutual exclusive)
    category_id UUID REFERENCES gold_product_categories(id),
    product_id UUID REFERENCES gold_products(id),
    
    -- Rule type
    rule_type VARCHAR(30) NOT NULL, -- 'margin', 'discount_cap', 'volume_discount', 'seasonal'
    
    -- Values
    min_margin_percent DECIMAL(5,2), -- Marja minimă
    max_discount_percent DECIMAL(5,2), -- Discount maxim auto-aprobat
    
    -- Volume discount tiers
    volume_tiers JSONB, -- [{min_qty: 10, discount: 5}, {min_qty: 50, discount: 10}]
    
    -- Seasonal adjustments
    season_start DATE,
    season_end DATE,
    seasonal_multiplier DECIMAL(5,2), -- 1.2 = +20%
    
    -- Approval thresholds
    manager_approval_threshold DECIMAL(5,2) DEFAULT 15.00,
    director_approval_threshold DECIMAL(5,2) DEFAULT 30.00,
    
    -- Priority (higher = override lower)
    priority INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT scope_required CHECK (
        (category_id IS NOT NULL AND product_id IS NULL) OR
        (category_id IS NULL AND product_id IS NOT NULL) OR
        (category_id IS NULL AND product_id IS NULL) -- Global rule
    )
);

CREATE INDEX idx_price_rules_tenant ON price_rules(tenant_id);
CREATE INDEX idx_price_rules_category ON price_rules(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_price_rules_product ON price_rules(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_price_rules_active ON price_rules(tenant_id, is_active) WHERE is_active = TRUE;

-- Function pentru a obține discount maxim pentru un produs
CREATE OR REPLACE FUNCTION get_max_discount(
    p_tenant_id UUID,
    p_product_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    max_discount DECIMAL(5,2);
    product_category_id UUID;
BEGIN
    -- Get product's category
    SELECT category_id INTO product_category_id
    FROM gold_products
    WHERE id = p_product_id AND tenant_id = p_tenant_id;
    
    -- Find most specific rule
    SELECT COALESCE(pr.max_discount_percent, gp.max_discount_percent, 15.00)
    INTO max_discount
    FROM gold_products gp
    LEFT JOIN price_rules pr ON (
        pr.tenant_id = p_tenant_id
        AND pr.is_active = TRUE
        AND (
            pr.product_id = p_product_id
            OR pr.category_id = product_category_id
            OR (pr.product_id IS NULL AND pr.category_id IS NULL)
        )
    )
    WHERE gp.id = p_product_id
    ORDER BY 
        CASE WHEN pr.product_id IS NOT NULL THEN 1
             WHEN pr.category_id IS NOT NULL THEN 2
             ELSE 3 END,
        pr.priority DESC
    LIMIT 1;
    
    RETURN max_discount;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

# 8. Funcții pentru Hybrid Search

## 8.1 Hybrid Search Function (Vector + BM25 + RRF)

```sql
-- Funcție principală pentru hybrid search
CREATE OR REPLACE FUNCTION hybrid_product_search(
    p_tenant_id UUID,
    p_query_text TEXT,
    p_query_embedding vector(1536),
    p_category_id UUID DEFAULT NULL,
    p_price_min DECIMAL DEFAULT NULL,
    p_price_max DECIMAL DEFAULT NULL,
    p_in_stock_only BOOLEAN DEFAULT TRUE,
    p_limit INT DEFAULT 10,
    p_vector_weight FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    product_id UUID,
    sku VARCHAR,
    name VARCHAR,
    base_price DECIMAL,
    combined_score FLOAT,
    vector_score FLOAT,
    bm25_score FLOAT,
    match_reason TEXT[]
) AS $$
WITH 
-- Vector search results
vector_results AS (
    SELECT 
        gp.id,
        gp.sku,
        gp.name,
        gp.base_price,
        1 - (gpe.embedding <=> p_query_embedding) AS similarity,
        ROW_NUMBER() OVER (ORDER BY gpe.embedding <=> p_query_embedding) AS rank
    FROM gold_products gp
    JOIN gold_product_embeddings gpe ON gpe.product_id = gp.id AND gpe.is_current = TRUE
    WHERE gp.tenant_id = p_tenant_id
      AND gp.status = 'ACTIVE'
      AND (p_category_id IS NULL OR gp.category_id = p_category_id)
      AND (p_price_min IS NULL OR gp.base_price >= p_price_min)
      AND (p_price_max IS NULL OR gp.base_price <= p_price_max)
      AND gpe.embedding <=> p_query_embedding < 0.8
    ORDER BY gpe.embedding <=> p_query_embedding
    LIMIT p_limit * 3
),
-- BM25 full-text search results
bm25_results AS (
    SELECT 
        gp.id,
        gp.sku,
        gp.name,
        gp.base_price,
        ts_rank_cd(gp.search_vector, plainto_tsquery('romanian', p_query_text), 32) AS bm25_rank,
        ROW_NUMBER() OVER (
            ORDER BY ts_rank_cd(gp.search_vector, plainto_tsquery('romanian', p_query_text), 32) DESC
        ) AS rank
    FROM gold_products gp
    WHERE gp.tenant_id = p_tenant_id
      AND gp.status = 'ACTIVE'
      AND (p_category_id IS NULL OR gp.category_id = p_category_id)
      AND (p_price_min IS NULL OR gp.base_price >= p_price_min)
      AND (p_price_max IS NULL OR gp.base_price <= p_price_max)
      AND gp.search_vector @@ plainto_tsquery('romanian', p_query_text)
    ORDER BY bm25_rank DESC
    LIMIT p_limit * 3
),
-- Combine with RRF (Reciprocal Rank Fusion)
combined AS (
    SELECT 
        COALESCE(v.id, b.id) AS product_id,
        COALESCE(v.sku, b.sku) AS sku,
        COALESCE(v.name, b.name) AS name,
        COALESCE(v.base_price, b.base_price) AS base_price,
        -- RRF formula: 1/(k+rank)
        COALESCE(1.0 / (60 + v.rank), 0) * p_vector_weight +
        COALESCE(1.0 / (60 + b.rank), 0) * (1 - p_vector_weight) AS rrf_score,
        v.similarity AS vector_score,
        b.bm25_rank AS bm25_score,
        ARRAY_REMOVE(ARRAY[
            CASE WHEN v.id IS NOT NULL THEN 'semantic_match' END,
            CASE WHEN b.id IS NOT NULL THEN 'keyword_match' END
        ], NULL) AS match_reason
    FROM vector_results v
    FULL OUTER JOIN bm25_results b ON v.id = b.id
)
SELECT 
    c.product_id,
    c.sku,
    c.name,
    c.base_price,
    c.rrf_score AS combined_score,
    c.vector_score,
    c.bm25_score,
    c.match_reason
FROM combined c
-- Optional: filter in-stock only
WHERE (NOT p_in_stock_only OR EXISTS (
    SELECT 1 FROM stock_inventory si 
    WHERE si.product_id = c.product_id 
    AND si.available_quantity > 0
))
ORDER BY c.rrf_score DESC
LIMIT p_limit;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION hybrid_product_search IS 
'Hybrid search combinând vector similarity (semantic) cu BM25 (keyword) folosind RRF';
```

## 8.2 Chunk-Level Search Function

```sql
-- Search la nivel de chunk pentru retrieval mai precis
CREATE OR REPLACE FUNCTION search_product_chunks(
    p_tenant_id UUID,
    p_query_text TEXT,
    p_query_embedding vector(1536),
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    chunk_id UUID,
    product_id UUID,
    product_name VARCHAR,
    chunk_content TEXT,
    chunk_type VARCHAR,
    relevance_score FLOAT
) AS $$
SELECT 
    gpc.id AS chunk_id,
    gpc.product_id,
    gp.name AS product_name,
    gpc.content AS chunk_content,
    gpc.chunk_type,
    (
        -- Combine vector similarity and BM25
        COALESCE(1 - (gpc.embedding <=> p_query_embedding), 0) * 0.6 +
        COALESCE(ts_rank(gpc.search_vector, plainto_tsquery('romanian', p_query_text)), 0) * 0.4
    ) AS relevance_score
FROM gold_product_chunks gpc
JOIN gold_products gp ON gp.id = gpc.product_id
WHERE gp.tenant_id = p_tenant_id
  AND gp.status = 'ACTIVE'
  AND (
    gpc.embedding <=> p_query_embedding < 0.7
    OR gpc.search_vector @@ plainto_tsquery('romanian', p_query_text)
  )
ORDER BY relevance_score DESC
LIMIT p_limit;
$$ LANGUAGE sql STABLE;
```

## 8.3 Fuzzy Search Function (Trigram)

```sql
-- Fuzzy search pentru typos și variații
CREATE OR REPLACE FUNCTION fuzzy_product_search(
    p_tenant_id UUID,
    p_query_text TEXT,
    p_similarity_threshold FLOAT DEFAULT 0.3,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    product_id UUID,
    sku VARCHAR,
    name VARCHAR,
    similarity_score FLOAT
) AS $$
SELECT 
    gp.id AS product_id,
    gp.sku,
    gp.name,
    similarity(gp.name_trigram, lower(p_query_text)) AS similarity_score
FROM gold_products gp
WHERE gp.tenant_id = p_tenant_id
  AND gp.status = 'ACTIVE'
  AND similarity(gp.name_trigram, lower(p_query_text)) > p_similarity_threshold
ORDER BY similarity_score DESC
LIMIT p_limit;
$$ LANGUAGE sql STABLE;
```

---

# 9. Indexes și Performance

## 9.1 Index Summary

```sql
-- =====================================================
-- INDEX SUMMARY PENTRU GOLD_PRODUCTS
-- =====================================================

-- Existing indexes from schema above:
-- idx_products_tenant
-- idx_products_category
-- idx_products_status
-- idx_products_search_vector (GIN)
-- idx_products_name_trigram (GIN trigram)
-- idx_products_tags (GIN)
-- idx_products_sku
-- idx_products_barcode
-- idx_products_price_range
-- idx_products_featured

-- Composite index pentru common queries
CREATE INDEX CONCURRENTLY idx_products_tenant_status_category 
ON gold_products(tenant_id, status, category_id);

-- Partial index pentru active products only
CREATE INDEX CONCURRENTLY idx_products_active 
ON gold_products(tenant_id, name, base_price)
WHERE status = 'ACTIVE';

-- Index pentru sorting
CREATE INDEX CONCURRENTLY idx_products_created 
ON gold_products(tenant_id, created_at DESC);

-- =====================================================
-- INDEX PENTRU EMBEDDINGS (HNSW)
-- =====================================================

-- Already created: idx_embeddings_vector
-- Parameters tuning for production:
-- m = 16 (connections per node, higher = better recall, more memory)
-- ef_construction = 64 (build-time quality, higher = slower build, better index)

-- For queries, set ef_search dynamically:
-- SET hnsw.ef_search = 100; -- Higher = better recall, slower query

-- =====================================================
-- ANALYZE PENTRU STATISTICI
-- =====================================================

ANALYZE gold_products;
ANALYZE gold_product_embeddings;
ANALYZE gold_product_chunks;
ANALYZE gold_product_categories;
ANALYZE price_rules;
```

## 9.2 Query Performance Expectations

| Query Type | Expected Latency | Index Used |
|------------|-----------------|------------|
| SKU lookup | <5ms | idx_products_sku |
| Category filter | <20ms | idx_products_category |
| Full-text search | <50ms | idx_products_search_vector |
| Vector search | <100ms | idx_embeddings_vector (HNSW) |
| Hybrid search | <150ms | Combined |
| Fuzzy search | <30ms | idx_products_name_trigram |

---

# 10. Drizzle Schema

## 10.1 TypeScript Schema Definition

```typescript
// packages/db/src/schema/products.ts
import { 
  pgTable, uuid, varchar, text, boolean, integer, 
  decimal, timestamp, jsonb, uniqueIndex, index 
} from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users } from './core';

// Enums
export const productStatusEnum = pgEnum('product_status_enum', [
  'DRAFT', 'ACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK', 'ARCHIVED'
]);

export const productUnitEnum = pgEnum('product_unit_enum', [
  'buc', 'kg', 'l', 'mp', 'm', 'set', 'pachet'
]);

// Categories
export const goldProductCategories = pgTable('gold_product_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references(() => goldProductCategories.id),
  level: integer('level').notNull().default(0),
  path: text('path').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  icon: varchar('icon', { length: 50 }),
  imageUrl: varchar('image_url', { length: 500 }),
  isActive: boolean('is_active').default(true),
  isVisible: boolean('is_visible').default(true),
  defaultVatPercent: decimal('default_vat_percent', { precision: 5, scale: 2 }).default('19.00'),
  defaultMaxDiscount: decimal('default_max_discount', { precision: 5, scale: 2 }).default('15.00'),
  customFields: jsonb('custom_fields').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueTenantSlug: uniqueIndex('idx_unique_category_slug').on(table.tenantId, table.slug),
  parentIdx: index('idx_categories_parent').on(table.parentId),
}));

// Products
export const goldProducts = pgTable('gold_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Identification
  sku: varchar('sku', { length: 50 }).notNull(),
  barcode: varchar('barcode', { length: 50 }),
  externalId: varchar('external_id', { length: 100 }),
  
  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  shortDescription: varchar('short_description', { length: 500 }),
  description: text('description'),
  
  // Category
  categoryId: uuid('category_id').references(() => goldProductCategories.id),
  
  // Pricing
  basePrice: decimal('base_price', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('RON'),
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }),
  minPrice: decimal('min_price', { precision: 12, scale: 2 }),
  vatPercent: decimal('vat_percent', { precision: 5, scale: 2 }).default('19.00'),
  
  // Discount rules
  maxDiscountPercent: decimal('max_discount_percent', { precision: 5, scale: 2 }).default('15.00'),
  volumeDiscountEnabled: boolean('volume_discount_enabled').default(false),
  volumeDiscountThreshold: integer('volume_discount_threshold'),
  volumeDiscountPercent: decimal('volume_discount_percent', { precision: 5, scale: 2 }),
  
  // Stock
  trackInventory: boolean('track_inventory').default(true),
  allowBackorder: boolean('allow_backorder').default(false),
  lowStockThreshold: integer('low_stock_threshold').default(10),
  
  // Unit
  unit: productUnitEnum('unit').default('buc'),
  weightKg: decimal('weight_kg', { precision: 10, scale: 3 }),
  dimensionsCm: jsonb('dimensions_cm'),
  
  // Specifications
  specifications: jsonb('specifications').default({}),
  
  // Agriculture specific
  cropTypes: text('crop_types').array(),
  applicationSeason: text('application_season').array(),
  certificationIds: text('certification_ids').array(),
  
  // Status
  status: productStatusEnum('status').default('DRAFT'),
  isFeatured: boolean('is_featured').default(false),
  isBestSeller: boolean('is_best_seller').default(false),
  
  // SEO
  slug: varchar('slug', { length: 255 }),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: varchar('meta_description', { length: 500 }),
  
  // Metadata
  tags: text('tags').array().default(sql`'{}'::text[]`),
  customFields: jsonb('custom_fields').default({}),
  
  // Source tracking
  sourceSystem: varchar('source_system', { length: 50 }),
  sourceSyncedAt: timestamp('source_synced_at', { withTimezone: true }),
  
  // Audit
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  uniqueTenantSku: uniqueIndex('idx_unique_tenant_sku').on(table.tenantId, table.sku),
  tenantIdx: index('idx_products_tenant').on(table.tenantId),
  categoryIdx: index('idx_products_category').on(table.categoryId),
  statusIdx: index('idx_products_status').on(table.tenantId, table.status),
  skuIdx: index('idx_products_sku').on(table.tenantId, table.sku),
}));

// Export types
export type GoldProduct = typeof goldProducts.$inferSelect;
export type NewGoldProduct = typeof goldProducts.$inferInsert;
export type GoldProductCategory = typeof goldProductCategories.$inferSelect;
```

---

**Document generat:** 18 Ianuarie 2026  
**Total Tabele:** 6  
**Extensii necesare:** pgvector, pg_trgm  
**Conformitate:** Master Spec v1.2
