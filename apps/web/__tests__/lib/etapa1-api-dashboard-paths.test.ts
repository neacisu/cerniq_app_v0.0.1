/**
 * Contract: funcțiile folosite de dashboard E1 și dashboard general (secțiunea E1) apelează
 * prefixul corect /api/v1/dashboard/* și /api/v1/imports (fără presupuneri de mock în pagini).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/lib/api.js";
import {
  fetchDashboardStats,
  fetchDashboardActivity,
  fetchDashboardDailyStats,
  fetchImports,
} from "@/lib/etapa1-api.js";

describe("etapa1-api — căi HTTP dashboard + meta importuri", () => {
  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchDashboardStats → GET /api/v1/dashboard/stats", async () => {
    await fetchDashboardStats();
    expect(api.get).toHaveBeenCalledWith("/api/v1/dashboard/stats");
  });

  it("fetchDashboardActivity → GET /api/v1/dashboard/activity?limit=", async () => {
    await fetchDashboardActivity(20);
    expect(api.get).toHaveBeenCalledWith("/api/v1/dashboard/activity?limit=20");
  });

  it("fetchDashboardDailyStats → GET /api/v1/dashboard/daily-stats", async () => {
    await fetchDashboardDailyStats({ days: 30 });
    expect(api.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/dashboard\/daily-stats\?/),
    );
    const call = vi.mocked(api.get).mock.calls[0]?.[0];
    expect(call).toContain("days=30");
  });

  it("fetchImports → GET /api/v1/imports?", async () => {
    await fetchImports({ limit: 1, offset: 0 });
    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/imports\?/));
  });
});
