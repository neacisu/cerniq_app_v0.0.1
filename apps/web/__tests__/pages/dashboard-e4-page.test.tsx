import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardE4 } from "@/pages/etapa4/dashboard-e4.js";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/use-etapa4.js", () => ({
  usePostsaleDashboard: () => ({
    data: {
      orders: {
        data: {
          byStatus: [{ status: "CREDIT_PENDING", count: 2 }],
          overdue: { count: 0, totalDue: "0" },
        },
      },
      credit: {
        data: {
          byRisk: [{ riskTier: "LOW", count: 5, totalLimit: "0", totalUsed: "0" }],
          scoreStats: { avg: "72.5", min: 0, max: 100 },
        },
      },
      ship: {
        data: {
          byStatus: [
            { status: "IN_TRANSIT", count: 3 },
            { status: "DELIVERED", count: 10 },
          ],
          cod: { total: 0, collected: 0, codAmount: "0" },
        },
      },
      paySum: {
        data: {
          todayPaymentsCount: 4,
          todayPaymentsTotal: "1200",
          dailyVolume: [{ day: "2026-04-01", totalAmount: "100", count: 1 }],
          meta: { days: 30, source: "gold.payments" },
        },
      },
    },
    isLoading: false,
    error: null,
  }),
  usePostsaleActivityFeed: () => ({
    data: [
      {
        id: "pay-1",
        type: "PAYMENT" as const,
        title: "Plată RON 10",
        subtitle: "Firma X",
        at: "2026-04-09T10:00:00Z",
      },
    ],
    isLoading: false,
  }),
}));

describe("DashboardE4", () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("renderează titlul și KPI-uri", () => {
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <DashboardE4 />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Dashboard Post-vânzare/i)).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
