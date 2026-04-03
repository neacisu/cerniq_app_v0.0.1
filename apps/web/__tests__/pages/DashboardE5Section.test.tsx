/**
 * Smoke + structură secțiune E5: props Readonly, fără crash cu query-uri minime.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { DashboardE5Section } from "@/pages/dashboard/DashboardE5Section.js";
import type {
  NurturingStatsData,
  ChurnStatsData,
  E5ComplianceAlertStatsData,
  ReferralStatsData,
  GraphStatsData,
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

describe("DashboardE5Section", () => {
  const nurturing: NurturingStatsData = {
    byState: [{ currentState: "ACTIVE", count: 2, avgChurnScore: "0", avgRevenue: "0" }],
    nps: { totalSent: 1, responded: 0, avgScore: "0" },
  };
  const churn: ChurnStatsData = {
    byRisk: [{ riskLevel: "HIGH", count: 1, avgScore: "0.5" }],
    bySignalType: [],
    sentiment: { positive: 0, neutral: 1, negative: 0 },
  };
  const compliance: E5ComplianceAlertStatsData = {
    byRiskLevel: [{ riskLevel: "HIGH", count: 1 }],
    summary: { atRiskCount: 1, churnedCount: 0, criticalCount: 0 },
  };
  const referral: ReferralStatsData = {
    byStatus: [],
    byType: [],
    consent: { total: 3, withConsent: 2 },
  };
  const graph: GraphStatsData = {
    clusters: {
      totalClusters: 1,
      avgMemberCount: "2",
      avgModularity: "0",
      kolCount: 0,
    },
    relationships: { totalRelationships: 0 },
  };

  it("afișează titlul secțiunii și surse API", () => {
    render(
      <DashboardE5Section
        nurturingQuery={okQuery(nurturing)}
        churnQuery={okQuery(churn)}
        e5ComplianceQuery={okQuery(compliance)}
        referralQuery={okQuery(referral)}
        graphQuery={okQuery(graph)}
        churnRiskBars={[{ label: "HIGH", value: 1 }]}
        churnSentimentBar={[{ label: "neutru", value: 1 }]}
      />,
    );
    expect(screen.getByRole("heading", { name: /Etapa 5 — nurturing/i })).toBeInTheDocument();
    expect(screen.getAllByText(/GET \/api\/v1\/nurturing\/stats/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GET \/api\/v1\/churn\/stats/).length).toBeGreaterThan(0);
  });

  it("afișează spinner când nurturing este în pending", () => {
    const { container } = render(
      <DashboardE5Section
        nurturingQuery={pendingQuery<NurturingStatsData>()}
        churnQuery={okQuery(churn)}
        e5ComplianceQuery={okQuery(compliance)}
        referralQuery={okQuery(referral)}
        graphQuery={okQuery(graph)}
        churnRiskBars={[]}
        churnSentimentBar={[]}
      />,
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });
});
