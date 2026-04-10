/**
 * Contract HTTP pentru `etapa5-api`: nurturing, churn, graph, referrals, geo.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/lib/api.js";
import {
  fetchNurturingStates,
  postNurturingEvaluate,
  fetchChurnFactors,
  fetchChurnFactorsBatched,
  fetchChurnStats,
  postChurnEvaluate,
  fetchGraphKolProfiles,
  fetchGraphRelationships,
  fetchReferralsList,
  fetchGraphGeoSummary,
} from "@/lib/etapa5-api.js";

describe("etapa5-api — căi /api/v1/nurturing|churn|graph|referrals", () => {
  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ success: true, data: [] });
    vi.spyOn(api, "post").mockResolvedValue({ success: true, data: { jobId: "j1" } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchNurturingStates", async () => {
    await fetchNurturingStates({ isKol: true, page: 1 });
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining("/api/v1/nurturing/states?"));
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain("isKol=true");
  });

  it("postNurturingEvaluate", async () => {
    await postNurturingEvaluate("lead-1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/nurturing/states/lead-1/evaluate", {});
  });

  it("fetchChurnFactors", async () => {
    await fetchChurnFactors({ riskLevel: "HIGH" });
    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/churn\/factors\?/));
  });

  it("fetchChurnStats", async () => {
    await fetchChurnStats();
    expect(api.get).toHaveBeenCalledWith("/api/v1/churn/stats");
  });

  it("postChurnEvaluate", async () => {
    await postChurnEvaluate("L1", { force: true });
    expect(api.post).toHaveBeenCalledWith("/api/v1/churn/L1/evaluate", { force: true });
  });

  it("fetchGraphKolProfiles / fetchGraphRelationships / fetchGraphGeoSummary", async () => {
    await fetchGraphKolProfiles({ page: 2 });
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining("/api/v1/graph/kol-profiles?"));
    await fetchGraphRelationships();
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining("/api/v1/graph/relationships?"));
    await fetchGraphGeoSummary();
    expect(api.get).toHaveBeenCalledWith("/api/v1/graph/geo-summary");
  });

  it("fetchReferralsList", async () => {
    await fetchReferralsList({ status: "active", consentGiven: true });
    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/v1\/referrals\?/));
  });

  it("fetchChurnFactorsBatched agregă până la maxRows", async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: [{ id: "a" }],
      meta: { page: 1, limit: 100, total: 1, pages: 1 },
    });
    const rows = await fetchChurnFactorsBatched(50);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("a");
  });
});
