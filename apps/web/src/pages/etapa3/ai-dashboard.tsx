import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { StatsBar } from "@/components/data/StatsBar.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { cn } from "@/lib/utils.js";

const STATES = [
  { label: "DISCOVERY", value: 45, color: "var(--color-in)" },
  { label: "PROPOSAL", value: 28, color: "var(--color-wa)" },
  { label: "OBJECTION", value: 12, color: "var(--color-er)" },
  { label: "CLOSING", value: 8, color: "var(--color-s600)" },
  { label: "WON", value: 34, color: "var(--color-ok)" },
];

const MODELS = [
  { label: "xAI Grok", value: 45 },
  { label: "Claude", value: 35 },
  { label: "GPT-4o", value: 20 },
];

const GUARDRAILS = [
  { name: "Price Guard", status: "ok" as const },
  { name: "Stock Guard", status: "ok" as const },
  { name: "SKU Guard", status: "warning" as const },
  { name: "Fiscal Guard", status: "ok" as const },
  { name: "Terms Guard", status: "ok" as const },
];

export function AiDashboard() {
  return (
    <PageWrapper title="AI Sales Agent Dashboard">
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard label="Active Agents" value="12" icon="Bot" color="var(--color-b5)" />
        <KpiCard label="Win Rate" value="34%" icon="Target" color="var(--color-ok)" />
        <KpiCard
          label="Avg Deal"
          value="EUR 23K"
          icon="TrendingUp"
          color="var(--color-tier-gold)"
        />
        <KpiCard label="Revenue" value="EUR 184K" icon="Wallet" color="var(--color-tier-silver)" />
      </div>

      <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>State Machine</CardTitle>
          </CardHeader>
          <CardBody>
            {STATES.map((s) => (
              <StatsBar
                key={s.label}
                label={s.label}
                value={s.value}
                max={Math.max(...STATES.map((x) => x.value))}
                color={s.color}
              />
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>LLM Routing</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {MODELS.map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="w-20 text-xs text-t3">{m.label}</span>
                <ProgressBar value={m.value} max={100} />
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Guardrails</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {GUARDRAILS.map((g) => (
                <div key={g.name} className={cn("flex items-center gap-2 text-sm")}>
                  <StatusDot status={g.status} />
                  <span className="text-t2">{g.name}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
