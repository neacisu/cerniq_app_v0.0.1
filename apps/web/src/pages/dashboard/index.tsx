import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card.js";
import {
  fetchDashboardActivity,
  fetchDashboardDailyStats,
  fetchDashboardStats,
} from "@/lib/etapa1-api.js";
import { FunnelChart } from "@/components/charts/FunnelChart.js";
import { BarTrendChart } from "@/components/charts/BarTrendChart.js";
import { LineTrendChart } from "@/components/charts/LineTrendChart.js";
import { StatsGrid } from "@/components/widgets/StatsGrid.js";
import { ActivityFeed } from "@/components/widgets/ActivityFeed.js";

const kpiTemplates = [
  {
    label: "Bronze Contacts",
    icon: "Database",
    color: "var(--color-tier-bronze)",
    path: "/etapa1/bronze",
  },
  {
    label: "Silver Companies",
    icon: "Building2",
    color: "var(--color-tier-silver)",
    path: "/etapa1/silver",
  },
  { label: "Gold Leads", icon: "Star", color: "var(--color-tier-gold)", path: "/etapa1/gold" },
  {
    label: "Queue Depth",
    icon: "TrendingUp",
    color: "var(--color-ok)",
    path: "/etapa1/enrichment-queues",
  },
];

export function Dashboard() {
  const navigate = useNavigate();
  const statsQuery = useQuery({
    queryKey: ["etapa1", "dashboard", "stats"],
    queryFn: fetchDashboardStats,
  });
  const activityQuery = useQuery({
    queryKey: ["etapa1", "dashboard", "activity"],
    queryFn: () => fetchDashboardActivity(20),
  });
  const dailyStatsQuery = useQuery({
    queryKey: ["etapa1", "dashboard", "daily-stats"],
    queryFn: () => fetchDashboardDailyStats({ days: 30 }),
  });
  const statsData = statsQuery.data?.data ?? {};
  const bronzeTotal = Number((statsData.bronze as Record<string, unknown> | undefined)?.total ?? 0);
  const silverTotal = Number((statsData.silver as Record<string, unknown> | undefined)?.total ?? 0);
  const goldTotal = Number((statsData.gold as Record<string, unknown> | undefined)?.total ?? 0);
  const queueDepth = Number(
    (statsData.pipeline as Record<string, unknown> | undefined)?.queueDepth ?? 0,
  );
  const dynamicKpis = [
    { ...kpiTemplates[0], value: bronzeTotal.toLocaleString("ro-RO"), change: "" },
    { ...kpiTemplates[1], value: silverTotal.toLocaleString("ro-RO"), change: "" },
    { ...kpiTemplates[2], value: goldTotal.toLocaleString("ro-RO"), change: "" },
    {
      ...kpiTemplates[3],
      value: queueDepth >= 1000 ? `${Math.round(queueDepth / 1000)}K` : String(queueDepth),
      change: "",
    },
  ];
  const activity = (activityQuery.data?.data ?? []).map((item: Record<string, unknown>) => ({
    status:
      String(item.severity).toLowerCase().includes("critical") ||
      String(item.severity).toLowerCase().includes("error")
        ? ("error" as const)
        : String(item.type).includes("approval")
          ? ("warning" as const)
          : ("info" as const),
    text: String(item.message ?? ""),
    time: new Date(String(item.timestamp)).toLocaleString(),
  }));
  const pipeline = [
    { label: "Bronze", value: bronzeTotal, color: "var(--color-tier-bronze)" },
    { label: "Silver", value: silverTotal, color: "var(--color-tier-silver)" },
    { label: "Gold", value: goldTotal, color: "var(--color-tier-gold)" },
    { label: "Queue Depth", value: queueDepth, color: "var(--color-in)" },
  ];
  const funnelChartData = pipeline.map((p) => ({ name: p.label, value: p.value, fill: p.color }));
  const activityTrendData = activity.slice(0, 8).map((item, i) => ({
    label: String(i + 1),
    value: item.status === "error" ? 3 : item.status === "warning" ? 2 : 1,
  }));
  const dailyStatsData = ((dailyStatsQuery.data?.data ?? []) as Array<Record<string, unknown>>)
    .sort((a, b) => String(a.statDate ?? "").localeCompare(String(b.statDate ?? "")))
    .map((row) => ({
      label: row.statDate
        ? new Date(String(row.statDate)).toLocaleDateString("ro-RO", {
            day: "2-digit",
            month: "short",
          })
        : "-",
      value: Number(row.enrichmentJobsCompleted ?? 0),
    }));

  if (statsQuery.isPending) {
    return (
      <PageWrapper title="Dashboard">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (statsQuery.isError) {
    return (
      <PageWrapper title="Dashboard">
        <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
          Eroare la încărcarea datelor: {statsQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Dashboard">
      <StatsGrid items={dynamicKpis} onNavigate={(path) => navigate(path)} />

      <div className="grid grid-cols-2 gap-4 mb-6 max-[1100px]:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardBody>
            <FunnelChart data={funnelChartData} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activitate Recentă</CardTitle>
          </CardHeader>
          <CardBody>
            <BarTrendChart data={activityTrendData} />
            <ActivityFeed items={activity} />
          </CardBody>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enrichment Jobs (30 zile)</CardTitle>
        </CardHeader>
        <CardBody>
          {dailyStatsData.length > 0 ? (
            <LineTrendChart data={dailyStatsData} />
          ) : (
            <p className="py-4 text-center text-sm text-[var(--color-t3)]">
              Nu sunt date disponibile.
            </p>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-3 gap-4 max-[1100px]:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stats</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-t3)]">Bronze → Silver</span>
              <span className="text-[var(--color-t1)]">
                {silverTotal > 0 && bronzeTotal > 0
                  ? `${Math.round((silverTotal / bronzeTotal) * 100)}%`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-t3)]">Silver → Gold</span>
              <span className="text-[var(--color-t1)]">
                {goldTotal > 0 && silverTotal > 0
                  ? `${Math.round((goldTotal / silverTotal) * 100)}%`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-t3)]">Total Pipeline</span>
              <span className="text-[var(--color-t1)]">
                {(bronzeTotal + silverTotal + goldTotal).toLocaleString("ro-RO")}
              </span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>HITL Approvals</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-t3)]">Pending</span>
              <span className="text-[var(--color-t1)]">
                {Number((statsData.hitl as Record<string, unknown> | undefined)?.pending ?? 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-t3)]">Resolved Today</span>
              <span className="text-[var(--color-t1)]">
                {Number(
                  (statsData.hitl as Record<string, unknown> | undefined)?.resolvedToday ?? 0,
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-t3)]">Overdue</span>
              <span className="text-[var(--color-t1)]">
                {Number((statsData.hitl as Record<string, unknown> | undefined)?.overdue ?? 0)}
              </span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Enrichment Quality</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-t3)]">Avg Quality Score</span>
              <span className="text-[var(--color-t1)]">
                {Number(
                  (statsData.quality as Record<string, unknown> | undefined)?.avgScore ?? 0,
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-t3)]">Eligible for Gold</span>
              <span className="text-[var(--color-t1)]">
                {Number((statsData.quality as Record<string, unknown> | undefined)?.eligible ?? 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-t3)]">Blocked</span>
              <span className="text-[var(--color-t1)]">
                {Number((statsData.quality as Record<string, unknown> | undefined)?.blocked ?? 0)}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
