import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { StatsBar } from "@/components/data/StatsBar.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { cn } from "@/lib/utils.js";

const kpis = [
  { label: "Leads Contactați", value: "3200", icon: "Users" },
  { label: "Răspunsuri", value: "847", icon: "MessageSquare" },
  { label: "Emails", value: "12400", icon: "Mail" },
  { label: "Rate", value: "26.5%", icon: "TrendingUp" },
];

const funnel = [
  { label: "Cold", value: 3200, color: "var(--color-s600)" },
  { label: "Contacted", value: 1800, color: "var(--color-in)" },
  { label: "Replied", value: 847, color: "var(--color-b5)" },
  { label: "Warm", value: 342, color: "var(--color-ok)" },
];

const waQuota = Array.from({ length: 20 }, (_, i) => ({
  id: `WA-${String(i + 1).padStart(2, "0")}`,
  pct: 30 + ((i * 3) % 70),
}));

export function Outreach() {
  return (
    <PageWrapper title="Outreach Dashboard">
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} {...k} delay={i * 80} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 max-[900px]:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Lead Funnel</CardTitle>
          </CardHeader>
          <CardBody>
            {funnel.map((f) => (
              <StatsBar
                key={f.label}
                label={f.label}
                value={f.value}
                max={Math.max(...funnel.map((x) => x.value))}
                color={f.color}
              />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WA Quota</CardTitle>
          </CardHeader>
          <CardBody>
            <div className={cn("grid grid-cols-5 gap-3")}>
              {waQuota.map((w) => (
                <div key={w.id} className="space-y-1">
                  <span className="text-xs text-[var(--color-t3)]">{w.id}</span>
                  <ProgressBar value={w.pct} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
