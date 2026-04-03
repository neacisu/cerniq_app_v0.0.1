import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import {
  fetchDashboardActivity,
  fetchDashboardDailyStats,
  fetchDashboardStats,
  type DashboardActivityItem,
} from "@/lib/etapa1-api.js";
import { fetchOutreachDashboard } from "@/lib/etapa2-api.js";
import {
  fetchBrainCatalog,
  fetchBrainTopologyGlobal,
  fetchChurnStats,
  fetchContractStats,
  fetchCreditStats,
  fetchE5ComplianceAlertStats,
  fetchFiscalOblioStats,
  fetchGraphStats,
  fetchNegotiationStats,
  fetchNurturingStats,
  fetchOrderStats,
  fetchProductStats,
  fetchReferralStats,
  fetchShipmentStats,
} from "@/lib/unified-dashboard-api.js";
import type { DashboardStatsPayload } from "@/types/api.js";
import { useDashboardKpiStream } from "@/hooks/use-dashboard-kpi-stream.js";
import { LIVE_QUERY, e1KpiTemplates } from "./constants.js";
import { getActivityStatus } from "./utils.js";
import { DashboardHeader } from "./DashboardHeader.js";
import { DashboardE1Section } from "./DashboardE1Section.js";
import { DashboardE2Section } from "./DashboardE2Section.js";
import { DashboardE3Section } from "./DashboardE3Section.js";
import { DashboardE4Section } from "./DashboardE4Section.js";
import { DashboardE5Section } from "./DashboardE5Section.js";
import { DashboardBrainSection } from "./DashboardBrainSection.js";

export function Dashboard() {
  const navigate = useNavigate();
  const { sseConnected } = useDashboardKpiStream(true);

  const statsQuery = useQuery({
    queryKey: ["etapa1", "dashboard", "stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: sseConnected ? false : LIVE_QUERY.refetchInterval,
    staleTime: LIVE_QUERY.staleTime,
    retry: LIVE_QUERY.retry,
  });
  const activityQuery = useQuery({
    queryKey: ["etapa1", "dashboard", "activity"],
    queryFn: () => fetchDashboardActivity(20),
    ...LIVE_QUERY,
  });
  const dailyStatsQuery = useQuery({
    queryKey: ["etapa1", "dashboard", "daily-stats"],
    queryFn: () => fetchDashboardDailyStats({ days: 30 }),
    ...LIVE_QUERY,
  });

  const outreachQuery = useQuery({
    queryKey: ["dashboard", "outreach", "7d"],
    queryFn: () => fetchOutreachDashboard("7d"),
    ...LIVE_QUERY,
  });
  const negotiationQuery = useQuery({
    queryKey: ["dashboard", "negotiation", "stats"],
    queryFn: fetchNegotiationStats,
    ...LIVE_QUERY,
  });
  const productQuery = useQuery({
    queryKey: ["dashboard", "products", "stats"],
    queryFn: fetchProductStats,
    ...LIVE_QUERY,
  });
  const fiscalQuery = useQuery({
    queryKey: ["dashboard", "fiscal", "oblio", "stats"],
    queryFn: fetchFiscalOblioStats,
    ...LIVE_QUERY,
  });
  const orderQuery = useQuery({
    queryKey: ["dashboard", "orders", "stats"],
    queryFn: fetchOrderStats,
    ...LIVE_QUERY,
  });
  const creditQuery = useQuery({
    queryKey: ["dashboard", "credit", "stats"],
    queryFn: fetchCreditStats,
    ...LIVE_QUERY,
  });
  const contractQuery = useQuery({
    queryKey: ["dashboard", "contracts", "stats"],
    queryFn: fetchContractStats,
    ...LIVE_QUERY,
  });
  const shipmentQuery = useQuery({
    queryKey: ["dashboard", "shipments", "stats"],
    queryFn: fetchShipmentStats,
    ...LIVE_QUERY,
  });
  const nurturingQuery = useQuery({
    queryKey: ["dashboard", "nurturing", "stats"],
    queryFn: fetchNurturingStats,
    ...LIVE_QUERY,
  });
  const churnQuery = useQuery({
    queryKey: ["dashboard", "churn", "stats"],
    queryFn: fetchChurnStats,
    ...LIVE_QUERY,
  });
  const referralQuery = useQuery({
    queryKey: ["dashboard", "referrals", "stats"],
    queryFn: fetchReferralStats,
    ...LIVE_QUERY,
  });
  const graphQuery = useQuery({
    queryKey: ["dashboard", "graph", "stats"],
    queryFn: fetchGraphStats,
    ...LIVE_QUERY,
  });
  const e5ComplianceQuery = useQuery({
    queryKey: ["dashboard", "e5", "compliance", "stats"],
    queryFn: fetchE5ComplianceAlertStats,
    ...LIVE_QUERY,
  });
  const brainCatalogQuery = useQuery({
    queryKey: ["dashboard", "brain", "catalog"],
    queryFn: fetchBrainCatalog,
    staleTime: 300_000,
    retry: 1,
  });
  const brainTopologyQuery = useQuery({
    queryKey: ["dashboard", "brain", "topology"],
    queryFn: fetchBrainTopologyGlobal,
    ...LIVE_QUERY,
  });

  const statsData: Partial<DashboardStatsPayload> = statsQuery.data?.data ?? {};
  const bronzeTotal = Number(statsData.bronze?.total ?? 0);
  const silverTotal = Number(statsData.silver?.total ?? 0);
  const goldTotal = Number(statsData.gold?.total ?? 0);
  const queueDepth = Number(statsData.pipeline?.queueDepth ?? 0);
  const failingQueues = Number(statsData.pipeline?.failingQueues ?? 0);
  const errorsLast24h = Number(statsData.errors?.last24h ?? 0);
  const errorsCritical = Number(statsData.errors?.critical ?? 0);

  const dynamicKpis = [
    { ...e1KpiTemplates[0], value: bronzeTotal.toLocaleString("ro-RO"), change: "" },
    { ...e1KpiTemplates[1], value: silverTotal.toLocaleString("ro-RO"), change: "" },
    { ...e1KpiTemplates[2], value: goldTotal.toLocaleString("ro-RO"), change: "" },
    {
      ...e1KpiTemplates[3],
      value: queueDepth >= 1000 ? `${Math.round(queueDepth / 1000)}K` : String(queueDepth),
      change: "",
    },
  ];

  const activity = (activityQuery.data?.data ?? []).map((item: DashboardActivityItem) => ({
    status: getActivityStatus(item),
    text: item.message,
    time: new Date(item.timestamp).toLocaleString("ro-RO"),
  }));

  const pipeline = [
    { label: "Bronze", value: bronzeTotal, color: "var(--color-tier-bronze)" },
    { label: "Silver", value: silverTotal, color: "var(--color-tier-silver)" },
    { label: "Gold", value: goldTotal, color: "var(--color-tier-gold)" },
    { label: "Queue Depth", value: queueDepth, color: "var(--color-in)" },
  ];
  const funnelChartData = pipeline.map((p) => ({ name: p.label, value: p.value, fill: p.color }));

  const dailyStatsData = (dailyStatsQuery.data?.data ?? [])
    .sort((a, b) => (a.statDate ?? "").localeCompare(b.statDate ?? ""))
    .map((row) => ({
      label: row.statDate
        ? new Date(row.statDate).toLocaleDateString("ro-RO", {
            day: "2-digit",
            month: "short",
          })
        : "-",
      value: row.enrichmentJobsCompleted,
    }));

  const outreach = outreachQuery.data?.data;
  const sentimentBar =
    outreach?.sentimentDistribution.map((s) => ({
      label: s.category,
      value: s.count,
    })) ?? [];
  const leadFunnelBar = outreach?.leadFunnel.map((f) => ({ label: f.state, value: f.count })) ?? [];

  const neg = negotiationQuery.data?.data;
  const negotiationBars = neg?.byState.map((r) => ({ label: r.state, value: r.count })) ?? [];

  const orders = orderQuery.data?.data;
  const orderBars = orders?.byStatus.map((r) => ({ label: r.status, value: r.count })) ?? [];
  const ordersTotalCount = orders?.byStatus.reduce((a, r) => a + r.count, 0) ?? 0;

  const churn = churnQuery.data?.data;
  const churnRiskBars =
    churn?.byRisk.map((r) => ({
      label: r.riskLevel ?? "—",
      value: r.count,
    })) ?? [];
  const churnSentimentBar = churn
    ? [
        { label: "pozitiv", value: churn.sentiment.positive },
        { label: "neutru", value: churn.sentiment.neutral },
        { label: "negativ", value: churn.sentiment.negative },
      ]
    : [];

  const brainCat = brainCatalogQuery.data?.data?.stats;
  const brainByEtapaBar = brainCat
    ? Object.entries(brainCat.byEtapa).map(([k, v]) => ({ label: k.toUpperCase(), value: v }))
    : [];

  const negTotal =
    negotiationBars.length > 0 ? negotiationBars.reduce((a, b) => a + b.value, 0) : 0;
  const brainMeta = brainTopologyQuery.data?.data?.metadata;

  let brainKpiDisplay = "—";
  if (brainTopologyQuery.isPending) brainKpiDisplay = "…";
  else if (brainMeta != null) {
    brainKpiDisplay = `${brainMeta.activeNeurons}/${brainMeta.totalNeurons}`;
  }

  const crossStageKpis = [
    {
      label: "Outreach mesaje (7z)",
      icon: "Send",
      color: "var(--color-b5)",
      path: "/outreach/dashboard",
      value: outreachQuery.isPending
        ? "…"
        : (outreach?.kpis.messagesSent ?? 0).toLocaleString("ro-RO"),
      change: "",
    },
    {
      label: "Negocieri (total)",
      icon: "MessagesSquare",
      color: "var(--color-b5)",
      path: "/negotiations",
      value: negotiationQuery.isPending ? "…" : negTotal.toLocaleString("ro-RO"),
      change: "",
    },
    {
      label: "Comenzi (total)",
      icon: "ShoppingCart",
      color: "var(--color-b5)",
      path: "/orders/board",
      value: orderQuery.isPending ? "…" : ordersTotalCount.toLocaleString("ro-RO"),
      change: "",
    },
    {
      label: "Neuroni activi (Brain)",
      icon: "Brain",
      color: "var(--color-b5)",
      path: "/brain",
      value: brainKpiDisplay,
      change: "",
    },
  ];

  const e1Loading = statsQuery.isPending;

  return (
    <PageWrapper
      title="Dashboard general"
      subtitle="Vedere transversală pe Etapa 1–5, Cognitive Brain și indicatori încrucișați. Pentru operațiuni detaliate numai pe enrichment, folosiți Dashboard Etapa 1 din meniu. KPI Etapa 1: SSE /api/v1/dashboard/kpi-stream (~15s) + React Query; celelalte secțiuni ~30s polling."
    >
      <DashboardHeader
        statsQueryError={statsQuery.isError ? statsQuery.error : null}
        e1Loading={e1Loading}
        sseConnected={sseConnected}
        crossStageKpis={crossStageKpis}
        dynamicKpis={dynamicKpis}
        onNavigate={(path) => navigate(path)}
      />

      {!e1Loading && (
        <>
          <DashboardE1Section
            navigate={navigate}
            statsData={statsData}
            funnelChartData={funnelChartData}
            activity={activity}
            dailyStatsData={dailyStatsData}
            dailyStatsQuery={dailyStatsQuery}
            activityQuery={activityQuery}
            bronzeTotal={bronzeTotal}
            silverTotal={silverTotal}
            goldTotal={goldTotal}
            errorsLast24h={errorsLast24h}
            errorsCritical={errorsCritical}
            failingQueues={failingQueues}
          />
          <DashboardE2Section
            navigate={navigate}
            outreachQuery={outreachQuery}
            sentimentBar={sentimentBar}
            leadFunnelBar={leadFunnelBar}
          />
          <DashboardE3Section
            negotiationQuery={negotiationQuery}
            productQuery={productQuery}
            fiscalQuery={fiscalQuery}
            negotiationBars={negotiationBars}
          />
          <DashboardE4Section
            orderQuery={orderQuery}
            creditQuery={creditQuery}
            contractQuery={contractQuery}
            shipmentQuery={shipmentQuery}
            orderBars={orderBars}
          />
          <DashboardE5Section
            nurturingQuery={nurturingQuery}
            churnQuery={churnQuery}
            e5ComplianceQuery={e5ComplianceQuery}
            referralQuery={referralQuery}
            graphQuery={graphQuery}
            churnRiskBars={churnRiskBars}
            churnSentimentBar={churnSentimentBar}
          />
          <DashboardBrainSection
            navigate={navigate}
            brainTopologyQuery={brainTopologyQuery}
            brainCatalogQuery={brainCatalogQuery}
            brainByEtapaBar={brainByEtapaBar}
            brainCat={brainCat}
          />
        </>
      )}
    </PageWrapper>
  );
}
