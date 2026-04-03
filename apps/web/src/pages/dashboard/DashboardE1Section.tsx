import type { UseQueryResult } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card.js";
import { FunnelChart } from "@/components/charts/FunnelChart.js";
import { LineTrendChart } from "@/components/charts/LineTrendChart.js";
import { GaugeChart } from "@/components/charts/GaugeChart.js";
import { ActivityFeed } from "@/components/widgets/ActivityFeed.js";
import type { DashboardStatsPayload } from "@/types/api.js";
import { queryErrorDetail } from "./utils.js";

type ActivityRow = { status: "error" | "warning" | "info"; text: string; time: string };

export type DashboardE1SectionProps = Readonly<{
  navigate: (path: string) => void;
  statsData: Partial<DashboardStatsPayload>;
  funnelChartData: { name: string; value: number; fill: string }[];
  activity: ActivityRow[];
  dailyStatsData: { label: string; value: number }[];
  dailyStatsQuery: UseQueryResult<unknown, Error>;
  activityQuery: UseQueryResult<unknown, Error>;
  bronzeTotal: number;
  silverTotal: number;
  goldTotal: number;
  errorsLast24h: number;
  errorsCritical: number;
  failingQueues: number;
  /** Pagina dedicată Etapa 1 afișează grafice zilnice extinse; ascunde cardul duplicat „jobs completate”. */
  omitDailyEnrichmentCard?: boolean;
}>;

function E1QueryErrorBanner({
  prefix,
  isError,
  error,
}: Readonly<{ prefix: string; isError: boolean; error: Error | null }>) {
  if (!isError) {
    return null;
  }
  return (
    <div className="rounded-lg border border-wa/40 bg-wa/10 p-3 text-sm text-t2 mb-4">
      {prefix}: {queryErrorDetail(error, "eroare API")}
    </div>
  );
}

export function DashboardE1Section({
  navigate,
  statsData,
  funnelChartData,
  activity,
  dailyStatsData,
  dailyStatsQuery,
  activityQuery,
  bronzeTotal,
  silverTotal,
  goldTotal,
  errorsLast24h,
  errorsCritical,
  failingQueues,
  omitDailyEnrichmentCard = false,
}: DashboardE1SectionProps) {
  return (
    <>
      <E1QueryErrorBanner
        prefix="Activitate recentă indisponibilă"
        isError={activityQuery.isError}
        error={activityQuery.error}
      />
      <E1QueryErrorBanner
        prefix="Statistici zilnice indisponibile"
        isError={dailyStatsQuery.isError}
        error={dailyStatsQuery.error}
      />

      <h2 className="text-lg font-semibold text-t1 mt-8 mb-3">Etapa 1 — enrichment</h2>
      <div className="grid grid-cols-2 gap-4 mb-6 max-[1100px]:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline funnel</CardTitle>
          </CardHeader>
          <CardBody>
            <FunnelChart data={funnelChartData} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activitate recentă (pipeline)</CardTitle>
          </CardHeader>
          <CardBody>
            <ActivityFeed items={activity} />
          </CardBody>
        </Card>
      </div>

      {omitDailyEnrichmentCard ? null : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Enrichment jobs completate (30 zile)</CardTitle>
          </CardHeader>
          <CardBody>
            {dailyStatsData.length > 0 ? (
              <LineTrendChart data={dailyStatsData} />
            ) : (
              <p className="py-4 text-center text-sm text-t3">Nu există rânduri în daily_stats.</p>
            )}
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-[1100px]:grid-cols-1 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Conversii pipeline</CardTitle>
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
              <span className="text-t3">Total înregistrări</span>
              <span className="text-t1">
                {(bronzeTotal + silverTotal + goldTotal).toLocaleString("ro-RO")}
              </span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Erori &amp; cozi</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-t3">Erori pipeline (24h)</span>
              <span className="text-t1">{errorsLast24h}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-t3">Critice (deschise)</span>
              <span className="flex items-center gap-1 text-t1">
                {errorsCritical > 0 ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                ) : null}
                {errorsCritical}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-t3">Cozi cu joburi eșuate</span>
              <span className="text-t1">{failingQueues}</span>
            </div>
            <p className="text-[10px] text-t4 pt-1">
              Sursă: <code className="font-mono">GET /api/v1/dashboard/stats</code>
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>HITL approvals</CardTitle>
              <button
                type="button"
                onClick={() => navigate("/approvals")}
                className="text-xs text-b5 hover:underline"
              >
                Vezi toate →
              </button>
            </div>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-t3">În așteptare</span>
              <span className="text-t1">{Number(statsData.hitl?.pending ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-t3">Rezolvate azi</span>
              <span className="text-t1">{Number(statsData.hitl?.resolvedToday ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-t3">Depășite termen</span>
              <span className="text-t1">{Number(statsData.hitl?.overdue ?? 0)}</span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Calitate enrichment</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex items-center gap-4">
              <GaugeChart value={Number(statsData.quality?.avgScore ?? 0)} size="sm" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <span className="text-t3">Scor mediu</span>
                  <span className="text-t1">
                    {Number(statsData.quality?.avgScore ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-t3">Eligibile Gold</span>
                  <span className="text-t1">{Number(statsData.quality?.eligible ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-t3">Blocate</span>
                  <span className="text-t1">{Number(statsData.quality?.blocked ?? 0)}</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
