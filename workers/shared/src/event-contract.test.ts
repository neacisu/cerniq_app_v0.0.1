import { describe, expect, it } from "vitest";
import { createEvent, validateEvent, EVENT_TYPES } from "./event-contract.js";

describe("event-contract", () => {
  it("creates a valid event envelope with auto-generated IDs", () => {
    const event = createEvent({
      eventType: EVENT_TYPES.BRONZE_CONTACT_INGESTED,
      tenantId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      source: "ingest:csv",
      payload: { contactId: "some-id" },
    });

    expect(event.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.eventType).toBe("bronze.contact.ingested");
    expect(event.version).toBe("1.0");
    expect(event.tenantId).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(event.source).toBe("ingest:csv");
    expect(event.payload).toEqual({ contactId: "some-id" });
    expect(event.timestamp).toBeDefined();
    expect(event.idempotencyKey).toContain("bronze.contact.ingested:");
  });

  it("uses custom idempotencyKey when provided", () => {
    const event = createEvent({
      eventType: EVENT_TYPES.SILVER_COMPANY_CREATED,
      tenantId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      source: "pipeline:promote",
      payload: { companyId: "xyz" },
      idempotencyKey: "custom-key-123",
    });

    expect(event.idempotencyKey).toBe("custom-key-123");
  });

  it("validates a correct event envelope", () => {
    const raw = createEvent({
      eventType: EVENT_TYPES.GOLD_COMPANY_CREATED,
      tenantId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      source: "pipeline:promote:gold",
      payload: { goldId: "g1" },
      correlationId: "a1b2c3d4-e5f6-7890-abcd-ef1234567891",
    });

    const validated = validateEvent(raw);
    expect(validated.eventType).toBe("gold.company.created");
    expect(validated.correlationId).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567891");
  });

  it("throws on invalid event envelope", () => {
    expect(() => validateEvent({ eventType: "bronze.bad" })).toThrow("Invalid event envelope");
    expect(() => validateEvent(null)).toThrow("Invalid event envelope");
  });
});
