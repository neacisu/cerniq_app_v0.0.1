import { describe, it, expect } from "vitest";
import {
  getQuotaKey,
  getPhoneStatusKey,
  DAILY_QUOTA_LIMIT,
  QUOTA_KEY_TTL_SECONDS,
  QUOTA_CHECK_LUA,
} from "./quota-lua.js";

// ─── Key helpers ─────────────────────────────────────────────────────────────

describe("getQuotaKey", () => {
  it("returns the correct Redis key format", () => {
    expect(getQuotaKey("phone-001", "2026-03-22")).toBe("quota:wa:phone-001:2026-03-22");
  });

  it("embeds the phoneId verbatim", () => {
    const key = getQuotaKey("ph_ABC123", "2026-01-01");
    expect(key).toContain("ph_ABC123");
  });

  it("embeds the dateIso verbatim", () => {
    const key = getQuotaKey("p1", "2026-12-31");
    expect(key).toContain("2026-12-31");
  });

  it("produces distinct keys for distinct phones on the same date", () => {
    const k1 = getQuotaKey("phone-A", "2026-03-22");
    const k2 = getQuotaKey("phone-B", "2026-03-22");
    expect(k1).not.toBe(k2);
  });

  it("produces distinct keys for the same phone on different dates", () => {
    const k1 = getQuotaKey("phone-A", "2026-03-22");
    const k2 = getQuotaKey("phone-A", "2026-03-23");
    expect(k1).not.toBe(k2);
  });
});

describe("getPhoneStatusKey", () => {
  it("returns the correct Redis key format", () => {
    expect(getPhoneStatusKey("phone-001")).toBe("phone:status:phone-001");
  });

  it("produces distinct keys for distinct phones", () => {
    const k1 = getPhoneStatusKey("phone-A");
    const k2 = getPhoneStatusKey("phone-B");
    expect(k1).not.toBe(k2);
  });
});

// ─── Constants ───────────────────────────────────────────────────────────────

describe("quota constants", () => {
  it("DAILY_QUOTA_LIMIT is 200 per spec", () => {
    expect(DAILY_QUOTA_LIMIT).toBe(200);
  });

  it("QUOTA_KEY_TTL_SECONDS is 48 hours (172800 seconds)", () => {
    expect(QUOTA_KEY_TTL_SECONDS).toBe(172800);
    expect(QUOTA_KEY_TTL_SECONDS).toBe(48 * 60 * 60);
  });
});

// ─── QUOTA_CHECK_LUA script sanity checks ────────────────────────────────────

describe("QUOTA_CHECK_LUA", () => {
  it("is a non-empty Lua script string", () => {
    expect(typeof QUOTA_CHECK_LUA).toBe("string");
    expect(QUOTA_CHECK_LUA.trim().length).toBeGreaterThan(0);
  });

  it("references KEYS[1] (quota key) and KEYS[2] (phone status key)", () => {
    expect(QUOTA_CHECK_LUA).toContain("KEYS[1]");
    expect(QUOTA_CHECK_LUA).toContain("KEYS[2]");
  });

  it("references ARGV[1] (limit) ARGV[2] (cost) ARGV[3] (current_hour)", () => {
    expect(QUOTA_CHECK_LUA).toContain("ARGV[1]");
    expect(QUOTA_CHECK_LUA).toContain("ARGV[2]");
    expect(QUOTA_CHECK_LUA).toContain("ARGV[3]");
  });

  it("contains the TTL 172800 per spec", () => {
    expect(QUOTA_CHECK_LUA).toContain("172800");
  });

  it("handles cost=0 follow-up path (always allowed)", () => {
    expect(QUOTA_CHECK_LUA).toContain("cost == 0");
  });

  it("encodes responses as JSON via cjson", () => {
    expect(QUOTA_CHECK_LUA).toContain("cjson.encode");
  });

  it("checks business hours (09:00–18:00)", () => {
    expect(QUOTA_CHECK_LUA).toContain("9");
    expect(QUOTA_CHECK_LUA).toContain("18");
  });
});
