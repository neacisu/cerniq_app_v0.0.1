import type { NavigateFunction } from "react-router-dom";
import { Phone, TrendingDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { SBadge } from "@/components/ui/index.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { cn } from "@/lib/utils.js";
import type { NurturingStateListRow } from "@/lib/etapa5-api.js";
import {
  formatMoneyEur,
  npsColorClass,
  npsDisplay,
  handleNurturingTableMessage,
  nextContactLabel,
} from "@/components/etapa5/nurturing-display-utils.js";

export type NurturingStatesTableBodyProps = Readonly<{
  isLoading: boolean;
  rows: NurturingStateListRow[];
  navigate: NavigateFunction;
  evalPending: boolean;
  onEvaluate: (leadId: string) => void;
}>;

export function NurturingStatesTableBody({
  isLoading,
  rows,
  navigate,
  evalPending,
  onEvaluate,
}: NurturingStatesTableBodyProps) {
  if (isLoading) {
    return <div className="p-6 text-sm text-t3">Se încarcă…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="p-6 text-sm text-t3">
        Nu există rânduri nurturing pentru tenant. Rulați workerii E5 sau adăugați lead-uri în Gold.
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-s700 text-left text-t3">
          <th className="px-5 py-3">Client</th>
          <th className="px-5 py-3">Stare FSM</th>
          <th className="px-5 py-3">NPS</th>
          <th className="px-5 py-3">CLTV</th>
          <th className="px-5 py-3">Churn risk</th>
          <th className="px-5 py-3">Ultima interacțiune</th>
          <th className="px-5 py-3">Acțiuni</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-s700 last:border-0 hover:bg-s800/50">
            <td className="px-5 py-3 font-medium text-t1">{r.companyName?.trim() || "—"}</td>
            <td className="px-5 py-3">
              <SBadge status={r.currentState} />
            </td>
            <td className={cn("px-5 py-3 font-semibold", npsColorClass(r.npsScore))}>
              {npsDisplay(r.npsScore)}
            </td>
            <td className="px-5 py-3 font-mono text-t2">{formatMoneyEur(r.totalRevenue)}</td>
            <td className="px-5 py-3 w-28">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ProgressBar value={r.churnRiskScore} />
                <span
                  style={{
                    fontSize: 10,
                    color: r.churnRiskScore > 60 ? "var(--color-er)" : "var(--color-t3)",
                    minWidth: 28,
                  }}
                >
                  {r.churnRiskScore}%
                </span>
              </div>
            </td>
            <td
              className={cn(
                "px-5 py-3",
                nextContactLabel(r) === "Prioritar" && "text-er font-semibold",
              )}
            >
              {nextContactLabel(r)}
            </td>
            <td className="px-5 py-3">
              <span className="flex gap-1">
                {r.currentState === "AT_RISK" && (
                  <Button
                    size="sm"
                    variant="brand"
                    style={{ fontSize: 10, gap: 3 }}
                    title="Re-evaluează lifecycle"
                    disabled={evalPending}
                    onClick={() => onEvaluate(r.leadId)}
                  >
                    <Phone size={10} /> Evaluare
                  </Button>
                )}
                {r.currentState === "CHURNED" && (
                  <Button
                    size="sm"
                    style={{ fontSize: 10, gap: 3 }}
                    title="Deschide pagina churn"
                    onClick={() => navigate("/churn")}
                  >
                    <TrendingDown size={10} /> Churn
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  style={{ fontSize: 10 }}
                  title="Mesaj"
                  onClick={() => handleNurturingTableMessage(r.companyName ?? r.leadId)}
                >
                  <MessageSquare size={12} />
                </Button>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
