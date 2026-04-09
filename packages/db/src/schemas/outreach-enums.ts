/**
 * Etapa 2 — Outreach Enum Types
 * Source: etapa2-migrations.md sec. 2.1 + etapa2-schema-outreach.md
 *
 * NOTE: phone_status_enum uses RECONNECTING (not QUARANTINE).
 * Source-of-truth: etapa2-migrations.md sec 2.1 > etapa2-schema-outreach.md
 */
import { pgEnum } from "drizzle-orm/pg-core";
import { LEAD_JOURNEY_FSM_STATES } from "./lead-journey-fsm-states.js";

// Lead State Machine — sursa valorilor: lead-journey-fsm-states.ts (contract E2–E5 / API Etapa 1)
export const currentStateEnum = pgEnum("current_state_enum", [...LEAD_JOURNEY_FSM_STATES]);

// Communication channels (ADR-0059)
export const channelEnum = pgEnum("channel_enum", [
  "WHATSAPP",
  "EMAIL_COLD",
  "EMAIL_WARM",
  "PHONE",
  "SMS",
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
  "BLOCKED",
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
  "STOPPED",
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
