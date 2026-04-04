/**
 * Contract HTTP pentru modulul `etapa2-api` — sursa paginilor E2 (leads, sequences, …).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/lib/api.js";
import {
  fetchOutreachLeadById,
  fetchOutreachLeads,
  fetchOutreachDashboard,
  fetchOutreachSequences,
  fetchOutreachTemplates,
  fetchOutreachPhones,
  fetchOutreachCampaigns,
  fetchOutreachAnalytics,
} from "@/lib/etapa2-api.js";

describe("etapa2-api — căi /api/v1/outreach/*", () => {
  beforeEach(() => {
    vi.spyOn(api, "get").mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchOutreachLeads", async () => {
    await fetchOutreachLeads({ page: 1, limit: 10 });
    expect(api.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/outreach\/leads(\?|$)/),
    );
  });

  it("fetchOutreachLeadById", async () => {
    await fetchOutreachLeadById("lead-uuid-1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/leads/lead-uuid-1");
  });

  it("fetchOutreachDashboard", async () => {
    await fetchOutreachDashboard("7d");
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/dashboard?period=7d");
  });

  it("fetchOutreachSequences", async () => {
    await fetchOutreachSequences();
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/sequences");
  });

  it("fetchOutreachTemplates", async () => {
    await fetchOutreachTemplates();
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/templates");
  });

  it("fetchOutreachPhones", async () => {
    await fetchOutreachPhones();
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/phones");
  });

  it("fetchOutreachCampaigns", async () => {
    await fetchOutreachCampaigns();
    expect(api.get).toHaveBeenCalledWith("/api/v1/outreach/campaigns");
  });

  it("fetchOutreachAnalytics", async () => {
    await fetchOutreachAnalytics({ from: "2026-01-01", to: "2026-01-31" });
    expect(api.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/outreach\/analytics\/overview\?/),
    );
  });
});
