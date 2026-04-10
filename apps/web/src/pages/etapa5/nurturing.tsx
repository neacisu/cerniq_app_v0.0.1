import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { messageFromUnknown } from "@/lib/api.js";
import { KolGraph } from "@/components/etapa5/KolGraph.js";
import { NpsGauge } from "@/components/etapa5/NpsGauge.js";
import { NurturingStatesTableBody } from "@/components/etapa5/NurturingStatesTableBody.js";
import { deriveNpsIndexFromAvg10 } from "@/components/etapa5/nps-gauge-utils.js";
import { formatMoneyEur } from "@/components/etapa5/nurturing-display-utils.js";
import { voidAsyncHandler } from "@/lib/void-async-handlers.js";
import {
  fetchGraphKolProfiles,
  fetchGraphRelationships,
  fetchNurturingStates,
  postNurturingEvaluate,
  type NurturingStateListRow,
} from "@/lib/etapa5-api.js";

function nurturingNpsKpiValue(isLoading: boolean, avgNps: number | null): string {
  if (isLoading) return "…";
  if (avgNps === null) return "—";
  return String(avgNps);
}

export function Nurturing() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [kolSelectedId, setKolSelectedId] = useState<string | null>(null);
  const listQuery = useQuery({
    queryKey: ["e5", "nurturing", "states", "list"],
    queryFn: () => fetchNurturingStates({ page: 1, limit: 100 }),
  });

  const kolQ = useQuery({
    queryKey: ["e5", "referrals-page", "kol-profiles"],
    queryFn: () => fetchGraphKolProfiles({ page: 1, limit: 100 }),
  });
  const relQ = useQuery({
    queryKey: ["e5", "referrals-page", "relationships"],
    queryFn: () => fetchGraphRelationships({ page: 1, limit: 500 }),
    enabled: (kolQ.data?.data.length ?? 0) > 0,
  });

  const evalMut = useMutation({
    mutationFn: (leadId: string) => postNurturingEvaluate(leadId),
    onSuccess: (res) => {
      toast.success(`Evaluare lifecycle în coadă: ${res.data.jobId}`);
      qc.invalidateQueries({ queryKey: ["e5", "nurturing"] }).catch(voidAsyncHandler);
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

  const npsGaugeValue = avgNps === null ? 0 : deriveNpsIndexFromAvg10(avgNps);
  const kolProfiles = kolQ.data?.data ?? [];
  const kolRelationships = relQ.data?.data ?? [];

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>NPS (vizual -100…+100)</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-center justify-center min-h-[200px]">
            <NpsGauge
              value={npsGaugeValue}
              subtitle={
                avgNps === null
                  ? "Fără scoruri NPS în eșantionul curent — gauge la 0."
                  : "Indice derivat liniar din media 0–10 a paginii (proxy față de NPS clasic % promotori − % detractori)."
              }
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Graf KOL (același cache ca Referrals)</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <KolGraph
              isLoading={kolQ.isLoading}
              profiles={kolProfiles}
              relationships={kolRelationships}
              height={300}
              selectedId={kolSelectedId}
              onToggleNodeId={(id) => setKolSelectedId((p) => (p === id ? null : id))}
              onClosePanel={() => setKolSelectedId(null)}
            />
          </CardBody>
        </Card>
      </div>

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
              {"Dashboard Complet →"}
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
