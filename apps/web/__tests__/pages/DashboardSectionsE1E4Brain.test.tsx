/**
 * Smoke: secțiuni dashboard E1–E4 + Brain — props Readonly, fără crash cu query-uri / date minime.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { DashboardE1Section } from "@/pages/dashboard/DashboardE1Section.js";
import { DashboardE2Section } from "@/pages/dashboard/DashboardE2Section.js";
import { DashboardE3Section } from "@/pages/dashboard/DashboardE3Section.js";
import { DashboardE4Section } from "@/pages/dashboard/DashboardE4Section.js";
import { DashboardBrainSection } from "@/pages/dashboard/DashboardBrainSection.js";
import type { OutreachDashboard } from "@/lib/etapa2-api.js";
import type {
  NegotiationStatsData,
  ProductStatsData,
  FiscalOblioStatsData,
  OrderStatsData,
  CreditStatsData,
  ContractStatsData,
  ShipmentStatsData,
  BrainCatalogPayload,
  BrainTopologyPayload,
} from "@/lib/unified-dashboard-api.js";

function okQuery<T>(data: T): UseQueryResult<{ data?: T }, Error> {
  return {
    isPending: false,
    isError: false,
    error: null,
    data: { data },
  } as UseQueryResult<{ data?: T }, Error>;
}

function pendingQuery<T>(): UseQueryResult<{ data?: T }, Error> {
  return {
    isPending: true,
    isError: false,
    error: null,
    data: undefined,
  } as UseQueryResult<{ data?: T }, Error>;
}

describe("DashboardE1Section", () => {
  it("afișează titlul Etapa 1", () => {
    render(
      <DashboardE1Section
        navigate={() => {}}
        statsData={{}}
        funnelChartData={[]}
        activity={[]}
        dailyStatsData={[]}
        dailyStatsQuery={
          { isPending: false, isError: false, error: null, data: {} } as UseQueryResult<
            unknown,
            Error
          >
        }
        activityQuery={
          { isPending: false, isError: false, error: null, data: {} } as UseQueryResult<
            unknown,
            Error
          >
        }
        bronzeTotal={0}
        silverTotal={0}
        goldTotal={0}
        errorsLast24h={0}
        errorsCritical={0}
        failingQueues={0}
      />,
    );
    expect(screen.getByRole("heading", { name: /Etapa 1 — enrichment/i })).toBeInTheDocument();
  });
});

describe("DashboardE2Section", () => {
  const outreach: OutreachDashboard = {
    kpis: {
      messagesSent: 1,
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
  };

  it("afișează titlul Etapa 2 și sursa outreach", () => {
    render(
      <DashboardE2Section
        navigate={() => {}}
        outreachQuery={okQuery(outreach)}
        sentimentBar={[{ label: "a", value: 1 }]}
        leadFunnelBar={[]}
      />,
    );
    expect(screen.getByRole("heading", { name: /Etapa 2 — outreach/i })).toBeInTheDocument();
    expect(screen.getByText(/GET \/api\/v1\/outreach\/dashboard/i)).toBeInTheDocument();
  });

  it("afișează spinner când outreach este pending", () => {
    const { container } = render(
      <DashboardE2Section
        navigate={() => {}}
        outreachQuery={pendingQuery<OutreachDashboard>()}
        sentimentBar={[]}
        leadFunnelBar={[]}
      />,
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });
});

describe("DashboardE3Section", () => {
  const neg: NegotiationStatsData = {
    byState: [],
    avgAiConfidence: "0.5",
    avgCloseProbability: "0.4",
  };
  const product: ProductStatsData = {
    products: { total: 1, active: 1, withEmbeddings: 0 },
    inventory: { totalSkus: 1, totalStock: 0, reserved: 0 },
  };
  const fiscal: FiscalOblioStatsData = {
    oblioByType: [],
    einvoice: { total: 0, validated: 0, pending: 0, rejected: 0 },
  };

  it("afișează titlul Etapa 3", () => {
    render(
      <DashboardE3Section
        negotiationQuery={okQuery(neg)}
        productQuery={okQuery(product)}
        fiscalQuery={okQuery(fiscal)}
        negotiationBars={[]}
      />,
    );
    expect(screen.getByRole("heading", { name: /Etapa 3 — AI sales/i })).toBeInTheDocument();
  });
});

describe("DashboardE4Section", () => {
  const orders: OrderStatsData = {
    byStatus: [],
    overdue: { count: 0, totalDue: "0" },
  };
  const credit: CreditStatsData = {
    byRisk: [],
    scoreStats: { avg: "0", min: 0, max: 0 },
  };
  const contracts: ContractStatsData = { byStatus: [], expiringIn7Days: 0 };
  const shipments: ShipmentStatsData = {
    byStatus: [],
    cod: { total: 0, collected: 0, codAmount: "0" },
  };

  it("afișează titlul Etapa 4 și surse contracte/livrări", () => {
    render(
      <DashboardE4Section
        orderQuery={okQuery(orders)}
        creditQuery={okQuery(credit)}
        contractQuery={okQuery(contracts)}
        shipmentQuery={okQuery(shipments)}
        orderBars={[]}
      />,
    );
    expect(screen.getByRole("heading", { name: /Etapa 4 — post-vânzare/i })).toBeInTheDocument();
    expect(screen.getByText(/GET \/api\/v1\/contracts\/stats/i)).toBeInTheDocument();
    expect(screen.getByText(/GET \/api\/v1\/shipments\/stats/i)).toBeInTheDocument();
  });
});

describe("DashboardBrainSection", () => {
  const topology: BrainTopologyPayload = {
    nodes: [],
    edges: [],
    metadata: {
      totalNeurons: 2,
      activeNeurons: 1,
      lastUpdated: "2026-01-01T00:00:00.000Z",
    },
  };
  const catalog: BrainCatalogPayload = {
    nodes: [],
    stats: {
      total: 5,
      skippedTotal: 0,
      skippedQueues: 0,
      byEtapa: { e1: 2, e2: 3 },
      bySwimlane: {},
      byNeuronType: {},
    },
  };

  it("afișează Cognitive Brain și rutele API", () => {
    render(
      <DashboardBrainSection
        navigate={() => {}}
        brainTopologyQuery={okQuery(topology)}
        brainCatalogQuery={okQuery(catalog)}
        brainByEtapaBar={[
          { label: "E1", value: 2 },
          { label: "E2", value: 3 },
        ]}
        brainCat={catalog.stats}
      />,
    );
    expect(screen.getByRole("heading", { name: /Cognitive Brain/i })).toBeInTheDocument();
    expect(screen.getByText(/GET \/api\/v1\/brain\/topology/i)).toBeInTheDocument();
    expect(screen.getByText(/GET \/api\/v1\/brain\/catalog/i)).toBeInTheDocument();
  });
});
