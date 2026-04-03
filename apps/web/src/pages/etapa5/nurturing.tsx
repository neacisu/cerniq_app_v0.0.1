import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { Card, CardHeader, CardTitle, CardBody, SBadge } from "@/components/ui/index.js";
import { Button } from "@/components/ui/button.js";
import { cn } from "@/lib/utils.js";
import { Phone, TrendingDown, MessageSquare } from "lucide-react";

interface RetentionRow {
  company: string;
  cui: string;
  status: "LOYAL" | "AT_RISK" | "CHURNED" | "NEW";
  nps: number;
  cltv: string;
  cltvNum: number;
  churn: number;
  nextContact: string;
}

const retentionData: RetentionRow[] = [
  {
    company: "SC AgroSud SRL",
    cui: "12345678",
    status: "LOYAL",
    nps: 78,
    cltv: "EUR 12.4K",
    cltvNum: 12400,
    churn: 5,
    nextContact: "2026-04-15",
  },
  {
    company: "Cooperativa Agriland",
    cui: "87654321",
    status: "AT_RISK",
    nps: 42,
    cltv: "EUR 6.2K",
    cltvNum: 6200,
    churn: 28,
    nextContact: "URGENT",
  },
  {
    company: "OUAI Ialomița Nord",
    cui: "11223344",
    status: "LOYAL",
    nps: 85,
    cltv: "EUR 9.1K",
    cltvNum: 9100,
    churn: 2,
    nextContact: "2026-05-01",
  },
  {
    company: "SC Ferma Dunărea SA",
    cui: "99887766",
    status: "CHURNED",
    nps: 22,
    cltv: "EUR 3.8K",
    cltvNum: 3800,
    churn: 95,
    nextContact: "—",
  },
  {
    company: "Agro Nord Impex SRL",
    cui: "55667788",
    status: "AT_RISK",
    nps: 51,
    cltv: "EUR 5.3K",
    cltvNum: 5300,
    churn: 34,
    nextContact: "URGENT",
  },
];

function npsColor(nps: number) {
  if (nps > 70) return "text-ok";
  if (nps > 40) return "text-wa";
  return "text-er";
}

function handleMessage(company: string) {
  toast.info(`Conversație nouă deschisă pentru ${company}.`);
}

export function Nurturing() {
  const navigate = useNavigate();
  const [data, setData] = useState<RetentionRow[]>(retentionData);

  const active = data.filter((r) => r.status !== "CHURNED").length;
  const avgNps = Math.round(data.reduce((s, r) => s + r.nps, 0) / data.length);
  const churnRate = (
    (data.filter((r) => r.status === "CHURNED").length / data.length) *
    100
  ).toFixed(1);
  const avgCltv = `EUR ${Math.round((data.reduce((s, r) => s + r.cltvNum, 0) / data.length / 1000) * 10) / 10}K`;

  function handleContactUrgent(company: string) {
    toast.success(
      `Sarcină URGENT creată pentru ${company}. Notificare trimisă managerului de cont.`,
    );
    setData((prev) =>
      prev.map((r) => (r.company === company ? { ...r, nextContact: "Programat azi" } : r)),
    );
  }

  function handleWinBack(company: string) {
    toast.success(`Campanie win-back F32 lansată pentru ${company}.`);
    navigate("/churn");
  }

  return (
    <PageWrapper title="Retention — Monitorizare Clienți" actions={<EtapaBadge label="Etapa 5" />}>
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Clienți Activi"
          value={String(active)}
          icon="Users"
          color="var(--color-b5)"
          delay={0}
        />
        <KpiCard
          label="CLTV Mediu"
          value={avgCltv}
          icon="TrendingUp"
          color="var(--color-ok)"
          delay={80}
        />
        <KpiCard
          label="NPS Mediu"
          value={String(avgNps)}
          icon="Star"
          color="var(--color-neuron-feedback)"
          delay={160}
        />
        <KpiCard
          label="Churn Rate"
          value={`${churnRate}%`}
          icon="Activity"
          color="var(--color-er)"
          delay={240}
        />
      </div>

      <Card>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <CardTitle>Client Retention Overview</CardTitle>
            <Button
              size="sm"
              variant="outline"
              style={{ fontSize: 11, gap: 4 }}
              onClick={() => navigate("/nurturing/dashboard")}
            >
              Dashboard Complet →
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s700 text-left text-t3">
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">NPS</th>
                <th className="px-5 py-3">CLTV</th>
                <th className="px-5 py-3">Churn %</th>
                <th className="px-5 py-3">Next Contact</th>
                <th className="px-5 py-3">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.company} className="border-b border-s700 last:border-0 hover:bg-s800/50">
                  <td className="px-5 py-3 font-medium text-t1">{r.company}</td>
                  <td className="px-5 py-3">
                    <SBadge status={r.status} />
                  </td>
                  <td className={cn("px-5 py-3 font-semibold", npsColor(r.nps))}>{r.nps}</td>
                  <td className="px-5 py-3 font-mono text-t2">{r.cltv}</td>
                  <td className="px-5 py-3 w-28">
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ProgressBar value={r.churn} />
                      <span
                        style={{
                          fontSize: 10,
                          color: r.churn > 60 ? "var(--color-er)" : "var(--color-t3)",
                          minWidth: 28,
                        }}
                      >
                        {r.churn}%
                      </span>
                    </div>
                  </td>
                  <td
                    className={cn(
                      "px-5 py-3",
                      r.nextContact === "URGENT" && "text-er font-semibold",
                    )}
                  >
                    {r.nextContact}
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex gap-1">
                      {r.status === "AT_RISK" && (
                        <Button
                          size="sm"
                          variant="brand"
                          style={{ fontSize: 10, gap: 3 }}
                          title="Contact urgent"
                          onClick={() => handleContactUrgent(r.company)}
                        >
                          <Phone size={10} /> Urgent
                        </Button>
                      )}
                      {r.status === "CHURNED" && (
                        <Button
                          size="sm"
                          style={{ fontSize: 10, gap: 3 }}
                          title="Lansează win-back"
                          onClick={() => handleWinBack(r.company)}
                        >
                          <TrendingDown size={10} /> Win-Back
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        style={{ fontSize: 10 }}
                        title="Mesaj"
                        onClick={() => handleMessage(r.company)}
                      >
                        <MessageSquare size={12} />
                      </Button>
                    </span>
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
