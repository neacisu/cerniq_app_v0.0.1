-- migrations/0024_create_e2_enums.sql
-- Etapa 2: Cold Outreach Enums
-- Source: etapa2-migrations.md sec. 2.1
-- NOTE: phone_status_enum uses RECONNECTING (not QUARANTINE) per source-of-truth

-- Current states (Lead State Machine ADR-0062)
CREATE TYPE current_state_enum AS ENUM (
  'COLD',
  'CONTACTED_WA',
  'CONTACTED_EMAIL',
  'WARM_REPLY',
  'NEGOTIATION',
  'CONVERTED',
  'DEAD',
  'PAUSED'
);

-- Communication channels (ADR-0059)
CREATE TYPE channel_enum AS ENUM (
  'WHATSAPP',
  'EMAIL_COLD',
  'EMAIL_WARM',
  'PHONE',
  'MANUAL'
);

-- Message direction
CREATE TYPE message_direction_enum AS ENUM (
  'OUTBOUND',
  'INBOUND'
);

-- Message delivery status
CREATE TYPE message_status_enum AS ENUM (
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'REPLIED',
  'BOUNCED',
  'FAILED',
  'OPENED',
  'CLICKED'
);

-- WhatsApp phone account status
-- RECONNECTING is canonical (etapa2-migrations.md source-of-truth, not QUARANTINE)
CREATE TYPE phone_status_enum AS ENUM (
  'ACTIVE',
  'PAUSED',
  'OFFLINE',
  'BANNED',
  'RECONNECTING'
);

-- Human review priority (SLA tiers)
CREATE TYPE review_priority_enum AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

-- Reason for human review routing
CREATE TYPE review_reason_enum AS ENUM (
  'NEGATIVE_SENTIMENT',
  'KEYWORD_TRIGGER',
  'BOUNCE_DETECTED',
  'COMPLAINT',
  'MANUAL_FLAG',
  'AI_UNCERTAIN'
);

-- Sequence enrollment status
CREATE TYPE sequence_status_enum AS ENUM (
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED'
);

-- Template publication status
CREATE TYPE template_status_enum AS ENUM (
  'DRAFT',
  'ACTIVE',
  'ARCHIVED'
);

-- Template functional type
CREATE TYPE template_type_enum AS ENUM (
  'INITIAL',
  'FOLLOWUP',
  'RESPONSE',
  'CLOSING'
);

-- Rollback:
-- DROP TYPE IF EXISTS current_state_enum CASCADE;
-- DROP TYPE IF EXISTS channel_enum CASCADE;
-- DROP TYPE IF EXISTS message_direction_enum CASCADE;
-- DROP TYPE IF EXISTS message_status_enum CASCADE;
-- DROP TYPE IF EXISTS phone_status_enum CASCADE;
-- DROP TYPE IF EXISTS review_priority_enum CASCADE;
-- DROP TYPE IF EXISTS review_reason_enum CASCADE;
-- DROP TYPE IF EXISTS sequence_status_enum CASCADE;
-- DROP TYPE IF EXISTS template_status_enum CASCADE;
-- DROP TYPE IF EXISTS template_type_enum CASCADE;
