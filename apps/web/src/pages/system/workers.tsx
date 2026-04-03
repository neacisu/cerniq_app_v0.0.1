import { Link } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { Card, CardHeader, CardTitle, CardBody, SBadge } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils.js";

type ServiceStatus = "ok" | "warning" | "error";

interface ServiceRow {
  name: string;
  detail: string;
  latency: number;
  jobs: number | string;
  status: ServiceStatus;
  category: string;
}

const services: ServiceRow[] = [
  // ── Infra ──────────────────────────────────────────────────────────────
  {
    name: "PostgreSQL",
    detail: "Primary DB",
    latency: 2,
    jobs: "-",
    status: "ok",
    category: "Infra",
  },
  {
    name: "PgBouncer",
    detail: "Pooler",
    latency: 1,
    jobs: "-",
    status: "error",
    category: "Infra",
  },
  { name: "Redis", detail: "Cache", latency: 1, jobs: "-", status: "ok", category: "Infra" },
  { name: "Traefik", detail: "Proxy", latency: 5, jobs: "-", status: "ok", category: "Infra" },
  {
    name: "OTEL Collector",
    detail: "Telemetry",
    latency: 8,
    jobs: "-",
    status: "ok",
    category: "Infra",
  },
  // ── API / Frontend ─────────────────────────────────────────────────────
  {
    name: "API Fastify",
    detail: "REST API",
    latency: 12,
    jobs: "-",
    status: "ok",
    category: "API",
  },
  {
    name: "Web Frontend",
    detail: "SPA React",
    latency: 0,
    jobs: "-",
    status: "ok",
    category: "API",
  },
  {
    name: "Monitoring API",
    detail: "Prometheus /metrics",
    latency: 15,
    jobs: "-",
    status: "ok",
    category: "API",
  },
  // ── E1 Workers ─────────────────────────────────────────────────────────
  {
    name: "BullMQ Enrichment",
    detail: "E1 Import/Normalize",
    latency: 45,
    jobs: 234,
    status: "ok",
    category: "E1",
  },
  {
    name: "BullMQ AI Enrich",
    detail: "E1 AI Score+Merge",
    latency: 120,
    jobs: 89,
    status: "warning",
    category: "E1",
  },
  // ── E2 Workers ─────────────────────────────────────────────────────────
  {
    name: "BullMQ Outreach",
    detail: "E2 Email/WA/LI",
    latency: 52,
    jobs: 412,
    status: "ok",
    category: "E2",
  },
  {
    name: "BullMQ Compliance E2",
    detail: "E2 GDPR unsubscribe",
    latency: 30,
    jobs: 18,
    status: "ok",
    category: "E2",
  },
  // ── E3 Workers ─────────────────────────────────────────────────────────
  {
    name: "e3-ai-sales: FSM",
    detail: "A01-A06 Negotiation FSM",
    latency: 85,
    jobs: 44,
    status: "ok",
    category: "E3",
  },
  {
    name: "e3-ai-sales: Proposal",
    detail: "B07-B12 Proposal+Pricing",
    latency: 160,
    jobs: 21,
    status: "ok",
    category: "E3",
  },
  {
    name: "e3-ai-sales: Guardrails",
    detail: "C13 M71-M75 PII/Pricing",
    latency: 40,
    jobs: 103,
    status: "ok",
    category: "E3",
  },
  {
    name: "e3-ai-sales: Products",
    detail: "C14-C18 Hybrid Search",
    latency: 55,
    jobs: 67,
    status: "ok",
    category: "E3",
  },
  {
    name: "e3-ai-sales: Fiscal",
    detail: "D19-D23 Oblio+SPV ANAF",
    latency: 200,
    jobs: 15,
    status: "ok",
    category: "E3",
  },
  // ── E4 Workers ─────────────────────────────────────────────────────────
  {
    name: "e4: Orders+Payments",
    detail: "E24-E28 Sameday AWB",
    latency: 95,
    jobs: 38,
    status: "ok",
    category: "E4",
  },
  {
    name: "e4: Credit Scoring",
    detail: "F29-F32 100p Score",
    latency: 180,
    jobs: 12,
    status: "ok",
    category: "E4",
  },
  {
    name: "e4: Contracts",
    detail: "G33-G37 DocuSign",
    latency: 110,
    jobs: 7,
    status: "ok",
    category: "E4",
  },
  {
    name: "e4: Reconciliere",
    detail: "H38-H41 Revolut Match",
    latency: 65,
    jobs: 22,
    status: "ok",
    category: "E4",
  },
  {
    name: "e4: Audit Hash-Chain",
    detail: "J45-J47 Audit Log",
    latency: 20,
    jobs: 5,
    status: "ok",
    category: "E4",
  },
  {
    name: "e4: HITL",
    detail: "K48-K53 Credit Override",
    latency: 0,
    jobs: 3,
    status: "warning",
    category: "E4",
  },
  // ── E5 Workers ─────────────────────────────────────────────────────────
  {
    name: "e5: Graph Community",
    detail: "D20-D24 Leiden+KOL",
    latency: 320,
    jobs: 8,
    status: "ok",
    category: "E5",
  },
  {
    name: "e5: Referral GDPR",
    detail: "E25-E31 Consent+Reward",
    latency: 75,
    jobs: 19,
    status: "ok",
    category: "E5",
  },
  {
    name: "e5: Winback",
    detail: "F32-F36 Campanii Win-Back",
    latency: 145,
    jobs: 11,
    status: "ok",
    category: "E5",
  },
  {
    name: "e5: Associations",
    detail: "G37-G42 OUAI+MADR Scrape",
    latency: 480,
    jobs: 4,
    status: "ok",
    category: "E5",
  },
  {
    name: "e5: Feedback NPS",
    detail: "H43-H47 NPS+Complaints",
    latency: 60,
    jobs: 33,
    status: "ok",
    category: "E5",
  },
  {
    name: "e5: Content Drip",
    detail: "I48-I51 Template Render",
    latency: 90,
    jobs: 28,
    status: "ok",
    category: "E5",
  },
  {
    name: "e5: Alerts Weather/APIA",
    detail: "J52-J55 Meteo+Subsidy",
    latency: 250,
    jobs: 6,
    status: "ok",
    category: "E5",
  },
  {
    name: "e5: Compliance GDPR",
    detail: "K56-K58 Retention+Law",
    latency: 35,
    jobs: 14,
    status: "ok",
    category: "E5",
  },
];

const statusLabel: Record<ServiceStatus, string> = {
  ok: "ACTIVE",
  warning: "PAUSED",
  error: "FAILED",
};

const categories = ["Infra", "API", "E1", "E2", "E3", "E4", "E5"] as const;

const totalServices = services.length;
const healthyServices = services.filter((s) => s.status === "ok").length;
const failedServices = services.filter((s) => s.status === "error").length;
const totalJobs = services.reduce((acc, s) => acc + (typeof s.jobs === "number" ? s.jobs : 0), 0);

const kpis = [
  { label: "Services", value: String(totalServices), icon: "Server" },
  { label: "Healthy", value: String(healthyServices), icon: "CheckCircle" },
  { label: "Failed", value: String(failedServices), icon: "XCircle" },
  {
    label: "Queue Jobs",
    value: totalJobs >= 1000 ? `${(totalJobs / 1000).toFixed(1)}K` : String(totalJobs),
    icon: "Layers",
  },
];

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

      {categories.map((cat) => {
        const rows = services.filter((s) => s.category === cat);
        if (rows.length === 0) return null;
        return (
          <Card key={cat} className="mb-4">
            <CardHeader>
              <CardTitle>
                {cat === "Infra" || cat === "API" ? `Infrastructură — ${cat}` : `Workeri ${cat}`}
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-s700 text-left text-t3">
                    <th className="px-5 py-3">Serviciu / Worker</th>
                    <th className="px-5 py-3">Detaliu</th>
                    <th className="px-5 py-3">Latență</th>
                    <th className="px-5 py-3">Jobs</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s, i) => (
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
                        {s.latency > 0 ? `${s.latency}ms` : "—"}
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
        );
      })}
    </PageWrapper>
  );
}
