-- Extinde valori permise pentru outreach.sms_messages.provider (SMSAdvert.ro).
ALTER TABLE outreach.sms_messages DROP CONSTRAINT IF EXISTS chk_sms_messages_provider;
ALTER TABLE outreach.sms_messages
  ADD CONSTRAINT chk_sms_messages_provider CHECK (provider IN ('TWILIO', 'VONAGE', 'AWS_SNS', 'SMSADVERT'));
