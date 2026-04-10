import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { Badge, Button } from "@/components/ui/index.js";
import { cn } from "@/lib/utils.js";
import { messageFromUnknown } from "@/lib/api.js";
import { X, TrendingDown, AlertTriangle } from "lucide-react";
import {
  fetchChurnFactors,
  fetchChurnStats,
  postChurnEvaluate,
  type ChurnFactorRow,
} from "@/lib/etapa5-api.js";
import { voidAsyncHandler } from "@/lib/void-async-handlers.js";

type Severity = "high" | "medium" | "low";

function riskToSeverity(riskLevel: ChurnFactorRow["riskLevel"]): Severity {
  if (riskLevel === "CRITICAL" || riskLevel === "HIGH") return "high";
  if (riskLevel === "MEDIUM") return "medium";
  return "low";
}

function signalsFromFactor(row: ChurnFactorRow): string[] {
  const n = row.activeSignalCount ?? 0;
  const parts: string[] = [];
  if (n > 0) parts.push(`${n} semnale churn active`);
  const fb = row.factorBreakdown;
  if (fb && typeof fb === "object" && !Array.isArray(fb)) {
    parts.push(...Object.keys(fb as Record<string, unknown>).slice(0, 6));
  }
  return parts.length > 0 ? parts : ["Fără chei în factorBreakdown"];
}

const borderMap = { high: "border-er", medium: "border-wa", low: "border-ok" };
const riskColors = { high: "var(--color-er)", medium: "var(--color-wa)", low: "var(--color-ok)" };

function ChurnDetailDrawer({
  profile,
  onClose,
}: {
  readonly profile: ChurnFactorRow;
  readonly onClose: () => void;
}) {
  const severity = riskToSeverity(profile.riskLevel);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => postChurnEvaluate(profile.leadId, { force: false }),
    onSuccess: (res) => {
      toast.success(`Job churn în coadă: ${res.data.jobId}`);
      qc.invalidateQueries({ queryKey: ["e5", "churn"] }).catch(voidAsyncHandler);
      onClose();
    },
    onError: (e: unknown) => {
      toast.error(messageFromUnknown(e));
    },
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={onClose} aria-hidden />
      <div
        style={{
          width: 400,
          background: "var(--color-s900)",
          borderLeft: "1px solid var(--color-s700)",
          padding: 20,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-t1)" }}>
              {profile.companyName?.trim() || "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-t3)", fontFamily: "var(--font-mono)" }}>
              CUI: {profile.cui ?? "—"} · lead {profile.leadId}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-t3)",
              cursor: "pointer",
            }}
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TrendingDown size={16} color={riskColors[severity]} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                marginBottom: 4,
              }}
            >
              <span style={{ color: "var(--color-t3)" }}>Scor churn</span>
              <span style={{ color: riskColors[severity], fontWeight: 700 }}>
                {profile.overallChurnScore}%
              </span>
            </div>
            <ProgressBar value={profile.overallChurnScore} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11 }}>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>NIVEL RISC</div>
            <div style={{ color: "var(--color-t2)" }}>{profile.riskLevel}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>
              ULTIMA CALCULARE
            </div>
            <div style={{ color: "var(--color-t2)" }}>
              {profile.lastCalculatedAt?.slice(0, 10) ?? "—"}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--color-t4)", fontSize: 9, marginBottom: 2 }}>JUDEȚ</div>
            <div style={{ color: "var(--color-t2)" }}>{profile.judet ?? "—"}</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t3)", marginBottom: 8 }}>
            SEMNALE / FACTORI (agregat)
          </div>
          {signalsFromFactor(profile).map((s) => (
            <div
              key={s}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 0",
                fontSize: 12,
                color: "var(--color-er)",
              }}
            >
              <AlertTriangle size={10} />
              {s}
            </div>
          ))}
        </div>

        <div
          style={{
            padding: "10px 12px",
            background: "color-mix(in oklch, var(--color-wa) 10%, transparent)",
            border: "1px solid color-mix(in oklch, var(--color-wa) 30%, transparent)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--color-t2)",
          }}
        >
          <strong style={{ color: "var(--color-wa)" }}>Acțiune:</strong> POST{" "}
          <code>/api/v1/churn/:leadId/evaluate</code> — reprocesare semnale (coadă worker).
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button
            size="sm"
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            style={{ gap: 6 }}
          >
            <TrendingDown size={13} /> Evaluează churn (worker)
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Churn() {
  const [selected, setSelected] = useState<ChurnFactorRow | null>(null);
  const factorsQuery = useQuery({
    queryKey: ["e5", "churn", "factors", "page1"],
    queryFn: () => fetchChurnFactors({ page: 1, limit: 100 }),
  });
  const statsQuery = useQuery({
    queryKey: ["e5", "churn", "stats"],
    queryFn: fetchChurnStats,
  });

  const rows = factorsQuery.data?.data ?? [];
  const totalFactors = factorsQuery.data?.meta?.total ?? 0;
  const criticalCount =
    statsQuery.data?.data.byRisk.find((b) => b.riskLevel === "CRITICAL")?.count ?? 0;

  const highSeverityOnPage = rows.filter((r) => riskToSeverity(r.riskLevel) === "high").length;

  return (
    <PageWrapper title="Churn Risk" actions={<EtapaBadge label="Etapa 5" />}>
      <div className="grid grid-cols-3 gap-4 mb-6 max-[700px]:grid-cols-1">
        <KpiCard
          label="Profiluri churn (DB)"
          value={factorsQuery.isLoading ? "…" : String(totalFactors)}
          icon="AlertTriangle"
          color="var(--color-er)"
        />
        <KpiCard
          label="Risc CRITICAL (stats)"
          value={statsQuery.isLoading ? "…" : String(criticalCount)}
          icon="TrendingDown"
          color="var(--color-er)"
        />
        <KpiCard
          label="În pagina curentă (risc ridicat)"
          value={factorsQuery.isLoading ? "…" : String(highSeverityOnPage)}
          icon="TrendingUp"
          color="var(--color-wa)"
        />
      </div>

      {factorsQuery.error ? (
        <div className="mb-4 text-sm text-er" role="alert">
          {factorsQuery.error instanceof Error
            ? factorsQuery.error.message
            : String(factorsQuery.error)}
        </div>
      ) : null}

      {rows.length === 0 && !factorsQuery.isLoading ? (
        <div className="text-sm text-t3 mb-4">
          Nu există rânduri în `gold_churn_factors` pentru acest tenant.
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((p) => {
          const sev = riskToSeverity(p.riskLevel);
          return (
            <Card key={p.id} className={cn("border-l-4", borderMap[sev])}>
              <CardBody className="space-y-3">
                <div className="font-semibold text-t1">{p.companyName?.trim() || "—"}</div>
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <ProgressBar value={p.overallChurnScore} />
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      color: riskColors[sev],
                    }}
                  >
                    {p.overallChurnScore}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {signalsFromFactor(p)
                    .slice(0, 4)
                    .map((s) => (
                      <Badge key={s} variant="error" className="text-[0.65rem]">
                        {s}
                      </Badge>
                    ))}
                </div>
                <p className="text-xs text-t3">
                  {p.riskLevel} · actualizat {p.lastCalculatedAt?.slice(0, 10) ?? "—"}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="brand"
                    className="flex-1"
                    onClick={() => {
                      toast.info(
                        "Folosiți «Evaluează churn» din profil pentru a trimite jobul în coadă.",
                      );
                    }}
                  >
                    Win-Back
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelected(p)}
                  >
                    Profil
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {selected ? <ChurnDetailDrawer profile={selected} onClose={() => setSelected(null)} /> : null}
    </PageWrapper>
  );
}
