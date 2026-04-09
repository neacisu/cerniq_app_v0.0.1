-- 0059: Indexuri performanță — reputație telefon (communication_log) + filtre allocator/monitor WA.
-- outreach.lead_journey: deja idx_lead_journey_tenant_state, idx_lead_journey_phone (0025/0028).
-- CREATE INDEX CONCURRENTLY: o instrucțiune per execuție (fără tranzacție multi-statement).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comm_log_tenant_phone_dir_sent_at
  ON outreach.communication_log (tenant_id, phone_id, direction, sent_at)
  WHERE phone_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wa_phones_tenant_status_enabled
  ON outreach.wa_phone_numbers (tenant_id, status, is_enabled);
