-- FAZA 7k — Handover & Channel Routing (J56-J60)
-- Adds assigned_phone_id, ai_confidence_score, max_discount_offered to gold_negotiations.
-- Plan L8409: assigned_phone_id (sticky WA phone), ai_confidence_score (handover trigger <0.3),
-- max_discount_offered (handover trigger >30%).
-- Cross-schema reference to outreach.wa_phone_numbers — no FK constraint by design.

--> statement-breakpoint
ALTER TABLE gold.gold_negotiations
  ADD COLUMN IF NOT EXISTS assigned_phone_id uuid;

--> statement-breakpoint
ALTER TABLE gold.gold_negotiations
  ADD COLUMN IF NOT EXISTS ai_confidence_score numeric(5,4);

--> statement-breakpoint
ALTER TABLE gold.gold_negotiations
  ADD COLUMN IF NOT EXISTS max_discount_offered numeric(5,2);

--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_negotiations_assigned_phone
  ON gold.gold_negotiations(assigned_phone_id)
  WHERE assigned_phone_id IS NOT NULL;
