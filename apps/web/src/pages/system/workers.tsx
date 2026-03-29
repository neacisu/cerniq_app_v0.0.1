import { Link } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { Card, CardHeader, CardTitle, CardBody, SBadge } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils.js";

const kpis = [
  { label: "Services", value: "12", icon: "Server" },
  { label: "Healthy", value: "10", icon: "CheckCircle" },
  { label: "Queue Jobs", value: "1.2K", icon: "Layers" },
  { label: "Avg Latency", value: "45ms", icon: "Zap" },
];

const services = [
  {
    name: "PostgreSQL",
    detail: "Primary DB",
    latency: 2,
    jobs: "-",
    status: "ok" as const,
  },
  {
    name: "Redis",
    detail: "Cache",
    latency: 1,
    jobs: "-",
    status: "ok" as const,
  },
  {
    name: "BullMQ Enrichment",
    detail: "Worker",
    latency: 45,
    jobs: 234,
    status: "ok" as const,
  },
  {
    name: "BullMQ Outreach",
    detail: "Worker",
    latency: 52,
    jobs: 412,
    status: "ok" as const,
  },
  {
    name: "BullMQ AI",
    detail: "Worker",
    latency: 120,
    jobs: 89,
    status: "warning" as const,
  },
  {
    name: "Traefik",
    detail: "Proxy",
    latency: 5,
    jobs: "-",
    status: "ok" as const,
  },
  {
    name: "OTEL Collector",
    detail: "Telemetry",
    latency: 8,
    jobs: "-",
    status: "ok" as const,
  },
  {
    name: "API",
    detail: "REST",
    latency: 12,
    jobs: "-",
    status: "ok" as const,
  },
  {
    name: "Web Frontend",
    detail: "SPA",
    latency: 0,
    jobs: "-",
    status: "ok" as const,
  },
  {
    name: "Web Admin",
    detail: "SPA",
    latency: 0,
    jobs: "-",
    status: "ok" as const,
  },
  {
    name: "Monitoring API",
    detail: "Metrics",
    latency: 15,
    jobs: "-",
    status: "ok" as const,
  },
  {
    name: "PgBouncer",
    detail: "Pooler",
    latency: 1,
    jobs: "-",
    status: "error" as const,
  },
];

const statusLabel: Record<string, string> = {
  ok: "ACTIVE",
  warning: "PAUSED",
  error: "FAILED",
};

export function Workers() {
  return (
    <PageWrapper title="Workers / Infrastructure">
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} {...k} delay={i * 80} />
        ))}
      </div>

      <div className="mb-6">
        <Link to="/brain">
          <Button
            variant="outline"
            className="flex items-center gap-2 border-[var(--color-neuron-executive)] text-[var(--color-neuron-executive)] hover:bg-[var(--color-neuron-executive)]/10"
          >
            <Brain size={16} />
            Vizualizare Cognitive Brain
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s700 text-left text-t3">
                <th className="px-5 py-3">Service Name</th>
                <th className="px-5 py-3">Detail</th>
                <th className="px-5 py-3">Latency</th>
                <th className="px-5 py-3">Jobs</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s, i) => (
                <tr
                  key={s.name}
                  className={cn(
                    "border-b border-s700 last:border-0 hover:bg-s800/50",
                    i % 2 === 1 && "bg-s800/30",
                  )}
                >
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2">
                      <StatusDot status={s.status} />
                      <span className="font-medium text-t1">{s.name}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-t2">{s.detail}</td>
                  <td className="px-5 py-3 text-t2">
                    {s.latency}
                    {s.latency > 0 ? "ms" : ""}
                  </td>
                  <td className="px-5 py-3 text-t2">{s.jobs}</td>
                  <td className="px-5 py-3">
                    <SBadge status={statusLabel[s.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
