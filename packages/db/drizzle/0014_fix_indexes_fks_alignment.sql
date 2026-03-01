-- Migration 0014: Align indexes and FK constraints with TypeScript Drizzle schemas
-- Fixes: 7 incorrect indexes, 3 missing indexes, 6 missing FK constraints

-- ============================================================
-- PART 1: Fix Silver Indexes (DROP old, CREATE correct)
-- ============================================================

-- 1. idx_silver_companies_enrichment: was (tenant_id, enrichment_status) → needs (tenant_id, enrichment_status, last_enriched_at) WHERE ...
DROP INDEX IF EXISTS silver.idx_silver_companies_enrichment;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_enrichment
  ON silver.silver_companies (tenant_id, enrichment_status, last_enriched_at)
  WHERE enrichment_status IN ('pending', 'partial');
--> statement-breakpoint

-- 2. idx_silver_companies_promotion: was (tenant_id, promotion_status) → needs (tenant_id, promotion_status, total_quality_score) WHERE ...
DROP INDEX IF EXISTS silver.idx_silver_companies_promotion;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_promotion
  ON silver.silver_companies (tenant_id, promotion_status, total_quality_score)
  WHERE promotion_status = 'eligible';
--> statement-breakpoint

-- 3. idx_silver_companies_status: was (status_firma) → needs (tenant_id, status_firma)
DROP INDEX IF EXISTS silver.idx_silver_companies_status;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_status
  ON silver.silver_companies (tenant_id, status_firma);
--> statement-breakpoint

-- 4. idx_silver_companies_quality: was (total_quality_score) → needs (tenant_id, total_quality_score)
DROP INDEX IF EXISTS silver.idx_silver_companies_quality;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_companies_quality
  ON silver.silver_companies (tenant_id, total_quality_score);
--> statement-breakpoint

-- 5. idx_silver_dedup_pending: was (tenant_id, created_at) WHERE status='pending' → needs (tenant_id, status, overall_confidence) WHERE status IN ('pending','hitl_pending')
DROP INDEX IF EXISTS silver.idx_silver_dedup_pending;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_silver_dedup_pending
  ON silver.silver_dedup_candidates (tenant_id, status, overall_confidence)
  WHERE status IN ('pending', 'hitl_pending');
--> statement-breakpoint

-- ============================================================
-- PART 2: Fix Gold Indexes
-- ============================================================

-- 6. idx_gold_companies_lead_score: was (lead_score) → needs (tenant_id, lead_score, current_state) WHERE do_not_contact = FALSE
DROP INDEX IF EXISTS gold.idx_gold_companies_lead_score;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_companies_lead_score
  ON gold.gold_companies (tenant_id, lead_score, current_state)
  WHERE do_not_contact = FALSE;
--> statement-breakpoint

-- 7. idx_gold_companies_state: was (current_state) → needs (tenant_id, current_state, state_changed_at)
DROP INDEX IF EXISTS gold.idx_gold_companies_state;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_gold_companies_state
  ON gold.gold_companies (tenant_id, current_state, state_changed_at);
--> statement-breakpoint

-- ============================================================
-- PART 3: Add Missing Indexes (approval + audit tables)
-- ============================================================

-- 8. approval_tasks_tenant_id_idx
CREATE INDEX IF NOT EXISTS approval_tasks_tenant_id_idx
  ON approval.approval_tasks (tenant_id);
--> statement-breakpoint

-- 9. approval_type_configs_tenant_id_idx
CREATE INDEX IF NOT EXISTS approval_type_configs_tenant_id_idx
  ON approval.approval_type_configs (tenant_id);
--> statement-breakpoint

-- 10. approval_audit_log_tenant_id_idx
CREATE INDEX IF NOT EXISTS approval_audit_log_tenant_id_idx
  ON audit.approval_audit_log (tenant_id);
--> statement-breakpoint

-- ============================================================
-- PART 4: Add Missing Foreign Key Constraints
-- ============================================================

-- 11. approval_tasks.tenant_id → tenants.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_approval_tasks_tenant'
  ) THEN
    ALTER TABLE approval.approval_tasks
      ADD CONSTRAINT fk_approval_tasks_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

-- 12. approval_tasks.requested_by → users.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_approval_tasks_requested_by'
  ) THEN
    ALTER TABLE approval.approval_tasks
      ADD CONSTRAINT fk_approval_tasks_requested_by
      FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE RESTRICT;
  END IF;
END $$;
--> statement-breakpoint

-- 13. approval_tasks.assigned_to → users.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_approval_tasks_assigned_to'
  ) THEN
    ALTER TABLE approval.approval_tasks
      ADD CONSTRAINT fk_approval_tasks_assigned_to
      FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint

-- 14. approval_tasks.decided_by → users.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_approval_tasks_decided_by'
  ) THEN
    ALTER TABLE approval.approval_tasks
      ADD CONSTRAINT fk_approval_tasks_decided_by
      FOREIGN KEY (decided_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint

-- 15. approval_type_configs.tenant_id → tenants.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_approval_type_configs_tenant'
  ) THEN
    ALTER TABLE approval.approval_type_configs
      ADD CONSTRAINT fk_approval_type_configs_tenant
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

-- 16. pipeline_errors.entity_id → bronze_contacts.id (soft, SET NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_pipeline_errors_entity'
  ) THEN
    ALTER TABLE gold.pipeline_errors
      ADD CONSTRAINT fk_pipeline_errors_entity
      FOREIGN KEY (entity_id) REFERENCES bronze.bronze_contacts(id) ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
