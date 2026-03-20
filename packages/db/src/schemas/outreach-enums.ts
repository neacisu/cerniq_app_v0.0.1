/**
 * Etapa 2 — Outreach Enum Types
 * Source: etapa2-migrations.md sec. 2.1 + etapa2-schema-outreach.md
 *
 * NOTE: phone_status_enum uses RECONNECTING (not QUARANTINE).
 * Source-of-truth: etapa2-migrations.md sec 2.1 > etapa2-schema-outreach.md
 */
import { pgEnum } from "drizzle-orm/pg-core";

// Lead State Machine states (ADR-0062)
export const currentStateEnum = pgEnum("current_state_enum", [
  "COLD",
  "CONTACTED_WA",
  "CONTACTED_EMAIL",
  "WARM_REPLY",
  "NEGOTIATION",
  "CONVERTED",
  "DEAD",
  "PAUSED",
]);

// Communication channels (ADR-0059)
export const channelEnum = pgEnum("channel_enum", [
  "WHATSAPP",
  "EMAIL_COLD",
  "EMAIL_WARM",
  "PHONE",
  "MANUAL",
]);

// Message direction
export const messageDirectionEnum = pgEnum("message_direction_enum", ["OUTBOUND", "INBOUND"]);

// Message delivery status
export const messageStatusEnum = pgEnum("message_status_enum", [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "REPLIED",
  "BOUNCED",
  "FAILED",
  "OPENED",
  "CLICKED",
]);

// WhatsApp phone account status (source-of-truth: etapa2-migrations.md)
// RECONNECTING is the canonical value (not QUARANTINE)
export const phoneStatusEnum = pgEnum("phone_status_enum", [
  "ACTIVE",
  "PAUSED",
  "OFFLINE",
  "BANNED",
  "RECONNECTING",
]);

// Human review priority (SLA tiers)
export const reviewPriorityEnum = pgEnum("review_priority_enum", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

// Reason for sending to human review
export const reviewReasonEnum = pgEnum("review_reason_enum", [
  "NEGATIVE_SENTIMENT",
  "KEYWORD_TRIGGER",
  "BOUNCE_DETECTED",
  "COMPLAINT",
  "MANUAL_FLAG",
  "AI_UNCERTAIN",
]);

// Outreach sequence enrollment status
export const sequenceStatusEnum = pgEnum("sequence_status_enum", [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
]);

// Outreach template publication status
export const templateStatusEnum = pgEnum("template_status_enum", ["DRAFT", "ACTIVE", "ARCHIVED"]);

// Outreach template functional type
export const templateTypeEnum = pgEnum("template_type_enum", [
  "INITIAL",
  "FOLLOWUP",
  "RESPONSE",
  "CLOSING",
]);
