-- =============================================================================
-- 0038_e3_sql_functions.sql — Faza 7a (E3): Funcții SQL + Triggere
-- Depinde de: 0035_e3_tables.sql (tabele gold), 0033_pgvector_halfvec_3072.sql
-- Extensii necesare: pgvector (halfvec), pg_trgm
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. hybrid_product_search
--    Hybrid: vector 60% + BM25 40% cu RRF 1.0/(60+rank).
--    Fuzzy pg_trgm integrat în scorul BM25 (text-based).
--    filters JSONB: { "tenant_id": "uuid", "category_id": "uuid|null",
--                     "is_active": true|false, "max_price": numeric }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gold.hybrid_product_search(
  query_text       TEXT,
  query_embedding  halfvec(3072),
  filters          JSONB,
  lim              INT DEFAULT 20
)
RETURNS TABLE (
  product_id  UUID,
  score       DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tenant_id   UUID;
  v_category_id UUID;
  v_is_active   BOOLEAN;
  v_max_price   NUMERIC;
BEGIN
  -- Validare: tenant_id este obligatoriu în filters
  IF filters IS NULL OR filters->>'tenant_id' IS NULL THEN
    RETURN;
  END IF;

  v_tenant_id   := (filters->>'tenant_id')::UUID;
  v_category_id := NULLIF(filters->>'category_id', '')::UUID;
  v_is_active   := COALESCE((filters->>'is_active')::BOOLEAN, TRUE);
  v_max_price   := NULLIF(filters->>'max_price', '')::NUMERIC;

  RETURN QUERY
  WITH vector_results AS (
    -- Căutare vectorială: embedding cosine similarity
    SELECT
      pe.product_id                                                    AS pid,
      ROW_NUMBER() OVER (ORDER BY pe.embedding <=> query_embedding)   AS rank
    FROM gold.gold_product_embeddings pe
    JOIN gold.gold_products gp ON gp.id = pe.product_id
    WHERE pe.tenant_id = v_tenant_id
      AND gp.is_active = v_is_active
      AND (v_category_id IS NULL OR gp.category_id = v_category_id)
      AND (v_max_price IS NULL   OR gp.unit_price <= v_max_price)
    LIMIT 100
  ),
  bm25_results AS (
    -- BM25 + fuzzy trigram (combinat text-based)
    SELECT
      gp.id                                                                   AS pid,
      ROW_NUMBER() OVER (
        ORDER BY (
          CASE
            WHEN query_text IS NOT NULL AND query_text <> ''
              AND gp.search_vector @@ plainto_tsquery('romanian', query_text)
            THEN ts_rank_cd(gp.search_vector, plainto_tsquery('romanian', query_text))
            ELSE 0.0
          END
          +
          CASE
            WHEN query_text IS NOT NULL AND query_text <> '' AND gp.name_trigram IS NOT NULL
            THEN similarity(gp.name_trigram, query_text)
            ELSE 0.0
          END
        ) DESC
      ) AS rank
    FROM gold.gold_products gp
    WHERE gp.tenant_id = v_tenant_id
      AND gp.is_active = v_is_active
      AND (v_category_id IS NULL OR gp.category_id = v_category_id)
      AND (v_max_price IS NULL   OR gp.unit_price <= v_max_price)
      AND (
        -- BM25 match
        (
          query_text IS NOT NULL
          AND query_text <> ''
          AND gp.search_vector @@ plainto_tsquery('romanian', query_text)
        )
        OR
        -- Fuzzy trigram fallback pentru typos
        (
          query_text IS NOT NULL
          AND query_text <> ''
          AND gp.name_trigram IS NOT NULL
          AND similarity(gp.name_trigram, query_text) > 0.15
        )
      )
    LIMIT 100
  ),
  rrf_fusion AS (
    -- Reciprocal Rank Fusion: vector 60% + BM25 40%
    SELECT
      COALESCE(vr.pid, br.pid) AS product_id,
      (0.6 * COALESCE(1.0 / (60.0 + vr.rank::DOUBLE PRECISION), 0.0))
      +
      (0.4 * COALESCE(1.0 / (60.0 + br.rank::DOUBLE PRECISION), 0.0))
        AS rrf_score
    FROM vector_results vr
    FULL OUTER JOIN bm25_results br ON br.pid = vr.pid
  )
  SELECT
    rf.product_id,
    rf.rrf_score AS score
  FROM rrf_fusion rf
  ORDER BY rf.rrf_score DESC
  LIMIT lim;
END;
$$;

--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. get_max_discount
--    Cascade: regula specifică produsului → categorie → globală (fallback 0%).
--    Garantează că discountul nu depășește (100 - min_margin_pct)%.
--    min_margin_pct default = 8% (din coloana price_rules.min_margin_pct).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gold.get_max_discount(
  p_tenant_id   UUID,
  p_product_id  UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_discount    NUMERIC(5,2);
  v_min_margin  NUMERIC(5,2) := 8.0;
  v_category_id UUID;
BEGIN
  -- Nivelul 1: regulă specifică produsului (prioritate maximă)
  SELECT
    COALESCE(pr.discount_pct, 0.0),
    COALESCE(pr.min_margin_pct, 8.0)
  INTO v_discount, v_min_margin
  FROM gold.price_rules pr
  WHERE pr.tenant_id  = p_tenant_id
    AND pr.product_id = p_product_id
    AND pr.rule_type  = 'product'
    AND (pr.valid_from  IS NULL OR pr.valid_from  <= now())
    AND (pr.valid_until IS NULL OR pr.valid_until >= now())
  ORDER BY pr.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Hard limit: nu permite discount care lasă marjă < min_margin_pct
    RETURN LEAST(v_discount, GREATEST(100.0 - v_min_margin, 0.0));
  END IF;

  -- Nivelul 2: regulă la nivel de categorie
  SELECT gp.category_id
  INTO v_category_id
  FROM gold.gold_products gp
  WHERE gp.id = p_product_id AND gp.tenant_id = p_tenant_id;

  IF v_category_id IS NOT NULL THEN
    SELECT
      COALESCE(pr.discount_pct, 0.0),
      COALESCE(pr.min_margin_pct, 8.0)
    INTO v_discount, v_min_margin
    FROM gold.price_rules pr
    JOIN gold.gold_products gp2 ON gp2.id = pr.product_id
    WHERE pr.tenant_id  = p_tenant_id
      AND pr.rule_type  = 'category'
      AND gp2.category_id = v_category_id
      AND (pr.valid_from  IS NULL OR pr.valid_from  <= now())
      AND (pr.valid_until IS NULL OR pr.valid_until >= now())
    ORDER BY pr.created_at DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN LEAST(v_discount, GREATEST(100.0 - v_min_margin, 0.0));
    END IF;
  END IF;

  -- Nivelul 3: regulă globală (fallback)
  SELECT
    COALESCE(pr.discount_pct, 0.0),
    COALESCE(pr.min_margin_pct, 8.0)
  INTO v_discount, v_min_margin
  FROM gold.price_rules pr
  WHERE pr.tenant_id = p_tenant_id
    AND pr.rule_type = 'global'
    AND (pr.valid_from  IS NULL OR pr.valid_from  <= now())
    AND (pr.valid_until IS NULL OR pr.valid_until >= now())
  ORDER BY pr.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN LEAST(v_discount, GREATEST(100.0 - v_min_margin, 0.0));
  END IF;

  -- Default: nicio regulă găsită → 0% discount (sigur)
  RETURN 0.0;
END;
$$;

--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. get_available_stock
--    Stoc disponibil = total_quantity - rezervări active neexpirate.
--    Citește tenant_id din contextul sesiunii RLS (app.current_tenant_id).
--    Returnează ALWAYS >= 0 (nu returnează negativ).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gold.get_available_stock(p_sku TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tenant_id  UUID;
  v_setting    TEXT;
  v_available  INTEGER;
BEGIN
  -- Citire tenant din context sesiune RLS
  v_setting := current_setting('app.current_tenant_id', TRUE);
  IF v_setting IS NULL OR v_setting = '' THEN
    RETURN 0;
  END IF;

  BEGIN
    v_tenant_id := v_setting::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN 0;
  END;

  -- Calcul stoc disponibil = total - rezervate active neexpirate
  SELECT GREATEST(
    si.total_quantity - COALESCE(
      (
        SELECT SUM(sr.quantity)
        FROM gold.stock_reservations sr
        WHERE sr.inventory_id        = si.id
          AND sr.reservation_state  IN ('ACTIVE', 'RESERVED')
          AND (sr.expires_at IS NULL OR sr.expires_at > now())
      ),
      0
    ),
    0  -- nu poate fi negativ
  )
  INTO v_available
  FROM gold.stock_inventory si
  WHERE si.tenant_id = v_tenant_id
    AND si.sku       = p_sku
  ORDER BY si.created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_available, 0);
END;
$$;

--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. get_reservation_ttl
--    TTL per stare negociere pentru rezervări de stoc.
--    PROPOSAL=30min, NEGOTIATION=2h, CLOSING=24h, PROFORMA_SENT=7zile.
--    Alte stări returnează NULL (fără TTL — rezervare fără expirare automată).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gold.get_reservation_ttl(p_state TEXT)
RETURNS INTERVAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_state
    WHEN 'PROPOSAL'       THEN INTERVAL '30 minutes'
    WHEN 'NEGOTIATION'    THEN INTERVAL '2 hours'
    WHEN 'CLOSING'        THEN INTERVAL '24 hours'
    WHEN 'PROFORMA_SENT'  THEN INTERVAL '7 days'
    ELSE NULL
  END;
END;
$$;

--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 5. validate_state_transition (funcție trigger)
--    BEFORE UPDATE pe gold_negotiations.
--    Blochează cu RAISE EXCEPTION orice tranziție invalidă față de
--    gold.fsm_valid_transitions unde fsm_type = 'negotiation'.
--    Permite same-state updates (nu sunt tranziții de stare).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gold.validate_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Execută validare doar dacă starea se schimbă efectiv
  IF OLD.current_state IS DISTINCT FROM NEW.current_state THEN
    IF NOT EXISTS (
      SELECT 1
      FROM gold.fsm_valid_transitions
      WHERE fsm_type   = 'negotiation'
        AND from_state = OLD.current_state
        AND to_state   = NEW.current_state
    ) THEN
      RAISE EXCEPTION
        'FSM: tranzitie invalida % → % pentru negotiation (id: %)',
        OLD.current_state, NEW.current_state, NEW.id
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Actualizează updated_at la schimbarea stării
  IF OLD.current_state IS DISTINCT FROM NEW.current_state THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

--> statement-breakpoint

CREATE TRIGGER trg_validate_state_transition
  BEFORE UPDATE ON gold.gold_negotiations
  FOR EACH ROW
  EXECUTE FUNCTION gold.validate_state_transition();

--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 6. update_negotiation_total (funcție trigger)
--    AFTER INSERT OR UPDATE OR DELETE pe negotiation_items.
--    Recalculează gold_negotiations.total_value ca SUM(line_total).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gold.update_negotiation_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_negotiation_id UUID;
  v_total          NUMERIC(14,2);
BEGIN
  -- Determină negotiation_id din rândul afectat
  IF TG_OP = 'DELETE' THEN
    v_negotiation_id := OLD.negotiation_id;
  ELSE
    v_negotiation_id := NEW.negotiation_id;
  END IF;

  -- Recalculează totalul
  SELECT COALESCE(SUM(line_total), 0.0)
  INTO v_total
  FROM gold.negotiation_items
  WHERE negotiation_id = v_negotiation_id;

  -- Actualizează negocierea
  UPDATE gold.gold_negotiations
  SET total_value = v_total,
      updated_at  = now()
  WHERE id = v_negotiation_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

--> statement-breakpoint

CREATE TRIGGER trg_update_negotiation_total
  AFTER INSERT OR UPDATE OR DELETE ON gold.negotiation_items
  FOR EACH ROW
  EXECUTE FUNCTION gold.update_negotiation_total();
