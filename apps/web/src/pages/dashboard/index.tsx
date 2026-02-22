import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { StatsBar } from "@/components/data/StatsBar.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card.js";

const kpis = [
  {
    label: "Bronze Contacts",
    value: "47,382",
    change: "+12.5%",
    icon: "Database",
    color: "var(--color-tier-bronze)",
    path: "/bronze",
  },
  {
    label: "Silver Companies",
    value: "8,941",
    change: "+8.2%",
    icon: "Building2",
    color: "var(--color-tier-silver)",
    path: "/silver",
  },
  {
    label: "Gold Leads",
    value: "1,247",
    change: "+15.3%",
    icon: "Star",
    color: "var(--color-tier-gold)",
    path: "/gold",
  },
  {
    label: "Venituri EUR",
    value: "184K",
    change: "+22.1%",
    icon: "TrendingUp",
    color: "var(--color-ok)",
    path: "/payments",
  },
];

const pipeline = [
  { label: "Import", value: 47382, color: "var(--color-tier-bronze)" },
  { label: "Validare", value: 23456, color: "var(--color-tier-silver)" },
  { label: "Enrichment", value: 8941 },
  { label: "Outreach", value: 3200, color: "var(--color-in)" },
  { label: "Negociere", value: 1247, color: "var(--color-tier-gold)" },
  { label: "Conversie", value: 342, color: "var(--color-ok)" },
];

const activity = [
  {
    status: "ok" as const,
    text: "SC Ferma Dunarea SA — validat ANAF",
    time: "2m ago",
  },
  {
    status: "info" as const,
    text: "Cooperativa Agriland — WA message sent",
    time: "15m ago",
  },
  {
    status: "warning" as const,
    text: "OUAI Ialomita Nord — approval pending",
    time: "1h ago",
  },
  {
    status: "ok" as const,
    text: "SC AgroSud SRL — converted to Gold",
    time: "2h ago",
  },
  {
    status: "error" as const,
    text: "SC AgroTech Dunarea — payment overdue",
    time: "5h ago",
  },
  {
    status: "info" as const,
    text: "New import batch — 2,345 contacts",
    time: "1d ago",
  },
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <PageWrapper title="Dashboard">
      <div className="grid grid-cols-4 gap-4 mb-6 max-[1100px]:grid-cols-2 max-[700px]:grid-cols-2">
        {kpis.map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            {...kpi}
            delay={i * 100}
            onClick={() => navigate(kpi.path)}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 max-[1100px]:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardBody>
            <StatsBar items={pipeline} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activitate Recentă</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {activity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <StatusDot status={item.status} />
                  <span className="flex-1 text-[var(--color-t1)]">
                    {item.text}
                  </span>
                  <span className="text-xs text-[var(--color-t3)]">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4 max-[1100px]:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Outreach</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="t3">Leads contactați</span>
              <span className="tok">3,200</span>
            </div>
            <div className="flex justify-between">
              <span className="t3">Răspunsuri</span>
              <span className="tb">847</span>
            </div>
            <div className="flex justify-between">
              <span className="t3">Conversii</span>
              <span className="tok">342</span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Infrastructure</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="t3">PostgreSQL</span>
              <span className="tok">Healthy</span>
            </div>
            <div className="flex justify-between">
              <span className="t3">Redis</span>
              <span className="tok">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="t3">Workers</span>
              <span className="twa">3/5 active</span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>KPI Lunar</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="t3">Target</span>
              <span className="tb">EUR 200K</span>
            </div>
            <div className="flex justify-between">
              <span className="t3">Realizat</span>
              <span className="tok">EUR 184K</span>
            </div>
            <div className="flex justify-between">
              <span className="t3">Progres</span>
              <span className="tok">92%</span>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
