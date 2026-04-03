import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner.js";
import { StatsGrid } from "@/components/widgets/StatsGrid.js";
import { SseLiveBadge } from "./SseLiveBadge.js";

export type DashboardKpiItem = {
  label: string;
  value: string;
  change: string;
  icon: string;
  color: string;
  path?: string;
};

export type DashboardHeaderProps = Readonly<{
  statsQueryError: unknown;
  e1Loading: boolean;
  sseConnected: boolean;
  crossStageKpis: readonly DashboardKpiItem[];
  dynamicKpis: readonly DashboardKpiItem[];
  onNavigate: (path: string) => void;
}>;

export function DashboardHeader(props: DashboardHeaderProps): ReactNode {
  const { statsQueryError, e1Loading, sseConnected, crossStageKpis, dynamicKpis, onNavigate } =
    props;

  return (
    <>
      {statsQueryError ? (
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er mb-4">
          Etapa 1 — statistici indisponibile:{" "}
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
              Panou general — surse încrucișate:{" "}
              <code className="font-mono">GET /api/v1/dashboard/*</code> (KPI E1 + SSE), apoi{" "}
              <code className="font-mono">/outreach/dashboard</code>,{" "}
              <code className="font-mono">/negotiation/stats</code>,{" "}
              <code className="font-mono">/orders/stats</code>, Brain, E5, …
            </p>
            {sseConnected ? (
              <SseLiveBadge />
            ) : (
              <span className="text-t3">
                KPI Etapa 1: polling ~30s (SSE indisponibil sau reconectare)
              </span>
            )}
          </div>
          <StatsGrid items={[...crossStageKpis]} onNavigate={onNavigate} />
          <div className="h-4" />
          <StatsGrid items={[...dynamicKpis]} onNavigate={onNavigate} />
        </>
      )}
    </>
  );
}
