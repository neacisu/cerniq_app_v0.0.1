import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card.js";
import {
  fetchDashboardActivity,
  fetchDashboardDailyStats,
  fetchDashboardStats,
  type DashboardActivityItem,
} from "@/lib/etapa1-api.js";
import { FunnelChart } from "@/components/charts/FunnelChart.js";
import { BarTrendChart } from "@/components/charts/BarTrendChart.js";
import { LineTrendChart } from "@/components/charts/LineTrendChart.js";
import { GaugeChart } from "@/components/charts/GaugeChart.js";
import { StatsGrid } from "@/components/widgets/StatsGrid.js";
import { ActivityFeed } from "@/components/widgets/ActivityFeed.js";

function getActivityStatus(item: DashboardActivityItem): "error" | "warning" | "info" {
  const severity = (item.severity ?? "").toLowerCase();
  if (severity.includes("critical") || severity.includes("error")) return "error";
  if (item.type.includes("approval")) return "warning";
  return "info";
}

function getTrendValue(status: "error" | "warning" | "info"): number {
  if (status === "error") return 3;
  if (status === "warning") return 2;
  return 1;
}

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
  const activity = (activityQuery.data?.data ?? []).map((item: DashboardActivityItem) => ({
    status: getActivityStatus(item),
    text: item.message,
    time: new Date(item.timestamp).toLocaleString(),
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
    value: getTrendValue(item.status),
  }));
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
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
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
            <p className="py-4 text-center text-sm text-t3">Nu sunt date disponibile.</p>
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
              <span className="text-t3">Bronze → Silver</span>
              <span className="text-t1">
                {silverTotal > 0 && bronzeTotal > 0
                  ? `${Math.round((silverTotal / bronzeTotal) * 100)}%`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-t3">Silver → Gold</span>
              <span className="text-t1">
                {goldTotal > 0 && silverTotal > 0
                  ? `${Math.round((goldTotal / silverTotal) * 100)}%`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-t3">Total Pipeline</span>
              <span className="text-t1">
                {(bronzeTotal + silverTotal + goldTotal).toLocaleString("ro-RO")}
              </span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>HITL Approvals</CardTitle>
              <button
                type="button"
                onClick={() => navigate("/approvals")}
                className="text-xs text-b5 hover:underline"
              >
                View all →
              </button>
            </div>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-t3">Pending</span>
              <span className="flex items-center gap-1 text-t1">
                {Number((statsData.hitl as Record<string, unknown> | undefined)?.pending ?? 0) >
                  0 && <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />}
                {Number((statsData.hitl as Record<string, unknown> | undefined)?.pending ?? 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-t3">Resolved Today</span>
              <span className="text-t1">
                {Number(
                  (statsData.hitl as Record<string, unknown> | undefined)?.resolvedToday ?? 0,
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-t3">Overdue</span>
              <span className="flex items-center gap-1 text-t1">
                {Number((statsData.hitl as Record<string, unknown> | undefined)?.overdue ?? 0) >
                  0 && <span className="inline-block h-2 w-2 rounded-full bg-red-500" />}
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
            <div className="flex items-center gap-4">
              <GaugeChart
                value={Number(
                  (statsData.quality as Record<string, unknown> | undefined)?.avgScore ?? 0,
                )}
                size="sm"
              />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <span className="text-t3">Avg Quality Score</span>
                  <span className="text-t1">
                    {Number(
                      (statsData.quality as Record<string, unknown> | undefined)?.avgScore ?? 0,
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-t3">Eligible for Gold</span>
                  <span className="text-t1">
                    {Number(
                      (statsData.quality as Record<string, unknown> | undefined)?.eligible ?? 0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-t3">Blocked</span>
                  <span className="text-t1">
                    {Number(
                      (statsData.quality as Record<string, unknown> | undefined)?.blocked ?? 0,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
