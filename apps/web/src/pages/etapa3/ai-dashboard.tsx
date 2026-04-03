import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { StatsBar } from "@/components/data/StatsBar.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { cn } from "@/lib/utils.js";
import { api } from "@/lib/api.js";

const FSM_ORDER = [
  "DISCOVERY",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSING",
  "PROFORMA_SENT",
  "INVOICED",
  "PAID",
  "DEAD",
] as const;

const FSM_COLORS: Record<string, string> = {
  DISCOVERY: "var(--color-in)",
  PROPOSAL: "var(--color-wa)",
  NEGOTIATION: "var(--color-neuron-guardrail)",
  CLOSING: "var(--color-neuron-fiscal)",
  PROFORMA_SENT: "var(--color-b5)",
  INVOICED: "var(--color-ok)",
  PAID: "var(--color-ok)",
  DEAD: "var(--color-er)",
};

const GUARD_LABELS: { key: string; name: string; detail: string }[] = [
  { key: "price", name: "M71 Price Guard", detail: "Violări tip price în DB" },
  { key: "stock", name: "M72 Stock Guard", detail: "Violări tip stock în DB" },
  { key: "discount", name: "M73 Discount Guard", detail: "Violări tip discount în DB" },
  { key: "sku", name: "M74 SKU Guard", detail: "Violări tip sku în DB" },
  { key: "fiscal", name: "M75 Fiscal Guard", detail: "Violări tip fiscal în DB" },
];

type StatsPayload = {
  byState?: { state?: string; count?: number; totalValue?: string }[];
  avgAiConfidence?: string;
  avgCloseProbability?: string;
};

type ViolationRow = {
  violationType?: string | null;
  severity?: string | null;
};

function parseFloatSafe(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function pctFrom01(s: string | undefined): string {
  const n = parseFloatSafe(s);
  return `${(n <= 1 ? n * 100 : n).toFixed(1)}%`;
}

export function AiDashboard() {
  const statsQuery = useQuery({
    queryKey: ["ai-dashboard", "negotiation-stats"],
    queryFn: () => api.get<{ success?: boolean; data?: StatsPayload }>("/api/v1/negotiation/stats"),
  });

  const violationsQuery = useQuery({
    queryKey: ["ai-dashboard", "guardrails-count"],
    queryFn: () =>
      api.get<{ success?: boolean; data?: ViolationRow[]; meta?: { total?: number } }>(
        "/api/v1/negotiation/guardrails?limit=500",
      ),
  });

  const fsmBars = useMemo(() => {
    const byState = statsQuery.data?.data?.byState ?? [];
    const map = new Map<string, number>();
    for (const row of byState) {
      const st = row.state ?? "";
      map.set(st, row.count ?? 0);
    }
    const values = FSM_ORDER.map((label) => ({
      label,
      value: map.get(label) ?? 0,
      color: FSM_COLORS[label] ?? "var(--color-t3)",
    }));
    const maxVal = Math.max(1, ...values.map((v) => v.value));
    return { values, maxVal };
  }, [statsQuery.data]);

  const totalNeg = useMemo(() => {
    return fsmBars.values.reduce((s, v) => s + v.value, 0);
  }, [fsmBars.values]);

  const paidCount = useMemo(() => {
    const row = fsmBars.values.find((v) => v.label === "PAID");
    return row?.value ?? 0;
  }, [fsmBars.values]);

  const winRate = totalNeg > 0 ? `${((paidCount / totalNeg) * 100).toFixed(1)}%` : "—";

  const violationTotal =
    violationsQuery.data?.meta?.total ?? violationsQuery.data?.data?.length ?? 0;

  const countsByType = useMemo(() => {
    const m: Record<string, number> = {
      price: 0,
      stock: 0,
      discount: 0,
      sku: 0,
      fiscal: 0,
    };
    for (const v of violationsQuery.data?.data ?? []) {
      const t = (v.violationType ?? "").toLowerCase();
      if (t in m) m[t] += 1;
    }
    return m;
  }, [violationsQuery.data]);

  function guardStatus(key: string): "ok" | "warning" | "error" {
    const n = countsByType[key] ?? 0;
    if (n === 0) return "ok";
    return "error";
  }

  const statsErr = statsQuery.error instanceof Error ? statsQuery.error.message : null;
  const violErr = violationsQuery.error instanceof Error ? violationsQuery.error.message : null;

  return (
    <PageWrapper title="AI Sales Agent Dashboard" actions={<EtapaBadge label="Etapa 3" />}>
      {statsErr || violErr ? (
        <p className="text-sm text-er mb-4" role="alert">
          {[statsErr, violErr].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Negocieri (tenant)"
          value={statsQuery.isLoading ? "…" : String(totalNeg)}
          icon="Bot"
          color="var(--color-b5)"
        />
        <KpiCard
          label="Închise (PAID)"
          value={statsQuery.isLoading ? "…" : String(paidCount)}
          icon="Target"
          color="var(--color-ok)"
        />
        <KpiCard
          label="Win rate"
          value={statsQuery.isLoading ? "…" : winRate}
          icon="TrendingUp"
          color="var(--color-neuron-fiscal)"
        />
        <KpiCard
          label="Violări guardrail"
          value={violationsQuery.isLoading ? "…" : String(violationTotal)}
          icon="Wallet"
          color="var(--color-neuron-knowledge)"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-1 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>FSM State Machine</CardTitle>
          </CardHeader>
          <CardBody>
            {statsQuery.isLoading ? (
              <div className="text-t3 text-sm">Se încarcă…</div>
            ) : (
              fsmBars.values.map((s) => (
                <StatsBar
                  key={s.label}
                  label={s.label}
                  value={s.value}
                  max={fsmBars.maxVal}
                  color={s.color}
                />
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Routing LLM</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-t3 leading-relaxed">
              Distribuirea pe modele (ex. QwQ / Qwen) nu este expusă prin API-ul aplicației; este
              configurată în mediu (workeri, gateway LLM, variabile de mediu). Pentru telemetrie
              detaliată folosiți Prometheus / dashboard-uri ops.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guardrails (din DB)</CardTitle>
          </CardHeader>
          <CardBody>
            {violationsQuery.isLoading ? (
              <div className="text-t3 text-sm">Se încarcă…</div>
            ) : (
              <div className="space-y-3">
                {GUARD_LABELS.map((g) => (
                  <div key={g.key} className={cn("flex flex-col gap-1")}>
                    <div className="flex items-center gap-2 text-sm">
                      <StatusDot status={guardStatus(g.key)} />
                      <span className="text-t2 font-medium">{g.name}</span>
                      <span className="text-t4 text-xs">({countsByType[g.key] ?? 0})</span>
                    </div>
                    <div style={{ fontSize: 9, color: "var(--color-t4)", paddingLeft: 16 }}>
                      {g.detail}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2">
        <div
          style={{
            padding: "12px 14px",
            background: "var(--color-s900)",
            border: "1px solid var(--color-s700)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--color-t4)",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            ÎNCredere AI medie
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--color-t1)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {statsQuery.isLoading ? "…" : pctFrom01(statsQuery.data?.data?.avgAiConfidence)}
          </div>
        </div>
        <div
          style={{
            padding: "12px 14px",
            background: "var(--color-s900)",
            border: "1px solid var(--color-s700)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--color-t4)",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            Probabilitate închidere medie
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--color-t1)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {statsQuery.isLoading ? "…" : pctFrom01(statsQuery.data?.data?.avgCloseProbability)}
          </div>
        </div>
        <div
          style={{
            padding: "12px 14px",
            background: "var(--color-s900)",
            border: "1px solid var(--color-s700)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--color-t4)",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            Violări (eșantion încărcat)
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: violationTotal > 0 ? "var(--color-wa)" : "var(--color-ok)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {violationsQuery.isLoading ? "…" : String(violationsQuery.data?.data?.length ?? 0)}
          </div>
          <div style={{ fontSize: 10, color: "var(--color-t4)", marginTop: 3 }}>
            Total raportat: {violationTotal}
          </div>
        </div>
        <div
          style={{
            padding: "12px 14px",
            background: "var(--color-s900)",
            border: "1px solid var(--color-s700)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--color-t4)",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            Surse date
          </div>
          <div style={{ fontSize: 11, color: "var(--color-t2)", lineHeight: 1.5 }}>
            GET /api/v1/negotiation/stats · GET /api/v1/negotiation/guardrails
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
