import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { StatsBar } from "@/components/data/StatsBar.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { cn } from "@/lib/utils.js";

const FSM_STATES = [
  { label: "DISCOVERY", value: 45, color: "var(--color-in)" },
  { label: "PROPOSAL", value: 28, color: "var(--color-wa)" },
  { label: "NEGOTIATION", value: 12, color: "var(--color-neuron-guardrail)" },
  { label: "CLOSING", value: 8, color: "var(--color-neuron-fiscal)" },
  { label: "PROFORMA_SENT", value: 6, color: "var(--color-b5)" },
  { label: "PAID", value: 34, color: "var(--color-ok)" },
];

// Conform plan §XIII — infraq.app self-hosted L40S 48GB + RTX 4060Ti
const LLM_ROUTING = [
  {
    label: "QwQ-32B-AWQ (reasoning)",
    sublabel: "infraq.app · L40S 48GB · 24K ctx",
    value: 52,
    color: "var(--color-neuron-tool)",
  },
  {
    label: "Qwen2.5-14B-AWQ (fast)",
    sublabel: "infraq.app · L40S shared · <500ms",
    value: 35,
    color: "var(--color-b5)",
  },
  {
    label: "qwen3-embedding-8b (embed)",
    sublabel: "infraq.app · RTX 4060Ti · 4096d halfvec",
    value: 13,
    color: "var(--color-neuron-knowledge)",
  },
];

const GUARDRAILS = [
  { name: "M71 Price Guard", status: "ok" as const, detail: "gold_products.unit_price ±0%" },
  { name: "M72 Stock Guard", status: "ok" as const, detail: "get_available_stock(sku) live" },
  { name: "M73 Discount Guard", status: "warning" as const, detail: ">15% → HITL SLA 4h" },
  { name: "M74 SKU Guard", status: "ok" as const, detail: "SKU validat în gold_products" },
  { name: "M75 Fiscal Guard", status: "ok" as const, detail: "CUI modulo-11 + TVA + totale" },
];

const AGENT_METRICS = [
  { label: "Win Rate", value: "34%", sub: "+2.1% săptămâna aceasta", good: true },
  { label: "Avg Latency LLM", value: "287ms", sub: "QwQ-32B reasoning", good: true },
  { label: "Guard Violations", value: "3", sub: "M73 discount overflow × 3", good: false },
  { label: "HITL Escalări", value: "2", sub: "SLA 4h • 0 depășite", good: true },
];

export function AiDashboard() {
  return (
    <PageWrapper title="AI Sales Agent Dashboard" actions={<EtapaBadge label="Etapa 3" />}>
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard label="Agenți Activi" value="12" icon="Bot" color="var(--color-b5)" />
        <KpiCard label="Win Rate" value="34%" icon="Target" color="var(--color-ok)" />
        <KpiCard
          label="Deal Mediu"
          value="RON 23K"
          icon="TrendingUp"
          color="var(--color-neuron-fiscal)"
        />
        <KpiCard
          label="Venituri Luna"
          value="RON 184K"
          icon="Wallet"
          color="var(--color-neuron-knowledge)"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-1 mb-4">
        {/* FSM State Machine */}
        <Card>
          <CardHeader>
            <CardTitle>FSM State Machine</CardTitle>
          </CardHeader>
          <CardBody>
            {FSM_STATES.map((s) => (
              <StatsBar
                key={s.label}
                label={s.label}
                value={s.value}
                max={Math.max(...FSM_STATES.map((x) => x.value))}
                color={s.color}
              />
            ))}
          </CardBody>
        </Card>

        {/* LLM Routing — infraq.app (conform plan §XIII) */}
        <Card>
          <CardHeader>
            <CardTitle>LLM Routing (infraq.app)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {LLM_ROUTING.map((m) => (
              <div key={m.label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 3,
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: "var(--color-t2)", fontWeight: 600 }}>{m.label}</span>
                  <span style={{ color: m.color, fontWeight: 700 }}>{m.value}%</span>
                </div>
                <ProgressBar value={m.value} max={100} />
                <div style={{ fontSize: 9, color: "var(--color-t4)", marginTop: 2 }}>
                  {m.sublabel}
                </div>
              </div>
            ))}
            <div
              style={{
                marginTop: 8,
                padding: "6px 8px",
                background: "color-mix(in oklch, var(--color-neuron-tool) 8%, transparent)",
                border: "1px solid color-mix(in oklch, var(--color-neuron-tool) 25%, transparent)",
                borderRadius: 4,
                fontSize: 9.5,
                color: "var(--color-t4)",
              }}
            >
              Date sensibile exclusiv infraq.app (GDPR). Fallback frontier doar la eroare de sistem.
            </div>
          </CardBody>
        </Card>

        {/* Guardrails Live */}
        <Card>
          <CardHeader>
            <CardTitle>Guardrails Live</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {GUARDRAILS.map((g) => (
                <div key={g.name} className={cn("flex flex-col gap-1")}>
                  <div className="flex items-center gap-2 text-sm">
                    <StatusDot status={g.status} />
                    <span className="text-t2 font-medium">{g.name}</span>
                  </div>
                  <div style={{ fontSize: 9, color: "var(--color-t4)", paddingLeft: 16 }}>
                    {g.detail}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Agent metrics row */}
      <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2">
        {AGENT_METRICS.map((m) => (
          <div
            key={m.label}
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
              {m.label.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: m.good ? "var(--color-t1)" : "var(--color-wa)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {m.value}
            </div>
            <div
              style={{
                fontSize: 10,
                color: m.good ? "var(--color-t4)" : "var(--color-wa)",
                marginTop: 3,
              }}
            >
              {m.sub}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
