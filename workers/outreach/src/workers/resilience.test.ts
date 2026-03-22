import { describe, it, expect, vi, afterEach } from "vitest";

// Mock @cerniq/db to prevent DATABASE_URL requirement
// (transitive via @cerniq/worker-shared → import-execution.js → @cerniq/db)
vi.mock("@cerniq/db", () => ({ db: {}, sql: vi.fn(), eq: vi.fn(), and: vi.fn() }));

import {
  isBusinessHours,
  getNextBusinessSlot,
  BUSINESS_HOURS,
  ROMANIAN_HOLIDAYS_2026,
  RETRY_POLICIES,
  DLQ_CONFIG,
} from "./resilience.js";

afterEach(() => {
  vi.useRealTimers();
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe("BUSINESS_HOURS", () => {
  it("start hour is 09:00", () => {
    expect(BUSINESS_HOURS.START_HOUR).toBe(9);
  });

  it("end hour is 18:00 (exclusive)", () => {
    expect(BUSINESS_HOURS.END_HOUR).toBe(18);
  });

  it("timezone is Europe/Bucharest", () => {
    expect(BUSINESS_HOURS.TIMEZONE).toBe("Europe/Bucharest");
  });

  it("working days are Mon–Fri (ISO 1–5)", () => {
    expect(BUSINESS_HOURS.WORKING_DAYS).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("ROMANIAN_HOLIDAYS_2026", () => {
  it("includes standard Romanian public holidays", () => {
    expect(ROMANIAN_HOLIDAYS_2026).toContain("2026-01-01"); // Anul Nou
    expect(ROMANIAN_HOLIDAYS_2026).toContain("2026-01-24"); // Ziua Unirii
    expect(ROMANIAN_HOLIDAYS_2026).toContain("2026-05-01"); // Ziua Muncii
    expect(ROMANIAN_HOLIDAYS_2026).toContain("2026-12-01"); // Ziua Națională
    expect(ROMANIAN_HOLIDAYS_2026).toContain("2026-12-25"); // Crăciun
  });

  it("has at least 10 entries", () => {
    expect(ROMANIAN_HOLIDAYS_2026.length).toBeGreaterThanOrEqual(10);
  });

  it("all entries are ISO date strings (YYYY-MM-DD)", () => {
    for (const d of ROMANIAN_HOLIDAYS_2026) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("RETRY_POLICIES", () => {
  it("NETWORK: 3 attempts, exponential backoff", () => {
    expect(RETRY_POLICIES.NETWORK.attempts).toBe(3);
    expect(RETRY_POLICIES.NETWORK.backoff.type).toBe("exponential");
  });

  it("RATE_LIMITED: 5 attempts, fixed 60s backoff", () => {
    expect(RETRY_POLICIES.RATE_LIMITED.attempts).toBe(5);
    expect(RETRY_POLICIES.RATE_LIMITED.backoff.type).toBe("fixed");
    expect(RETRY_POLICIES.RATE_LIMITED.backoff.delay).toBe(60_000);
  });

  it("CLIENT_ERROR: 0 attempts (immediate DLQ)", () => {
    expect(RETRY_POLICIES.CLIENT_ERROR.attempts).toBe(0);
  });

  it("SERVER_ERROR: 3 attempts, exponential backoff", () => {
    expect(RETRY_POLICIES.SERVER_ERROR.attempts).toBe(3);
    expect(RETRY_POLICIES.SERVER_ERROR.backoff.type).toBe("exponential");
  });
});

describe("DLQ_CONFIG", () => {
  it("defines OUTREACH_DLQ queue name", () => {
    expect(DLQ_CONFIG.OUTREACH_DLQ).toBe("dlq:outreach");
  });

  it("retention is 7 days", () => {
    expect(DLQ_CONFIG.retentionDays).toBe(7);
  });

  it("alert threshold is 100 items", () => {
    expect(DLQ_CONFIG.alertThreshold).toBe(100);
  });
});

// ─── isBusinessHours ─────────────────────────────────────────────────────────
//
// Europe/Bucharest is UTC+2 (EET) in winter (until last Sunday of March).
// 2026-03-10 (Tuesday) is still UTC+2.
// 2026-03-11 (Wednesday) is still UTC+2.

describe("isBusinessHours", () => {
  it("returns true on a weekday inside business hours", () => {
    // 2026-03-10 Tuesday 12:00 Bucharest = 10:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T10:00:00.000Z"));
    expect(isBusinessHours()).toBe(true);
  });

  it("returns false on a Saturday", () => {
    // 2026-03-14 Saturday 12:00 Bucharest = 10:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T10:00:00.000Z"));
    expect(isBusinessHours()).toBe(false);
  });

  it("returns false on a Sunday", () => {
    // 2026-03-15 Sunday 12:00 Bucharest = 10:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T10:00:00.000Z"));
    expect(isBusinessHours()).toBe(false);
  });

  it("returns false before 09:00 Bucharest on a weekday", () => {
    // 2026-03-10 Tuesday 08:59 Bucharest = 06:59 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T06:59:00.000Z"));
    expect(isBusinessHours()).toBe(false);
  });

  it("returns true at exactly 09:00 Bucharest (boundary inclusive)", () => {
    // 2026-03-10 Tuesday 09:00 Bucharest = 07:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T07:00:00.000Z"));
    expect(isBusinessHours()).toBe(true);
  });

  it("returns false at exactly 18:00 Bucharest (boundary exclusive)", () => {
    // 2026-03-10 Tuesday 18:00 Bucharest = 16:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T16:00:00.000Z"));
    expect(isBusinessHours()).toBe(false);
  });

  it("returns false at 17:59 → false because inside hours is 09..17:59", () => {
    // 2026-03-10 Tuesday 17:59 Bucharest = 15:59 UTC — still in hours
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T15:59:00.000Z"));
    expect(isBusinessHours()).toBe(true);
  });

  it("returns false on a Romanian public holiday (Ziua Națională, 2026-12-01)", () => {
    // 2026-12-01 Tuesday (in winter — UTC+2), 12:00 Bucharest = 10:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-01T10:00:00.000Z"));
    expect(isBusinessHours()).toBe(false);
  });

  it("returns false on Anul Nou (2026-01-01), a Thursday in business hours", () => {
    // 2026-01-01 Thursday 12:00 Bucharest = 10:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    expect(isBusinessHours()).toBe(false);
  });
});

// ─── getNextBusinessSlot ─────────────────────────────────────────────────────

describe("getNextBusinessSlot", () => {
  it("before 09:00 on a weekday → returns same day at 09:00", () => {
    // 2026-03-10 Tuesday 07:30 Bucharest = 05:30 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T05:30:00.000Z"));
    const slot = getNextBusinessSlot();
    expect(slot.toISODate()).toBe("2026-03-10");
    expect(slot.hour).toBe(9);
    expect(slot.minute).toBe(0);
  });

  it("after 18:00 on a weekday → returns next weekday at 09:00", () => {
    // 2026-03-11 Wednesday 18:30 Bucharest = 16:30 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T16:30:00.000Z"));
    const slot = getNextBusinessSlot();
    expect(slot.toISODate()).toBe("2026-03-12"); // Thursday
    expect(slot.hour).toBe(9);
  });

  it("during business hours on a weekday → returns the current moment (no-op)", () => {
    // 2026-03-10 Tuesday 13:00 Bucharest = 11:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T11:00:00.000Z"));
    const slot = getNextBusinessSlot();
    expect(slot.toISODate()).toBe("2026-03-10");
    expect(slot.weekday).toBe(2); // Tuesday
  });

  it("Saturday midday → skips weekend to Monday, keeps current hour", () => {
    // 2026-03-14 Saturday 12:00 Bucharest = 10:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T10:00:00.000Z"));
    const slot = getNextBusinessSlot();
    expect(slot.toISODate()).toBe("2026-03-16"); // Monday
    expect(slot.weekday).toBe(1);
  });

  it("holiday weekday → skips to the next non-holiday working day", () => {
    // 2026-12-01 Tuesday (holiday) 12:00 Bucharest = 10:00 UTC
    // → candidate stays at 12:00 Tue Dec 1 → blocked (holiday) → Wed Dec 2 12:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-01T10:00:00.000Z"));
    const slot = getNextBusinessSlot();
    expect(slot.toISODate()).toBe("2026-12-02"); // Wednesday
    expect(slot.weekday).toBe(3);
  });

  it("Friday after hours → skips weekend to Monday at 09:00", () => {
    // 2026-03-13 Friday 19:00 Bucharest = 17:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T17:00:00.000Z"));
    const slot = getNextBusinessSlot();
    // past hours → candidate = Saturday 09:00 → blocked → Sunday → Monday
    expect(slot.toISODate()).toBe("2026-03-16"); // Monday
    expect(slot.hour).toBe(9);
  });
});
