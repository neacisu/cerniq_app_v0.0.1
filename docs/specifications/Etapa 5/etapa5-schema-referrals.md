# CERNIQ.APP — ETAPA 5: DATABASE SCHEMA
## Referral System & Entity Relationships
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. gold_referrals

```sql
CREATE TABLE gold_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Referrer (Existing Client)
    referrer_client_id UUID NOT NULL REFERENCES gold_clients(id),
    referrer_name VARCHAR(200),
    
    -- Referred Prospect
    referred_prospect_id UUID REFERENCES gold_contacts(id),
    referred_contact_name VARCHAR(200),
    referred_contact_phone VARCHAR(30),
    referred_contact_email VARCHAR(255),
    referred_company_name VARCHAR(200),
    referred_company_cui VARCHAR(20),
    
    -- Referral Type
    referral_type referral_type_enum NOT NULL,
    referral_source VARCHAR(50) NOT NULL,
    
    -- Consent Management (GDPR Critical)
    consent_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REQUEST',
    consent_given BOOLEAN DEFAULT FALSE,
    consent_given_at TIMESTAMPTZ,
    consent_proof_type VARCHAR(30),
    consent_proof_message_id UUID,
    consent_asked_at TIMESTAMPTZ,
    consent_reminder_count INTEGER DEFAULT 0,
    
    -- Context
    context_message TEXT,
    relationship_description TEXT,
    relationship_type relation_type_enum,
    
    -- Geographic
    distance_from_referrer_km DECIMAL(10,2),
    same_cluster BOOLEAN DEFAULT FALSE,
    cluster_id UUID REFERENCES gold_clusters(id),
    
    -- Approach Strategy
    approach_script TEXT,
    approach_channel VARCHAR(20),
    approach_timing VARCHAR(50),
    
    -- Status & Progress
    status referral_status_enum NOT NULL DEFAULT 'PENDING_CONSENT',
    
    -- Contact Attempts
    contact_attempts INTEGER DEFAULT 0,
    first_contact_at TIMESTAMPTZ,
    last_contact_at TIMESTAMPTZ,
    contact_history JSONB DEFAULT '[]',
    
    -- Conversion
    converted BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMPTZ,
    converted_order_id UUID REFERENCES gold_orders(id),
    converted_order_value DECIMAL(15,2),
    
    -- Rewards
    reward_type VARCHAR(30),
    reward_value DECIMAL(15,2),
    reward_currency VARCHAR(3) DEFAULT 'RON',
    reward_status VARCHAR(20),
    reward_paid_at TIMESTAMPTZ,
    
    -- Tracking
    referrer_last_asked_at TIMESTAMPTZ,
    expiry_reason VARCHAR(50),
    
    -- Correlation
    correlation_id UUID,
    campaign_id UUID,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_tenant ON gold_referrals(tenant_id, created_at DESC);
CREATE INDEX idx_referrals_referrer ON gold_referrals(referrer_client_id, status);
CREATE INDEX idx_referrals_prospect ON gold_referrals(referred_prospect_id) WHERE referred_prospect_id IS NOT NULL;
CREATE INDEX idx_referrals_status ON gold_referrals(tenant_id, status, created_at DESC);
CREATE INDEX idx_referrals_consent ON gold_referrals(consent_status, consent_asked_at);
CREATE INDEX idx_referrals_converted ON gold_referrals(converted, tenant_id) WHERE converted = TRUE;
CREATE INDEX idx_referrals_cooldown ON gold_referrals(referrer_client_id, referrer_last_asked_at DESC);
```

---

## 2. gold_entity_relationships

```sql
CREATE TABLE gold_entity_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Source Entity
    source_entity_type VARCHAR(30) NOT NULL,
    source_entity_id UUID NOT NULL,
    
    -- Target Entity
    target_entity_type VARCHAR(30) NOT NULL,
    target_entity_id UUID NOT NULL,
    
    -- Relationship Type
    relation_type relation_type_enum NOT NULL,
    relation_subtype VARCHAR(50),
    
    -- Strength & Confidence
    strength DECIMAL(5,2) NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    
    -- Directionality
    bidirectional BOOLEAN DEFAULT TRUE,
    
    -- Evidence
    evidence_source VARCHAR(50) NOT NULL,
    evidence_source_id UUID,
    evidence_details JSONB,
    evidence_text TEXT,
    
    -- Geographic (for NEIGHBOR type)
    distance_meters DECIMAL(15,2),
    location_source_a GEOGRAPHY(POINT, 4326),
    location_source_b GEOGRAPHY(POINT, 4326),
    
    -- Temporal
    valid_from DATE,
    valid_until DATE,
    last_verified_at TIMESTAMPTZ,
    verification_count INTEGER DEFAULT 1,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    deactivated_at TIMESTAMPTZ,
    deactivation_reason VARCHAR(100),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_relationships_source ON gold_entity_relationships(source_entity_id, relation_type);
CREATE INDEX idx_relationships_target ON gold_entity_relationships(target_entity_id, relation_type);
CREATE INDEX idx_relationships_type ON gold_entity_relationships(tenant_id, relation_type, is_active);
CREATE INDEX idx_relationships_neighbor ON gold_entity_relationships(tenant_id, distance_meters) 
    WHERE relation_type = 'NEIGHBOR' AND is_active = TRUE;
CREATE INDEX idx_relationships_geo_a ON gold_entity_relationships USING GIST (location_source_a);
CREATE INDEX idx_relationships_geo_b ON gold_entity_relationships USING GIST (location_source_b);
CREATE UNIQUE INDEX idx_relationships_unique 
    ON gold_entity_relationships(tenant_id, source_entity_id, target_entity_id, relation_type)
    WHERE is_active = TRUE;
```

---

## 3. gold_proximity_scores

```sql
CREATE TABLE gold_proximity_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Anchor (Existing Client)
    anchor_client_id UUID NOT NULL REFERENCES gold_clients(id),
    anchor_location GEOGRAPHY(POINT, 4326) NOT NULL,
    
    -- Prospect
    prospect_id UUID NOT NULL REFERENCES gold_contacts(id),
    prospect_location GEOGRAPHY(POINT, 4326) NOT NULL,
    
    -- Distance
    distance_meters DECIMAL(15,2) NOT NULL,
    distance_km DECIMAL(10,3) GENERATED ALWAYS AS (distance_meters / 1000) STORED,
    
    -- Scoring
    proximity_score DECIMAL(5,2) NOT NULL,
    relevance_factors JSONB DEFAULT '{}',
    
    -- Context
    shared_attributes JSONB DEFAULT '[]',
    shared_cluster_id UUID REFERENCES gold_clusters(id),
    
    -- Anchor Quality
    anchor_nps_score INTEGER,
    anchor_is_advocate BOOLEAN,
    anchor_referral_willingness DECIMAL(5,2),
    
    -- Status
    outreach_status VARCHAR(30) DEFAULT 'PENDING',
    relationship_created_id UUID REFERENCES gold_entity_relationships(id),
    referral_id UUID REFERENCES gold_referrals(id),
    
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proximity_tenant ON gold_proximity_scores(tenant_id, proximity_score DESC);
CREATE INDEX idx_proximity_anchor ON gold_proximity_scores(anchor_client_id, distance_meters);
CREATE INDEX idx_proximity_prospect ON gold_proximity_scores(prospect_id);
CREATE INDEX idx_proximity_pending ON gold_proximity_scores(outreach_status, tenant_id) 
    WHERE outreach_status = 'PENDING';
CREATE INDEX idx_proximity_anchor_geo ON gold_proximity_scores USING GIST (anchor_location);
CREATE INDEX idx_proximity_prospect_geo ON gold_proximity_scores USING GIST (prospect_location);
```

---

## 4. gold_kol_profiles (Key Opinion Leaders)

```sql
CREATE TABLE gold_kol_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Client
    client_id UUID NOT NULL REFERENCES gold_clients(id) UNIQUE,
    
    -- KOL Status
    is_kol BOOLEAN DEFAULT FALSE,
    kol_tier VARCHAR(20),
    kol_since TIMESTAMPTZ,
    
    -- Centrality Scores
    overall_kol_score DECIMAL(5,2),
    network_centrality DECIMAL(5,2),
    geographic_influence DECIMAL(5,2),
    association_influence DECIMAL(5,2),
    referral_track_record DECIMAL(5,2),
    
    -- Network Metrics
    direct_connections INTEGER DEFAULT 0,
    indirect_connections INTEGER DEFAULT 0,
    influence_reach INTEGER DEFAULT 0,
    
    -- Association Roles
    association_memberships JSONB DEFAULT '[]',
    leadership_roles JSONB DEFAULT '[]',
    
    -- Geographic Reach
    primary_county VARCHAR(50),
    influence_counties VARCHAR(50)[],
    influence_radius_km DECIMAL(10,2),
    
    -- Activity
    referrals_generated INTEGER DEFAULT 0,
    referrals_converted INTEGER DEFAULT 0,
    referral_conversion_rate DECIMAL(5,2),
    total_influenced_revenue DECIMAL(15,2),
    
    -- Engagement
    engagement_level VARCHAR(20),
    last_referral_at TIMESTAMPTZ,
    willing_to_refer BOOLEAN DEFAULT TRUE,
    preferred_approach VARCHAR(50),
    
    last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kol_tenant ON gold_kol_profiles(tenant_id, overall_kol_score DESC);
CREATE INDEX idx_kol_active ON gold_kol_profiles(is_kol, tenant_id) WHERE is_kol = TRUE;
CREATE INDEX idx_kol_tier ON gold_kol_profiles(kol_tier, tenant_id);
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
