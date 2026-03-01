import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { Card, CardBody, Button, Badge } from "@/components/ui/index.js";
import { cn } from "@/lib/utils.js";

const kpis = [
  { label: "At Risk", value: "45", icon: "AlertTriangle" },
  { label: "Avg Risk", value: "34%", icon: "Activity" },
  { label: "Win-Back Success", value: "23%", icon: "TrendingUp" },
];

const profiles = [
  {
    company: "Cooperativa Agriland",
    risk: 72,
    severity: "high" as const,
    signals: ["No order 90d", "NPS drop"],
    action: "Reach out with offer",
  },
  {
    company: "SC AgroTech Nord",
    risk: 45,
    severity: "medium" as const,
    signals: ["Support ticket"],
    action: "Follow-up call",
  },
  {
    company: "OUAI Sud",
    risk: 22,
    severity: "low" as const,
    signals: ["Payment delay"],
    action: "Payment reminder",
  },
];

const borderMap = {
  high: "border-[var(--color-er)]",
  medium: "border-[var(--color-wa)]",
  low: "border-[var(--color-ok)]",
};

export function Churn() {
  return (
    <PageWrapper title="Churn Risk" actions={<EtapaBadge label="Etapa 5" />}>
      <div className="grid grid-cols-3 gap-4 mb-6 max-[700px]:grid-cols-1">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} {...k} delay={i * 80} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((p) => (
          <Card key={p.company} className={cn("border-l-4", borderMap[p.severity])}>
            <CardBody className="space-y-3">
              <div className="font-semibold text-[var(--color-t1)]">{p.company}</div>
              <ProgressBar value={p.risk} />
              <div className="flex flex-wrap gap-1">
                {p.signals.map((s) => (
                  <Badge key={s} variant="error" className="text-[0.65rem]">
                    {s}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-[var(--color-t3)]">{p.action}</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="brand">
                  Win-Back
                </Button>
                <Button size="sm" variant="outline">
                  Profil
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
