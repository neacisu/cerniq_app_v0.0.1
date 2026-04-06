/**
 * Paritate tip: fixture MSW dashboard stats respectă `DashboardStatsPayload` (aceleași chei ca API).
 */
import { describe, expect, it } from "vitest";
import type { DashboardStatsPayload } from "@/types/api.js";
import { MSW_DASHBOARD_STATS_FIXTURE } from "@/test-utils/msw/dashboard-stats-fixture.js";

describe("MSW_DASHBOARD_STATS_FIXTURE", () => {
  it("are toate câmpurile obligatorii din DashboardStatsPayload", () => {
    const f: DashboardStatsPayload = MSW_DASHBOARD_STATS_FIXTURE;
    expect(f.bronze).toMatchObject({
      total: expect.any(Number),
      pending: expect.any(Number),
      processing: expect.any(Number),
      promoted: expect.any(Number),
    });
    expect(f.silver).toMatchObject({
      total: expect.any(Number),
      pending: expect.any(Number),
      inProgress: expect.any(Number),
      complete: expect.any(Number),
      eligible: expect.any(Number),
    });
    expect(f.gold).toMatchObject({
      total: expect.any(Number),
      cold: expect.any(Number),
      engaged: expect.any(Number),
      converted: expect.any(Number),
    });
    expect(f.approvals).toMatchObject({ pending: expect.any(Number), overdue: expect.any(Number) });
    expect(f.errors).toMatchObject({ last24h: expect.any(Number), critical: expect.any(Number) });
    expect(f.pipeline).toMatchObject({
      queueDepth: expect.any(Number),
      failingQueues: expect.any(Number),
    });
    expect(f.hitl).toMatchObject({
      pending: expect.any(Number),
      resolvedToday: expect.any(Number),
      overdue: expect.any(Number),
    });
    expect(f.quality).toMatchObject({
      avgScore: expect.any(Number),
      eligible: expect.any(Number),
      blocked: expect.any(Number),
    });
  });
});
