-- FAZA 7m — MCP Server: Session fields pe gold_negotiations și ai_conversations
-- Plan L8409: gold_negotiations.mcp_session_id + mcp_session_expires_at (TTL 30min)
-- Plan L8414: ai_conversations.mcp_session_id

--> statement-breakpoint
ALTER TABLE gold.gold_negotiations
  ADD COLUMN IF NOT EXISTS mcp_session_id text;

--> statement-breakpoint
ALTER TABLE gold.gold_negotiations
  ADD COLUMN IF NOT EXISTS mcp_session_expires_at timestamptz;

--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_negotiations_mcp_session
  ON gold.gold_negotiations(mcp_session_id)
  WHERE mcp_session_id IS NOT NULL;

--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gold_negotiations_mcp_expires
  ON gold.gold_negotiations(mcp_session_expires_at)
  WHERE mcp_session_expires_at IS NOT NULL;

--> statement-breakpoint
ALTER TABLE gold.ai_conversations
  ADD COLUMN IF NOT EXISTS mcp_session_id text;
