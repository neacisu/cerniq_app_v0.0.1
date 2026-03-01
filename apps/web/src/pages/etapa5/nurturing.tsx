import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { Card, CardHeader, CardTitle, CardBody, SBadge } from "@/components/ui/index.js";
import { cn } from "@/lib/utils.js";

const kpis = [
  { label: "Active Clients", value: "1247", icon: "Users" },
  { label: "CLTV Mediu", value: "EUR 8.4K", icon: "TrendingUp" },
  { label: "NPS", value: "72", icon: "Star" },
  { label: "Churn Rate", value: "3.2%", icon: "Activity" },
];

const retentionData = [
  {
    company: "SC AgroSud SRL",
    status: "LOYAL",
    nps: 78,
    cltv: "12.4K",
    churn: 5,
    nextContact: "2025-03-15",
  },
  {
    company: "Cooperativa Agriland",
    status: "AT_RISK",
    nps: 42,
    cltv: "6.2K",
    churn: 28,
    nextContact: "URGENT",
  },
  {
    company: "OUAI Ialomita Nord",
    status: "LOYAL",
    nps: 85,
    cltv: "9.1K",
    churn: 2,
    nextContact: "2025-04-01",
  },
  {
    company: "SC Ferma Dunarea SA",
    status: "CHURNED",
    nps: 22,
    cltv: "3.8K",
    churn: 95,
    nextContact: "-",
  },
];

function npsColor(nps: number) {
  if (nps > 70) return "text-[var(--color-ok)]";
  if (nps > 40) return "text-[var(--color-wa)]";
  return "text-[var(--color-er)]";
}

export function Nurturing() {
  return (
    <PageWrapper title="Retention" actions={<EtapaBadge label="Etapa 5" />}>
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} {...k} delay={i * 80} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Retention</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-s700)] text-left text-[var(--color-t3)]">
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">NPS</th>
                <th className="px-5 py-3">CLTV</th>
                <th className="px-5 py-3">Churn %</th>
                <th className="px-5 py-3">Next Contact</th>
              </tr>
            </thead>
            <tbody>
              {retentionData.map((r) => (
                <tr
                  key={r.company}
                  className="border-b border-[var(--color-s700)] last:border-0 hover:bg-[var(--color-s800)]/50"
                >
                  <td className="px-5 py-3 font-medium text-[var(--color-t1)]">{r.company}</td>
                  <td className="px-5 py-3">
                    <SBadge status={r.status} />
                  </td>
                  <td className={cn("px-5 py-3 font-semibold", npsColor(r.nps))}>{r.nps}</td>
                  <td className="px-5 py-3 font-mono text-[var(--color-t2)]">EUR {r.cltv}</td>
                  <td className="px-5 py-3 w-28">
                    <ProgressBar value={r.churn} />
                  </td>
                  <td
                    className={cn(
                      "px-5 py-3",
                      r.nextContact === "URGENT" && "text-[var(--color-er)] font-semibold",
                    )}
                  >
                    {r.nextContact}
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
