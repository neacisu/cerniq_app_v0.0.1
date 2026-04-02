-- FAZA 7l — Sentiment & Intent Analysis E3 (K61-K65)
-- Adaugă sentimentScore + sentimentLabel pe ai_conversation_messages (pentru K64 trend).
-- Creează gold_negotiation_feedback pentru K65 NPS feedback collection.
-- Plan L1901-1905.

--> statement-breakpoint
ALTER TABLE gold.ai_conversation_messages
  ADD COLUMN IF NOT EXISTS sentiment_score numeric(4,3);

--> statement-breakpoint
ALTER TABLE gold.ai_conversation_messages
  ADD COLUMN IF NOT EXISTS sentiment_label text;

--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_conversation_messages_sentiment
  ON gold.ai_conversation_messages(sentiment_score, created_at)
  WHERE sentiment_score IS NOT NULL;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS gold.gold_negotiation_feedback (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  negotiation_id uuid NOT NULL REFERENCES gold.gold_negotiations(id) ON DELETE CASCADE,
  nps            integer NOT NULL,
  free_text      text,
  source_channel text,
  trigger_message_id uuid,
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_negotiation_feedback_nps CHECK (nps BETWEEN 1 AND 5)
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_negotiation_feedback_negotiation
  ON gold.gold_negotiation_feedback(negotiation_id);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_negotiation_feedback_tenant_created
  ON gold.gold_negotiation_feedback(tenant_id, created_at);
