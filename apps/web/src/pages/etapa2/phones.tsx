import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody } from "@/components/ui/index.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { toast } from "sonner";

const kpis = [
  { label: "Active", value: "18", icon: "Phone" },
  { label: "Quota Used", value: "72%", icon: "BarChart2" },
  { label: "Errors", value: "2", icon: "AlertCircle" },
];

const phones = Array.from({ length: 20 }, (_, i) => ({
  id: `WA-${String(i + 1).padStart(2, "0")}`,
  number: `+40 7${String(100 + i).padStart(8, "0")}`,
  pct: 20 + ((i * 4) % 80),
  status: (i % 7 === 2 ? "error" : "ok") as "ok" | "error",
}));

export function Phones() {
  return (
    <PageWrapper title="Phones WA">
      <div className="grid grid-cols-3 gap-4 mb-6 max-[700px]:grid-cols-1">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} {...k} delay={i * 80} />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4 max-[900px]:grid-cols-2">
        {phones.map((p) => (
          <Card
            key={p.id}
            className="cursor-pointer hover:border-[var(--color-b5)]"
            onClick={() => toast.info(`${p.id}: ${p.number}`)}
          >
            <CardBody className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--color-t1)]">
                  {p.id}
                </span>
                <StatusDot status={p.status} />
              </div>
              <p className="text-xs text-[var(--color-t3)] mb-2 truncate">
                {p.number}
              </p>
              <ProgressBar value={p.pct} showLabel />
            </CardBody>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
