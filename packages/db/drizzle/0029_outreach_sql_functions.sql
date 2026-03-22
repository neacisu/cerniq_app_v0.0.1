-- SQL helper functions for Etapa 2 (outreach schema) — aligned with actual columns
-- Source: etapa2-migrations.md sec 11, adapted for outreach.wa_quota_usage

CREATE OR REPLACE FUNCTION outreach.check_wa_quota_available(
  p_phone_id UUID,
  p_is_new_contact BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  v_new_used INTEGER;
  v_new_limit INTEGER;
  v_follow_used INTEGER;
  v_follow_limit INTEGER;
BEGIN
  SELECT p.daily_new_contact_limit, p.followup_limit
  INTO v_new_limit, v_follow_limit
  FROM outreach.wa_phone_numbers p
  WHERE p.id = p_phone_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT
    COALESCE(q.new_contacts, 0),
    COALESCE(q.follow_ups, 0)
  INTO v_new_used, v_follow_used
  FROM outreach.wa_quota_usage q
  WHERE q.phone_id = p_phone_id
    AND q.usage_date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date;

  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  IF p_is_new_contact THEN
    RETURN v_new_used < v_new_limit;
  ELSE
    RETURN v_follow_used < v_follow_limit;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION outreach.increment_wa_quota(
  p_phone_id UUID,
  p_tenant_id UUID,
  p_is_new_contact BOOLEAN
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO outreach.wa_quota_usage (id, phone_id, tenant_id, usage_date, new_contacts, follow_ups, messages_sent)
  VALUES (
    gen_random_uuid(),
    p_phone_id,
    p_tenant_id,
    (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
    CASE WHEN p_is_new_contact THEN 1 ELSE 0 END,
    CASE WHEN p_is_new_contact THEN 0 ELSE 1 END,
    0
  )
  ON CONFLICT (phone_id, usage_date)
  DO UPDATE SET
    new_contacts = outreach.wa_quota_usage.new_contacts +
      CASE WHEN p_is_new_contact THEN 1 ELSE 0 END,
    follow_ups = outreach.wa_quota_usage.follow_ups +
      CASE WHEN p_is_new_contact THEN 0 ELSE 1 END,
    updated_at = NOW();
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION outreach.calculate_engagement_score(
  p_messages_sent INTEGER,
  p_messages_received INTEGER,
  p_avg_response_time_hours DECIMAL,
  p_sentiment_score INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_response_rate DECIMAL;
  v_response_time_score DECIMAL;
  v_sentiment_normalized DECIMAL;
  v_score INTEGER;
BEGIN
  IF p_messages_sent > 0 THEN
    v_response_rate := (p_messages_received::DECIMAL / p_messages_sent) * 40;
  ELSE
    v_response_rate := 0;
  END IF;

  IF p_avg_response_time_hours IS NOT NULL THEN
    v_response_time_score := GREATEST(0, 30 - (p_avg_response_time_hours / 24 * 30));
  ELSE
    v_response_time_score := 0;
  END IF;

  IF p_sentiment_score IS NOT NULL THEN
    v_sentiment_normalized := ((p_sentiment_score + 100) / 200.0) * 30;
  ELSE
    v_sentiment_normalized := 15;
  END IF;

  v_score := LEAST(100, GREATEST(0,
    ROUND(v_response_rate + v_response_time_score + v_sentiment_normalized)
  ));

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION outreach.get_next_available_wa_phone(
  p_tenant_id UUID,
  p_is_new_contact BOOLEAN
) RETURNS UUID AS $$
DECLARE
  v_phone_id UUID;
BEGIN
  SELECT p.id INTO v_phone_id
  FROM outreach.wa_phone_numbers p
  LEFT JOIN outreach.wa_quota_usage q
    ON q.phone_id = p.id
   AND q.usage_date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
   AND q.tenant_id = p_tenant_id
  WHERE p.tenant_id = p_tenant_id
    AND p.status = 'ACTIVE'
    AND p.is_enabled = TRUE
    AND (
      CASE WHEN p_is_new_contact
        THEN COALESCE(q.new_contacts, 0) < p.daily_new_contact_limit
        ELSE COALESCE(q.follow_ups, 0) < p.followup_limit
      END
    )
  ORDER BY COALESCE(q.new_contacts, 0) ASC, p.priority ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  RETURN v_phone_id;
END;
$$ LANGUAGE plpgsql;
