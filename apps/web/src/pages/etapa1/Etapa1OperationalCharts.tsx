import type { UseQueryResult } from "@tanstack/react-query";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Spinner } from "@/components/ui/spinner.js";
import { LineTrendChart } from "@/components/charts/LineTrendChart.js";
import { LineTrendDualChart } from "@/components/charts/LineTrendDualChart.js";
import type { DailyStatRow } from "@/lib/etapa1-api.js";
import { queryErrorMessage, sectionError } from "@/pages/dashboard/utils.js";

type DailyStatsEnvelope = Readonly<{
  success?: boolean;
  data?: DailyStatRow[];
  meta?: { total?: number; limit?: number; offset?: number };
}>;

function sortDailyRows(rows: readonly DailyStatRow[]): DailyStatRow[] {
  return [...rows].sort((a, b) => (a.statDate ?? "").localeCompare(b.statDate ?? ""));
}

function dayLabel(statDate: string | undefined): string {
  if (!statDate) return "—";
  return new Date(statDate).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
}

export type Etapa1OperationalChartsProps = Readonly<{
  dailyStatsQuery: UseQueryResult<DailyStatsEnvelope, Error>;
}>;

export function Etapa1OperationalCharts({ dailyStatsQuery }: Etapa1OperationalChartsProps) {
  if (dailyStatsQuery.isPending) {
    return (
      <div className="flex justify-center py-12 mb-6">
        <Spinner size={32} />
      </div>
    );
  }

  if (dailyStatsQuery.isError) {
    return (
      <div
        className="mb-6 rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er"
        role="alert"
      >
        Grafice zilnice: {queryErrorMessage(dailyStatsQuery.error)}
      </div>
    );
  }

  const sorted = sortDailyRows(dailyStatsQuery.data?.data ?? []);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-t3 mb-6">
        Nu există rânduri în <code className="font-mono">daily_stats</code> pentru graficele
        operaționale.
      </p>
    );
  }

  const enrichmentDual = sorted.map((row) => ({
    label: dayLabel(row.statDate),
    primary: row.enrichmentJobsCompleted,
    secondary: row.enrichmentJobsFailed,
  }));

  const hitlDual = sorted.map((row) => ({
    label: dayLabel(row.statDate),
    primary: row.hitlPending,
    secondary: row.hitlCompleted,
  }));

  const qualityLine = sorted.map((row) => ({
    label: dayLabel(row.statDate),
    value: Math.round(Number(row.avgQualityScore ?? 0) * 10) / 10,
  }));

  return (
    <section className="space-y-4 mb-8" aria-label="Grafice operaționale zilnice Etapa 1">
      <h2 className="text-lg font-semibold text-t1">Analitică zilnică (date reale, 30 zile)</h2>
      <p className="text-xs text-t4 -mt-1 mb-2">
        Agregări din <code className="font-mono">GET /api/v1/dashboard/daily-stats</code> — jobs
        enrichment, HITL și scor calitate mediu.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Enrichment: completate vs eșuate</CardTitle>
          </CardHeader>
          <CardBody>
            {enrichmentDual.some((p) => p.primary > 0 || p.secondary > 0) ? (
              <LineTrendDualChart
                data={enrichmentDual}
                primaryName="Completate"
                secondaryName="Eșuate"
              />
            ) : (
              sectionError("Toate valorile sunt zero în interval.")
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>HITL: în așteptare vs completate</CardTitle>
          </CardHeader>
          <CardBody>
            {hitlDual.some((p) => p.primary > 0 || p.secondary > 0) ? (
              <LineTrendDualChart
                data={hitlDual}
                primaryName="În așteptare"
                secondaryName="Completate"
                primaryColor="var(--color-wa)"
                secondaryColor="var(--color-ok)"
              />
            ) : (
              sectionError("Fără activitate HITL în interval.")
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scor calitate mediu (zilnic)</CardTitle>
        </CardHeader>
        <CardBody>
          {qualityLine.some((p) => p.value > 0) ? (
            <LineTrendChart data={qualityLine} />
          ) : (
            <p className="text-sm text-t3 py-4 text-center">
              Fără scoruri de calitate în interval.
            </p>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
