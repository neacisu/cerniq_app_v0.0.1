# CERNIQ.APP — ETAPA 5: DATABASE SCHEMA
## Clusters, Affiliations & Associations
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. gold_clusters

```sql
CREATE TABLE gold_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Cluster Identity
    cluster_name VARCHAR(200) NOT NULL,
    cluster_type cluster_type_enum NOT NULL,
    cluster_code VARCHAR(50),                 -- Internal reference
    
    -- Source
    source_type VARCHAR(30) NOT NULL,         -- DETECTED, IMPORTED, MANUAL
    detection_algorithm VARCHAR(50),          -- LEIDEN, LOUVAIN, DBSCAN
    external_source VARCHAR(100),             -- MADR, ANIF, etc.
    external_id VARCHAR(100),
    
    -- Membership
    member_count INTEGER DEFAULT 0,
    active_client_count INTEGER DEFAULT 0,
    prospect_count INTEGER DEFAULT 0,
    
    -- Economic Profile
    total_revenue DECIMAL(15,2) DEFAULT 0,
    average_member_revenue DECIMAL(15,2),
    total_potential_value DECIMAL(15,2),
    
    -- Agricultural Profile
    dominant_crop VARCHAR(100),
    dominant_activity VARCHAR(100),
    crop_distribution JSONB DEFAULT '{}',
    total_hectares DECIMAL(15,2),
    
    -- Geographic (PostGIS)
    center_point GEOGRAPHY(POINT, 4326),
    territory_polygon GEOGRAPHY(POLYGON, 4326),
    convex_hull GEOGRAPHY(POLYGON, 4326),
    radius_km DECIMAL(10,2),
    county VARCHAR(50),
    counties VARCHAR(50)[],
    
    -- Graph Metrics
    cohesion_score DECIMAL(5,2),              -- Internal connectivity
    modularity_score DECIMAL(5,2),            -- Separation from others
    density DECIMAL(5,4),                     -- Edge density
    
    -- Key Opinion Leader
    kol_client_id UUID REFERENCES gold_clients(id),
    kol_centrality_score DECIMAL(5,2),
    
    -- Penetration Status
    penetration_rate DECIMAL(5,2),            -- % of members as clients
    penetration_strategy VARCHAR(50),
    last_campaign_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    
    -- Timestamps
    last_analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_clusters_tenant ON gold_clusters(tenant_id, cluster_type);
CREATE INDEX idx_clusters_active ON gold_clusters(is_active, tenant_id);
CREATE INDEX idx_clusters_geo ON gold_clusters USING GIST (center_point);
CREATE INDEX idx_clusters_territory ON gold_clusters USING GIST (territory_polygon);
CREATE INDEX idx_clusters_county ON gold_clusters(county, tenant_id);
CREATE INDEX idx_clusters_penetration ON gold_clusters(penetration_rate, tenant_id);
```

---

## 2. gold_cluster_members

```sql
CREATE TABLE gold_cluster_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Cluster
    cluster_id UUID NOT NULL REFERENCES gold_clusters(id),
    
    -- Member (can be client or prospect)
    entity_type VARCHAR(20) NOT NULL,         -- CLIENT, CONTACT, COMPANY
    entity_id UUID NOT NULL,
    
    -- Membership
    role VARCHAR(50) DEFAULT 'MEMBER',        -- MEMBER, LEADER, BOARD, FOUNDER
    membership_source VARCHAR(50) NOT NULL,   -- REGISTERED, DETECTED, INFERRED
    
    -- Scores
    centrality_score DECIMAL(5,2),            -- Node importance
    influence_score DECIMAL(5,2),             -- Influence on cluster
    
    -- Activity in Cluster
    is_active BOOLEAN DEFAULT TRUE,
    joined_at DATE,
    left_at DATE,
    
    -- Business Status
    is_client BOOLEAN DEFAULT FALSE,
    client_id UUID REFERENCES gold_clients(id),
    client_since DATE,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cluster_members_cluster ON gold_cluster_members(cluster_id, is_active);
CREATE INDEX idx_cluster_members_entity ON gold_cluster_members(entity_id, entity_type);
CREATE INDEX idx_cluster_members_client ON gold_cluster_members(client_id) WHERE client_id IS NOT NULL;

-- Unique constraint
CREATE UNIQUE INDEX idx_cluster_members_unique 
    ON gold_cluster_members(tenant_id, cluster_id, entity_id, entity_type);
```

---

## 3. gold_affiliations

```sql
CREATE TABLE gold_affiliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Source Entity (Member)
    source_entity_type VARCHAR(30) NOT NULL,  -- CLIENT, CONTACT, COMPANY
    source_entity_id UUID NOT NULL,
    
    -- Target (Association/Group)
    target_group_type VARCHAR(30) NOT NULL,   -- OUAI, COOPERATIVE, ASSOCIATION, GROUP
    target_group_id UUID NOT NULL,
    target_group_name VARCHAR(200),
    
    -- Affiliation Details
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',  -- MEMBER, PRESIDENT, BOARD, SECRETARY
    position_title VARCHAR(100),
    
    -- Temporal
    affiliation_start DATE,
    affiliation_end DATE,
    is_current BOOLEAN DEFAULT TRUE,
    
    -- Source & Verification
    source VARCHAR(50) NOT NULL,              -- PUBLIC_REGISTER, TERMENE, CONVERSATION
    source_document VARCHAR(255),
    source_url TEXT,
    confidence DECIMAL(5,2) DEFAULT 100,
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verification_method VARCHAR(50),
    
    -- Compliance
    data_category VARCHAR(30) DEFAULT 'B2B_RELATION',  -- NOT trade_union
    gdpr_compliant BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_affiliations_source ON gold_affiliations(source_entity_id, source_entity_type);
CREATE INDEX idx_affiliations_target ON gold_affiliations(target_group_id, target_group_type);
CREATE INDEX idx_affiliations_current ON gold_affiliations(is_current, tenant_id);
CREATE INDEX idx_affiliations_role ON gold_affiliations(role, target_group_type);
```

---

## 4. gold_associations (OUAI, Cooperatives)

```sql
CREATE TABLE gold_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Identity
    association_name VARCHAR(300) NOT NULL,
    association_name_normalized VARCHAR(300),
    association_type VARCHAR(50) NOT NULL,    -- OUAI, COOPERATIVE, PRODUCER_GROUP
    
    -- Legal
    cui VARCHAR(20),
    registration_number VARCHAR(50),
    legal_status VARCHAR(50),                 -- ACTIVE, DISSOLVED, MERGED
    
    -- Contact
    address TEXT,
    county VARCHAR(50),
    locality VARCHAR(100),
    phone VARCHAR(30),
    email VARCHAR(255),
    
    -- Geographic
    location GEOGRAPHY(POINT, 4326),
    service_area GEOGRAPHY(POLYGON, 4326),
    
    -- For OUAI specifically
    hydroamelioration_name VARCHAR(200),      -- "Amenajarea Titu Ogrezeni"
    irrigation_system VARCHAR(100),
    gross_area_ha DECIMAL(15,2),
    net_area_ha DECIMAL(15,2),
    water_source VARCHAR(100),
    
    -- For Cooperatives
    main_activity VARCHAR(200),
    products JSONB DEFAULT '[]',
    certifications JSONB DEFAULT '[]',
    
    -- Membership
    registered_members INTEGER,
    estimated_members INTEGER,
    member_count_source VARCHAR(50),
    
    -- Economic
    estimated_annual_revenue DECIMAL(15,2),
    subsidy_eligible BOOLEAN,
    
    -- Leadership
    president_name VARCHAR(200),
    president_contact VARCHAR(100),
    board_members JSONB DEFAULT '[]',
    
    -- Source
    source VARCHAR(50) NOT NULL,              -- RNOIF, MADR, ANIF, MANUAL
    source_document VARCHAR(255),
    source_date DATE,
    source_url TEXT,
    
    -- Linked Cluster
    cluster_id UUID REFERENCES gold_clusters(id),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_verified_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_associations_tenant ON gold_associations(tenant_id, association_type);
CREATE INDEX idx_associations_cui ON gold_associations(cui) WHERE cui IS NOT NULL;
CREATE INDEX idx_associations_county ON gold_associations(county, tenant_id);
CREATE INDEX idx_associations_geo ON gold_associations USING GIST (location);
CREATE INDEX idx_associations_area ON gold_associations USING GIST (service_area);
CREATE INDEX idx_associations_name ON gold_associations USING GIN (association_name_normalized gin_trgm_ops);
```

---

## 5. gold_ouai_registry (Specific OUAI Data)

```sql
CREATE TABLE gold_ouai_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Link to association
    association_id UUID NOT NULL REFERENCES gold_associations(id),
    
    -- RNOIF Data
    rnoif_number VARCHAR(50),
    rnoif_registration_date DATE,
    
    -- Hydroamelioration System
    hydroamelioration_id VARCHAR(50),
    hydroamelioration_name VARCHAR(200) NOT NULL,
    basin_name VARCHAR(100),
    
    -- Areas
    total_area_ha DECIMAL(15,2),
    irrigable_area_ha DECIMAL(15,2),
    drained_area_ha DECIMAL(15,2),
    
    -- Infrastructure
    canal_length_km DECIMAL(10,2),
    pump_stations INTEGER,
    water_intake_points INTEGER,
    
    -- ANIF Relation
    anif_contract BOOLEAN DEFAULT FALSE,
    anif_contract_number VARCHAR(50),
    water_allocation_m3 DECIMAL(15,2),
    
    -- Operational
    irrigation_season_start DATE,
    irrigation_season_end DATE,
    last_season_usage_m3 DECIMAL(15,2),
    
    -- Financial
    annual_dues_per_ha DECIMAL(10,2),
    water_tariff_per_m3 DECIMAL(10,4),
    
    -- Source
    source_pdf_url TEXT,
    extracted_at TIMESTAMPTZ,
    extraction_method VARCHAR(50),           -- PDF_PARSER, MANUAL, OCR
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ouai_association ON gold_ouai_registry(association_id);
CREATE INDEX idx_ouai_basin ON gold_ouai_registry(basin_name, tenant_id);
CREATE INDEX idx_ouai_hydro ON gold_ouai_registry(hydroamelioration_name);
```

---

## 6. gold_conversation_insights (Zero-Party Data)

```sql
CREATE TABLE gold_conversation_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Source
    conversation_id UUID NOT NULL,
    message_id UUID,
    client_id UUID NOT NULL REFERENCES gold_clients(id),
    
    -- Extraction
    insight_type VARCHAR(50) NOT NULL,        -- NEED, PREFERENCE, PLAN, RELATIONSHIP, COMPLAINT
    insight_category VARCHAR(50),
    
    -- Content
    extracted_text TEXT NOT NULL,
    normalized_value VARCHAR(500),
    confidence DECIMAL(5,2) NOT NULL,
    
    -- Entity Extraction
    entities JSONB DEFAULT '[]',              -- People, places, products mentioned
    mentioned_neighbors JSONB DEFAULT '[]',
    mentioned_associations JSONB DEFAULT '[]',
    
    -- CRM Field Mapping
    crm_field VARCHAR(100),                   -- Which field to update
    crm_value TEXT,
    auto_applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMPTZ,
    
    -- Verification
    requires_verification BOOLEAN DEFAULT TRUE,
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    
    -- Timestamps
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_message_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_insights_client ON gold_conversation_insights(client_id, insight_type);
CREATE INDEX idx_insights_type ON gold_conversation_insights(tenant_id, insight_type, extracted_at DESC);
CREATE INDEX idx_insights_unverified ON gold_conversation_insights(requires_verification, verified) 
    WHERE requires_verification = TRUE AND verified = FALSE;
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
