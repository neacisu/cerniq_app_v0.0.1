/**
 * Dashboard dedicat Etapa 1: nu este re-export al paginii generale; folosește doar surse E1 + imports meta.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import React from "react";

const statsPayload = {
  success: true as const,
  data: {
    bronze: { total: 2, pending: 0, processing: 0, promoted: 0 },
    silver: { total: 1, pending: 0, inProgress: 0, complete: 0, eligible: 0 },
    gold: { total: 1, cold: 0, engaged: 0, converted: 0 },
    approvals: { pending: 0, overdue: 0 },
    errors: { last24h: 0, critical: 0 },
    pipeline: { queueDepth: 5, failingQueues: 0 },
    hitl: { pending: 1, resolvedToday: 0, overdue: 0 },
    quality: { avgScore: 80, eligible: 0, blocked: 0 },
  },
};

const dailyRow = {
  id: "1",
  tenantId: "t1",
  statDate: "2026-03-01T00:00:00.000Z",
  pipelineStage: "all",
  bronzeTotal: 1,
  silverTotal: 1,
  goldTotal: 1,
  avgQualityScore: "75.5",
  avgLeadScore: null,
  hitlPending: 2,
  hitlCompleted: 1,
  enrichmentJobsCompleted: 10,
  enrichmentJobsFailed: 1,
  createdAt: "2026-03-01T00:00:00.000Z",
};

vi.mock("@/hooks/use-dashboard-kpi-stream.js", () => ({
  useDashboardKpiStream: () => ({ sseConnected: false }),
}));

vi.mock("@/lib/etapa1-api.js", () => ({
  fetchDashboardStats: vi.fn(() => Promise.resolve(statsPayload)),
  fetchDashboardActivity: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  fetchDashboardDailyStats: vi.fn(() =>
    Promise.resolve({
      success: true,
      data: [dailyRow],
      meta: { total: 1, limit: 30, offset: 0 },
    }),
  ),
  fetchImports: vi.fn(() =>
    Promise.resolve({ success: true, data: [], meta: { total: 7, limit: 1, offset: 0 } }),
  ),
}));

import {
  fetchDashboardActivity,
  fetchDashboardDailyStats,
  fetchDashboardStats,
  fetchImports,
} from "@/lib/etapa1-api.js";
import { DashboardE1 } from "@/pages/etapa1/dashboard-e1.js";

describe("DashboardE1 (pagină dedicată Etapa 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("afișează titlul dedicat și secțiunea de analitică zilnică (nu este dashboard general)", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <DashboardE1 />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: /Dashboard Etapa 1 — Enrichment/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Analitică zilnică/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("heading", { name: /Etapa 2 — outreach/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Etapa 5/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Loturi import \(total\)/i).closest(".kc")).toHaveTextContent("7");

    expect(fetchDashboardStats).toHaveBeenCalled();
    expect(fetchDashboardActivity).toHaveBeenCalledWith(20);
    expect(fetchDashboardDailyStats).toHaveBeenCalledWith({ days: 30 });
    expect(fetchImports).toHaveBeenCalledWith({ limit: 1, offset: 0 });
  });
});
