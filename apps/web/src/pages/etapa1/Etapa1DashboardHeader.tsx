import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner.js";
import { StatsGrid } from "@/components/widgets/StatsGrid.js";
import type { DashboardKpiItem } from "@/pages/dashboard/DashboardHeader.js";
import { SseLiveBadge } from "@/pages/dashboard/SseLiveBadge.js";

export type Etapa1DashboardHeaderProps = Readonly<{
  statsQueryError: unknown;
  e1Loading: boolean;
  sseConnected: boolean;
  quickNavKpis: readonly DashboardKpiItem[];
  pipelineKpis: readonly DashboardKpiItem[];
  onNavigate: (path: string) => void;
}>;

export function Etapa1DashboardHeader(props: Etapa1DashboardHeaderProps): ReactNode {
  const { statsQueryError, e1Loading, sseConnected, quickNavKpis, pipelineKpis, onNavigate } =
    props;

  return (
    <>
      {statsQueryError ? (
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er mb-4">
          Statistici Etapa 1 indisponibile:{" "}
          {statsQueryError instanceof Error ? statsQueryError.message : "eroare API"}
        </div>
      ) : null}

      {e1Loading ? (
        <div className="flex items-center justify-center py-8 mb-4">
          <Spinner size={32} />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 text-xs text-t4 mb-3">
            <p>
              Surse exclusive Etapa 1:{" "}
              <code className="font-mono">GET /api/v1/dashboard/stats</code>,{" "}
              <code className="font-mono">/activity</code>,{" "}
              <code className="font-mono">/daily-stats</code>, flux{" "}
              <code className="font-mono">/kpi-stream</code> (SSE ~15s) și{" "}
              <code className="font-mono">GET /api/v1/imports</code> (total loturi).
            </p>
            {sseConnected ? (
              <SseLiveBadge />
            ) : (
              <span className="text-t3">KPI: polling ~30s (SSE indisponibil sau reconectare)</span>
            )}
          </div>
          <p className="text-sm text-t3 mb-2">Acces rapid operațiuni enrichment</p>
          <StatsGrid items={[...quickNavKpis]} onNavigate={onNavigate} />
          <div className="h-4" />
          <p className="text-sm text-t3 mb-2">Stoc pipeline (din stats)</p>
          <StatsGrid items={[...pipelineKpis]} onNavigate={onNavigate} />
        </>
      )}
    </>
  );
}
