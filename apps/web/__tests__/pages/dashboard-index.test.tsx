/**
 * Dashboard principal: KPI din GET /api/v1/dashboard/stats (inclusiv errors + pipeline).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import React from "react";

const statsPayload = {
  success: true as const,
  data: {
    bronze: { total: 10, pending: 1, processing: 0, promoted: 0 },
    silver: { total: 8, pending: 0, inProgress: 0, complete: 0, eligible: 2 },
    gold: { total: 4, cold: 1, engaged: 1, converted: 0 },
    approvals: { pending: 0, overdue: 0 },
    errors: { last24h: 3, critical: 1 },
    pipeline: { queueDepth: 42, failingQueues: 2 },
    hitl: { pending: 1, resolvedToday: 2, overdue: 0 },
    quality: { avgScore: 77.5, eligible: 3, blocked: 1 },
  },
};

vi.mock("@/lib/etapa1-api.js", () => ({
  fetchDashboardStats: vi.fn(() => Promise.resolve(statsPayload)),
  fetchDashboardActivity: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  fetchDashboardDailyStats: vi.fn(() =>
    Promise.resolve({ success: true, data: [], meta: { total: 0, limit: 30, offset: 0 } }),
  ),
}));

vi.mock("@/lib/etapa2-api.js", () => ({
  fetchOutreachDashboard: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        kpis: {
          messagesSent: 0,
          replies: 0,
          conversionRate: 0,
          activeSequences: 0,
          pendingReviews: 0,
        },
        channelPerformance: [],
        leadFunnel: [],
        sentimentDistribution: [],
        recentActivity: [],
        phones: [],
      },
    }),
  ),
}));

vi.mock("@/lib/unified-dashboard-api.js", () => ({
  fetchNegotiationStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: { byState: [], avgAiConfidence: "0", avgCloseProbability: "0" },
    }),
  ),
  fetchProductStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        products: { total: 0, active: 0, withEmbeddings: 0 },
        inventory: { totalSkus: 0, totalStock: 0, reserved: 0 },
      },
    }),
  ),
  fetchFiscalOblioStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        oblioByType: [],
        einvoice: { total: 0, validated: 0, pending: 0, rejected: 0 },
      },
    }),
  ),
  fetchOrderStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: { byStatus: [], overdue: { count: 0, totalDue: "0" } },
    }),
  ),
  fetchCreditStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: { byRisk: [], scoreStats: { avg: "0", min: 0, max: 0 } },
    }),
  ),
  fetchContractStats: vi.fn(() =>
    Promise.resolve({ success: true, data: { byStatus: [], expiringIn7Days: 0 } }),
  ),
  fetchShipmentStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: { byStatus: [], cod: { total: 0, collected: 0, codAmount: "0" } },
    }),
  ),
  fetchNurturingStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        byState: [],
        nps: { totalSent: 0, responded: 0, avgScore: "0" },
      },
    }),
  ),
  fetchChurnStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        byRisk: [],
        bySignalType: [],
        sentiment: { positive: 0, neutral: 0, negative: 0 },
      },
    }),
  ),
  fetchReferralStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: { byStatus: [], byType: [], consent: { total: 0, withConsent: 0 } },
    }),
  ),
  fetchGraphStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        clusters: {
          totalClusters: 0,
          avgMemberCount: "0",
          avgModularity: "0",
          kolCount: 0,
        },
        relationships: { totalRelationships: 0 },
      },
    }),
  ),
  fetchBrainCatalog: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        nodes: [],
        stats: {
          total: 0,
          skippedTotal: 0,
          skippedQueues: 0,
          byEtapa: {},
          bySwimlane: {},
          byNeuronType: {},
        },
      },
    }),
  ),
  fetchBrainTopologyGlobal: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        nodes: [],
        edges: [],
        metadata: {
          totalNeurons: 10,
          activeNeurons: 8,
          lastUpdated: new Date().toISOString(),
        },
      },
    }),
  ),
  fetchE5ComplianceAlertStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        byRiskLevel: [],
        summary: { atRiskCount: 0, churnedCount: 0, criticalCount: 0 },
      },
    }),
  ),
}));

import { Dashboard } from "@/pages/dashboard/index.js";

describe("Dashboard index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("afișează KPI errors și pipeline din stats", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText(/Erori pipeline \(24h\)/i)).toBeInTheDocument());
    expect(screen.getByText(/Erori pipeline \(24h\)/i).parentElement?.textContent).toContain("3");
    expect(screen.getByText(/Critice \(deschise\)/i).parentElement?.textContent).toContain("1");
    expect(screen.getByText(/Cozi cu joburi eșuate/i).parentElement?.textContent).toContain("2");
    expect(screen.getByText(/GET \/api\/v1\/dashboard\/stats/i)).toBeInTheDocument();
  });
});
