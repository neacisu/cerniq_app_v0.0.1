import { describe, it, expect } from "vitest";
import { cuiRegex } from "../src/schemas/company.js";
import { LeadScoreSchema } from "../src/schemas/lead.js";
import { TenantSchema } from "../src/schemas/tenant.js";
import { createPiiRedactor, redactPii } from "../src/schemas/pii.js";

describe("Zod Schemas", () => {
  describe("CUI regex", () => {
    it("accepts valid CUI", () => {
      expect(cuiRegex.test("RO12345678")).toBe(true);
    });
    it("rejects invalid CUI", () => {
      expect(cuiRegex.test("INVALID")).toBe(false);
    });
    it("rejects CUI without RO prefix", () => {
      expect(cuiRegex.test("12345678")).toBe(false);
    });
  });

  describe("LeadScore", () => {
    it("accepts 0-100", () => {
      expect(LeadScoreSchema.safeParse(50).success).toBe(true);
    });
    it("rejects negative", () => {
      expect(LeadScoreSchema.safeParse(-1).success).toBe(false);
    });
    it("rejects over 100", () => {
      expect(LeadScoreSchema.safeParse(101).success).toBe(false);
    });
  });

  describe("PII Redaction", () => {
    it("redacts email", () => {
      expect(redactPii("user@email.com")).toContain("[EMAIL_REDACTED]");
    });
    it("redacts phone", () => {
      expect(redactPii("0722123456")).toContain("[PHONE_REDACTED]");
    });
    it("redacts CNP and CUI", () => {
      expect(redactPii("CNP 1234567890123, CUI RO12345678")).toBe(
        "CNP [CNP_REDACTED], CUI [CUI_REDACTED]",
      );
    });
    it("redacts standalone IBAN values", () => {
      expect(redactPii("DE12 BANK 1234 1234 1234 1234")).toBe("[IBAN_REDACTED]");
    });
    it("creates recursive object redactors", () => {
      const redactor = createPiiRedactor();
      expect(
        redactor.redactObject({
          email: "user@email.com",
          nested: {
            phone: "+40 722 123 456",
            note: "safe",
          },
          count: 2,
        }),
      ).toEqual({
        email: "[EMAIL_REDACTED]",
        nested: {
          phone: "+[PHONE_REDACTED]",
          note: "safe",
        },
        count: 2,
      });
    });
  });

  describe("TenantSchema", () => {
    it("validates valid tenant", () => {
      const result = TenantSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test",
        slug: "test",
        status: "active",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(result.success).toBe(true);
    });
    it("rejects invalid slug", () => {
      const result = TenantSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test",
        slug: "INVALID SLUG!",
        status: "active",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(result.success).toBe(false);
    });
  });
});
