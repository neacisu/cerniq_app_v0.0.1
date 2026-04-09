import { describe, expect, it } from "vitest";
import {
  getBucharestDateIsoForSms,
  smsQuotaKey,
  ttlSecondsToEndOfBucharestDay,
} from "./sms-quota.js";

describe("sms-quota helpers", () => {
  it("smsQuotaKey — format stabil", () => {
    expect(smsQuotaKey("t1", "2026-04-09")).toBe("sms:quota:t1:2026-04-09");
  });

  it("getBucharestDateIsoForSms — format YYYY-MM-DD", () => {
    const d = getBucharestDateIsoForSms(new Date("2026-06-15T12:00:00.000Z"));
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("ttlSecondsToEndOfBucharestDay — minim 120s", () => {
    expect(ttlSecondsToEndOfBucharestDay(new Date())).toBeGreaterThanOrEqual(120);
  });
});
