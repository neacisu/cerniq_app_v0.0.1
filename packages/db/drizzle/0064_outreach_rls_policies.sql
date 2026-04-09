-- RLS pe schema outreach — izolare tenant prin public.cerniq_app_session_tenant_id() (0060).
-- Tabele fără tenant_id direct: wa_quota_usage (via phone), outreach_sequence_steps (via sequence),
-- template_versions (via template).

-- ---------------------------------------------------------------------------
-- outreach.wa_phone_numbers
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.wa_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.wa_phone_numbers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_wa_phone_numbers ON outreach.wa_phone_numbers;
CREATE POLICY tenant_all_outreach_wa_phone_numbers ON outreach.wa_phone_numbers
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.outreach_sequences
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.outreach_sequences FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_sequences ON outreach.outreach_sequences;
CREATE POLICY tenant_all_outreach_sequences ON outreach.outreach_sequences
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.outreach_templates
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.outreach_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.outreach_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_templates ON outreach.outreach_templates;
CREATE POLICY tenant_all_outreach_templates ON outreach.outreach_templates
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.lead_journey
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.lead_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.lead_journey FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_lead_journey ON outreach.lead_journey;
CREATE POLICY tenant_all_outreach_lead_journey ON outreach.lead_journey
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.communication_log
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.communication_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_communication_log ON outreach.communication_log;
CREATE POLICY tenant_all_outreach_communication_log ON outreach.communication_log
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.wa_quota_usage (tenant via wa_phone_numbers)
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.wa_quota_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.wa_quota_usage FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_wa_quota_usage ON outreach.wa_quota_usage;
CREATE POLICY tenant_all_outreach_wa_quota_usage ON outreach.wa_quota_usage
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM outreach.wa_phone_numbers p
      WHERE p.id = outreach.wa_quota_usage.phone_id
        AND p.tenant_id = public.cerniq_app_session_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM outreach.wa_phone_numbers p
      WHERE p.id = outreach.wa_quota_usage.phone_id
        AND p.tenant_id = public.cerniq_app_session_tenant_id()
    )
  );

-- ---------------------------------------------------------------------------
-- outreach.outreach_sequence_steps (tenant via outreach_sequences)
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.outreach_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.outreach_sequence_steps FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_sequence_steps ON outreach.outreach_sequence_steps;
CREATE POLICY tenant_all_outreach_sequence_steps ON outreach.outreach_sequence_steps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM outreach.outreach_sequences s
      WHERE s.id = outreach.outreach_sequence_steps.sequence_id
        AND s.tenant_id = public.cerniq_app_session_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM outreach.outreach_sequences s
      WHERE s.id = outreach.outreach_sequence_steps.sequence_id
        AND s.tenant_id = public.cerniq_app_session_tenant_id()
    )
  );

-- ---------------------------------------------------------------------------
-- outreach.sequence_enrollments
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.sequence_enrollments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_sequence_enrollments ON outreach.sequence_enrollments;
CREATE POLICY tenant_all_outreach_sequence_enrollments ON outreach.sequence_enrollments
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.template_versions (tenant via outreach_templates)
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.template_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_template_versions ON outreach.template_versions;
CREATE POLICY tenant_all_outreach_template_versions ON outreach.template_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM outreach.outreach_templates t
      WHERE t.id = outreach.template_versions.template_id
        AND t.tenant_id = public.cerniq_app_session_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM outreach.outreach_templates t
      WHERE t.id = outreach.template_versions.template_id
        AND t.tenant_id = public.cerniq_app_session_tenant_id()
    )
  );

-- ---------------------------------------------------------------------------
-- outreach.human_review_queue
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.human_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.human_review_queue FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_human_review_queue ON outreach.human_review_queue;
CREATE POLICY tenant_all_outreach_human_review_queue ON outreach.human_review_queue
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.hitl_audit_log
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.hitl_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.hitl_audit_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_hitl_audit_log ON outreach.hitl_audit_log;
CREATE POLICY tenant_all_outreach_hitl_audit_log ON outreach.hitl_audit_log
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.outreach_daily_stats
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.outreach_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.outreach_daily_stats FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_daily_stats ON outreach.outreach_daily_stats;
CREATE POLICY tenant_all_outreach_daily_stats ON outreach.outreach_daily_stats
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.outreach_settings
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.outreach_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.outreach_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_settings ON outreach.outreach_settings;
CREATE POLICY tenant_all_outreach_settings ON outreach.outreach_settings
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.outreach_notifications
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.outreach_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.outreach_notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_notifications ON outreach.outreach_notifications;
CREATE POLICY tenant_all_outreach_notifications ON outreach.outreach_notifications
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.webhook_event_archive
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.webhook_event_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.webhook_event_archive FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_webhook_event_archive ON outreach.webhook_event_archive;
CREATE POLICY tenant_all_outreach_webhook_event_archive ON outreach.webhook_event_archive
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.sms_messages
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.sms_messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_sms_messages ON outreach.sms_messages;
CREATE POLICY tenant_all_outreach_sms_messages ON outreach.sms_messages
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.sms_opt_outs
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.sms_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.sms_opt_outs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_sms_opt_outs ON outreach.sms_opt_outs;
CREATE POLICY tenant_all_outreach_sms_opt_outs ON outreach.sms_opt_outs
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());

-- ---------------------------------------------------------------------------
-- outreach.sms_templates
-- ---------------------------------------------------------------------------
ALTER TABLE outreach.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.sms_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_all_outreach_sms_templates ON outreach.sms_templates;
CREATE POLICY tenant_all_outreach_sms_templates ON outreach.sms_templates
  FOR ALL
  USING (tenant_id = public.cerniq_app_session_tenant_id())
  WITH CHECK (tenant_id = public.cerniq_app_session_tenant_id());
