-- ============================================================================
-- 0054_e5_geospatial.sql — Faza 9d (E5): Extindere tabele pentru PostGIS Proximity Workers
-- Tabele modificate: gold_proximity_scores, gold_entity_relationships
-- Context: gold_proximity_scores și gold_entity_relationships au fost create în 0051_e5_referrals.sql
--          Această migrare adaugă coloane necesare pentru score decomposition (Plan §X L2282-2284)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- gold_proximity_scores: adaugă coloane decompoziție scor (FAZA 9d)
-- Formula: proximityScore = distanceScore×0.5 + anchorQuality×0.3 + sharedBonus×0.2
-- ---------------------------------------------------------------------------

ALTER TABLE gold.gold_proximity_scores
  ALTER COLUMN anchor_location DROP NOT NULL,
  ALTER COLUMN prospect_location DROP NOT NULL;
--> statement-breakpoint

ALTER TABLE gold.gold_proximity_scores
  ADD COLUMN IF NOT EXISTS distance_score    NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS anchor_quality    NUMERIC(6,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shared_bonus      NUMERIC(6,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS radius_meters     INTEGER      NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS same_county       BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS same_crop         BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS calculated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW();
--> statement-breakpoint

ALTER TABLE gold.gold_proximity_scores
  ADD CONSTRAINT chk_proximity_distance_score CHECK (distance_score IS NULL OR distance_score BETWEEN 0 AND 1),
  ADD CONSTRAINT chk_proximity_radius CHECK (radius_meters BETWEEN 1000 AND 500000);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_gold_proximity_scores_tenant_score
  ON gold.gold_proximity_scores (tenant_id, proximity_score);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- gold_entity_relationships: adaugă coloana metadata (FAZA 9d)
-- ---------------------------------------------------------------------------

ALTER TABLE gold.gold_entity_relationships
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
--> statement-breakpoint
