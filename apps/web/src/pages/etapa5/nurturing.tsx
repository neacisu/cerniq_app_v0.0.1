import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { Card, CardHeader, CardTitle, CardBody, SBadge } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { cn } from "@/lib/utils.js";
import { messageFromUnknown } from "@/lib/api.js";
import { Phone, TrendingDown, MessageSquare } from "lucide-react";
import {
  fetchNurturingStates,
  postNurturingEvaluate,
  type NurturingStateListRow,
} from "@/lib/etapa5-api.js";

function formatMoneyEur(value: string | undefined): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value?.trim() || "—";
  if (n >= 1_000_000) return `€ ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `€ ${(n / 1000).toFixed(1)}K`;
  return `€ ${n.toFixed(0)}`;
}

function npsDisplay(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return String(score);
}

function npsColorClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return "text-t3";
  if (score >= 8) return "text-ok";
  if (score >= 5) return "text-wa";
  return "text-er";
}

function handleMessage(company: string) {
  toast.info(
    `Deschideți conversația din modulul de mesagerie pentru ${company} (nu este cablat aici).`,
  );
}

function nurturingNpsKpiValue(isLoading: boolean, avgNps: number | null): string {
  if (isLoading) return "…";
  if (avgNps === null) return "—";
  return String(avgNps);
}

function nextContactLabel(r: NurturingStateListRow): string {
  if (r.currentState === "AT_RISK") return "Prioritar";
  if (r.currentState === "CHURNED") return "—";
  return r.lastInteractionAt?.slice(0, 10) ?? "—";
}

type NurturingStatesBodyProps = Readonly<{
  isLoading: boolean;
  rows: NurturingStateListRow[];
  navigate: ReturnType<typeof useNavigate>;
  evalPending: boolean;
  onEvaluate: (leadId: string) => void;
}>;

function NurturingStatesTableBody({
  isLoading,
  rows,
  navigate,
  evalPending,
  onEvaluate,
}: NurturingStatesBodyProps) {
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
                  onClick={() => handleMessage(r.companyName ?? r.leadId)}
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

export function Nurturing() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listQuery = useQuery({
    queryKey: ["e5", "nurturing", "states", "list"],
    queryFn: () => fetchNurturingStates({ page: 1, limit: 100 }),
  });

  const evalMut = useMutation({
    mutationFn: (leadId: string) => postNurturingEvaluate(leadId),
    onSuccess: (res) => {
      toast.success(`Evaluare lifecycle în coadă: ${res.data.jobId}`);
      qc.invalidateQueries({ queryKey: ["e5", "nurturing"] }).catch(() => undefined);
    },
    onError: (e: unknown) => {
      toast.error(messageFromUnknown(e));
    },
  });

  const rows: NurturingStateListRow[] = listQuery.data?.data ?? [];
  const total = listQuery.data?.meta?.total ?? rows.length;

  const notChurned = rows.filter((r) => r.currentState !== "CHURNED").length;
  const revenues = rows.map((r) => Number(r.totalRevenue)).filter((n) => !Number.isNaN(n));
  const avgRev = revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0;
  const avgCltv = revenues.length > 0 ? formatMoneyEur(String(avgRev)) : "—";

  const npsScores = rows.map((r) => r.npsScore).filter((s): s is number => typeof s === "number");
  const avgNps =
    npsScores.length > 0
      ? Math.round(npsScores.reduce((a, b) => a + b, 0) / npsScores.length)
      : null;

  const churnedCount = rows.filter((r) => r.currentState === "CHURNED").length;
  const churnRate = rows.length > 0 ? ((churnedCount / rows.length) * 100).toFixed(1) : "0";

  return (
    <PageWrapper title="Retention — Monitorizare Clienți" actions={<EtapaBadge label="Etapa 5" />}>
      {listQuery.error ? (
        <div className="mb-4 text-sm text-er" role="alert">
          {listQuery.error instanceof Error ? listQuery.error.message : String(listQuery.error)}
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total DB (meta)"
          value={listQuery.isLoading ? "…" : String(total)}
          icon="Users"
          color="var(--color-b5)"
          delay={0}
        />
        <KpiCard
          label="Non-CHURNED (pag. 1)"
          value={listQuery.isLoading ? "…" : String(notChurned)}
          icon="Users"
          color="var(--color-ok)"
          delay={40}
        />
        <KpiCard
          label="NPS mediu (0–10, pag. 1)"
          value={nurturingNpsKpiValue(listQuery.isLoading, avgNps)}
          icon="Star"
          color="var(--color-neuron-feedback)"
          delay={80}
        />
        <KpiCard
          label="Churn în eșantion (pag. 1)"
          value={listQuery.isLoading ? "…" : `${churnRate}%`}
          icon="Activity"
          color="var(--color-er)"
          delay={120}
        />
      </div>
      {avgCltv === "—" ? null : (
        <p className="text-xs text-t3 mb-4">CLTV mediu în pagina curentă: {avgCltv}</p>
      )}

      <Card>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <CardTitle>Stări nurturing (gold_nurturing_state)</CardTitle>
            <Button
              size="sm"
              variant="outline"
              style={{ fontSize: 11, gap: 4 }}
              onClick={() => navigate("/nurturing/dashboard")}
            >
              Dashboard Complet →
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <NurturingStatesTableBody
            isLoading={listQuery.isLoading}
            rows={rows}
            navigate={navigate}
            evalPending={evalMut.isPending}
            onEvaluate={(leadId) => evalMut.mutate(leadId)}
          />
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
