import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import {
  fetchDashboardActivity,
  fetchDashboardDailyStats,
  fetchDashboardStats,
  fetchImports,
  type DashboardActivityItem,
} from "@/lib/etapa1-api.js";
import type { DashboardStatsPayload } from "@/types/api.js";
import { useDashboardKpiStream } from "@/hooks/use-dashboard-kpi-stream.js";
import { LIVE_QUERY, e1KpiTemplates } from "@/pages/dashboard/constants.js";
import { getActivityStatus } from "@/pages/dashboard/utils.js";
import { DashboardE1Section } from "@/pages/dashboard/DashboardE1Section.js";
import type { DashboardKpiItem } from "@/pages/dashboard/DashboardHeader.js";
import { Etapa1DashboardHeader } from "./Etapa1DashboardHeader.js";
import { Etapa1OperationalCharts } from "./Etapa1OperationalCharts.js";

type ImportsListEnvelope = Readonly<{
  success?: boolean;
  data?: unknown[];
  meta?: { total?: number };
}>;

function buildEtapa1QuickNavKpis(
  importsQuery: UseQueryResult<ImportsListEnvelope, Error>,
  totals: Readonly<{
    bronzeTotal: number;
    silverTotal: number;
    goldTotal: number;
    queueDepth: number;
    failingQueues: number;
    hitlPending: number;
    errorsLast24h: number;
    approvalsOverdue: number;
  }>,
): DashboardKpiItem[] {
  let importsDisplay: string;
  if (importsQuery.isPending) {
    importsDisplay = "…";
  } else if (importsQuery.isError) {
    importsDisplay = "—";
  } else {
    importsDisplay = String(importsQuery.data?.meta?.total ?? 0);
  }

  return [
    {
      label: "Loturi import (total)",
      value: importsDisplay,
      change: "",
      icon: "Upload",
      color: "var(--color-b5)",
      path: "/import",
    },
    {
      label: "Bronze contacts",
      value: totals.bronzeTotal.toLocaleString("ro-RO"),
      change: "",
      icon: "Database",
      color: "var(--color-tier-bronze)",
      path: "/bronze",
    },
    {
      label: "Silver companies",
      value: totals.silverTotal.toLocaleString("ro-RO"),
      change: "",
      icon: "Building2",
      color: "var(--color-tier-silver)",
      path: "/silver",
    },
    {
      label: "Gold leads",
      value: totals.goldTotal.toLocaleString("ro-RO"),
      change: "",
      icon: "Star",
      color: "var(--color-tier-gold)",
      path: "/gold",
    },
    {
      label: "HITL în așteptare",
      value: String(totals.hitlPending),
      change: "",
      icon: "ClipboardList",
      color: "var(--color-wa)",
      path: "/approvals",
    },
    {
      label: "Approvals depășite",
      value: String(totals.approvalsOverdue),
      change: "",
      icon: "AlertCircle",
      color: "var(--color-er)",
      path: "/approvals",
    },
    {
      label: "Queue depth",
      value:
        totals.queueDepth >= 1000
          ? `${Math.round(totals.queueDepth / 1000)}K`
          : String(totals.queueDepth),
      change: "",
      icon: "ListTodo",
      color: "var(--color-in)",
      path: "/enrichment/queue",
    },
    {
      label: "Cozi cu joburi eșuate",
      value: String(totals.failingQueues),
      change: "",
      icon: "Flame",
      color: "var(--color-er)",
      path: "/enrichment/queue",
    },
    {
      label: "Erori pipeline (24h)",
      value: String(totals.errorsLast24h),
      change: "",
      icon: "Activity",
      color: "var(--color-wa)",
      path: "/enrichment/logs",
    },
  ];
}

function buildEtapa1PipelineKpis(
  bronzeTotal: number,
  silverTotal: number,
  goldTotal: number,
  queueDepth: number,
): DashboardKpiItem[] {
  return [
    { ...e1KpiTemplates[0], value: bronzeTotal.toLocaleString("ro-RO"), change: "" },
    { ...e1KpiTemplates[1], value: silverTotal.toLocaleString("ro-RO"), change: "" },
    { ...e1KpiTemplates[2], value: goldTotal.toLocaleString("ro-RO"), change: "" },
    {
      ...e1KpiTemplates[3],
      value: queueDepth >= 1000 ? `${Math.round(queueDepth / 1000)}K` : String(queueDepth),
      change: "",
    },
  ];
}

export function DashboardE1() {
  const navigate = useNavigate();
  const { sseConnected } = useDashboardKpiStream(true);

  /** Aceleași chei ca `/dashboard` + `useDashboardKpiStream` (cache partajat, SSE invalidă ambele pagini). */
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

  const importsQuery = useQuery({
    queryKey: ["etapa1", "dashboard", "imports-meta"],
    queryFn: () => fetchImports({ limit: 1, offset: 0 }),
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
  const hitlPending = Number(statsData.hitl?.pending ?? 0);
  const approvalsOverdue = Number(statsData.approvals?.overdue ?? 0);

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

  const e1Loading = statsQuery.isPending;

  const quickNavKpis = buildEtapa1QuickNavKpis(importsQuery, {
    bronzeTotal,
    silverTotal,
    goldTotal,
    queueDepth,
    failingQueues,
    hitlPending,
    errorsLast24h,
    approvalsOverdue,
  });
  const pipelineKpis = buildEtapa1PipelineKpis(bronzeTotal, silverTotal, goldTotal, queueDepth);

  return (
    <PageWrapper
      title="Dashboard Etapa 1 — Enrichment"
      subtitle="Panou specializat: doar pipeline-ul Etapa 1 (import → bronze → silver → gold), HITL, cozi și calitate. Date din endpoint-urile /api/v1/dashboard/* și total loturi din /api/v1/imports; KPI-urile principale se actualizează prin SSE /kpi-stream (~15s) când conexiunea este activă, altfel polling ~30s."
    >
      <Etapa1DashboardHeader
        statsQueryError={statsQuery.isError ? statsQuery.error : null}
        e1Loading={e1Loading}
        sseConnected={sseConnected}
        quickNavKpis={quickNavKpis}
        pipelineKpis={pipelineKpis}
        onNavigate={(path) => navigate(path)}
      />

      {!e1Loading && (
        <>
          <Etapa1OperationalCharts dailyStatsQuery={dailyStatsQuery} />
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
            omitDailyEnrichmentCard
          />
        </>
      )}
    </PageWrapper>
  );
}
