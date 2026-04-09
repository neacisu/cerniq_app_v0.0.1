/**
 * Contract FAZA 15 — SMS: tabele Drizzle + constante aliniate la 0061_sms_channel_schema.sql
 */
import { describe, it, expect } from "vitest";
import {
  smsMessages,
  smsOptOuts,
  smsTemplates,
  SMS_MESSAGE_STATUS_VALUES,
  SMS_OPT_OUT_SOURCE_VALUES,
  SMS_PROVIDER_VALUES,
} from "../src/schemas/sms.js";
import { channelEnum } from "../src/schemas/outreach-enums.js";

describe("SMS schema (outreach.sms_*)", () => {
  it("exportă tabelele planificate", () => {
    expect(smsMessages).toBeDefined();
    expect(smsOptOuts).toBeDefined();
    expect(smsTemplates).toBeDefined();
  });

  it("sms_messages: coloane obligatorii + FK (lead_id = gold company, ca lead_journey)", () => {
    expect(smsMessages.tenantId).toBeDefined();
    expect(smsMessages.leadId).toBeDefined();
    expect(smsMessages.journeyId).toBeDefined();
    expect(smsMessages.phoneNumber).toBeDefined();
    expect(smsMessages.provider).toBeDefined();
    expect(smsMessages.providerMessageId).toBeDefined();
    expect(smsMessages.direction).toBeDefined();
    expect(smsMessages.content).toBeDefined();
    expect(smsMessages.status).toBeDefined();
    expect(smsMessages.costUsd).toBeDefined();
    expect(smsMessages.segments).toBeDefined();
    expect(smsMessages.sentAt).toBeDefined();
    expect(smsMessages.deliveredAt).toBeDefined();
    expect(smsMessages.failedReason).toBeDefined();
    expect(smsMessages.createdAt).toBeDefined();
    expect(smsMessages.updatedAt).toBeDefined();
  });

  it("sms_opt_outs: unic tenant + telefon, sursă în setul planului", () => {
    expect(smsOptOuts.tenantId).toBeDefined();
    expect(smsOptOuts.phoneNumber).toBeDefined();
    expect(smsOptOuts.source).toBeDefined();
    expect(smsOptOuts.createdAt).toBeDefined();
    expect(smsOptOuts.notes).toBeDefined();
    expect(SMS_OPT_OUT_SOURCE_VALUES).toEqual(["REPLY_STOP", "MANUAL", "API"]);
  });

  it("sms_templates: variables JSONB + max_segments", () => {
    expect(smsTemplates.tenantId).toBeDefined();
    expect(smsTemplates.name).toBeDefined();
    expect(smsTemplates.bodyTemplate).toBeDefined();
    expect(smsTemplates.variables).toBeDefined();
    expect(smsTemplates.maxSegments).toBeDefined();
    expect(smsTemplates.isActive).toBeDefined();
    expect(smsTemplates.createdAt).toBeDefined();
    expect(smsTemplates.updatedAt).toBeDefined();
  });

  it("constantele CHECK coincid cu migrarea SQL (0061 + 0065 SMSADVERT)", () => {
    expect(SMS_PROVIDER_VALUES).toEqual(["TWILIO", "VONAGE", "AWS_SNS", "SMSADVERT"]);
    expect(SMS_MESSAGE_STATUS_VALUES).toEqual([
      "QUEUED",
      "SENT",
      "DELIVERED",
      "FAILED",
      "REJECTED",
      "OPTED_OUT",
    ]);
  });

  it("channel_enum include SMS (omnichannel + sms_messages paralel)", () => {
    expect(channelEnum.enumValues).toContain("SMS");
  });
});
