import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { QuotaUsageGrid } from "@/components/outreach/shared/QuotaUsageGrid.js";
import { StageBadge } from "@/components/outreach/shared/StageBadge.js";
import { useOutreachDashboard } from "@/hooks/use-etapa2.js";
import type { LeadState } from "@/lib/etapa2-api.js";

const DASHBOARD_KPI_SKELETON_KEYS = [
  "outreach-dash-kpi-1",
  "outreach-dash-kpi-2",
  "outreach-dash-kpi-3",
  "outreach-dash-kpi-4",
  "outreach-dash-kpi-5",
] as const;

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        {DASHBOARD_KPI_SKELETON_KEYS.map((k) => (
          <Skeleton key={k} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}

export function Outreach() {
  const { data, isLoading, isError } = useOutreachDashboard();
  const dashboard = data?.data;

  if (isLoading) {
    return (
      <PageWrapper title="Outreach Dashboard">
        <DashboardSkeleton />
      </PageWrapper>
    );
  }

  if (isError || !dashboard) {
    return (
      <PageWrapper title="Outreach Dashboard">
        <div className="text-center py-12 text-t3">
          <p>Nu s-au putut încărca datele. Verificați conexiunea la API.</p>
        </div>
      </PageWrapper>
    );
  }

  const { kpis, leadFunnel, sentimentDistribution, phones, recentActivity } = dashboard;
  const maxFunnel = Math.max(...leadFunnel.map((f) => f.count), 1);

  const kpiCards = [
    { label: "Mesaje Trimise", value: String(kpis.messagesSent), icon: "Send" },
    { label: "Răspunsuri", value: String(kpis.replies), icon: "MessageSquare" },
    {
      label: "Rată Conversie",
      value: `${kpis.conversionRate.toFixed(1)}%`,
      icon: "TrendingUp",
    },
    { label: "Secvențe Active", value: String(kpis.activeSequences), icon: "BarChart3" },
    { label: "Review Pending", value: String(kpis.pendingReviews), icon: "Clock" },
  ];

  return (
    <PageWrapper title="Outreach Dashboard">
      <div className="grid grid-cols-5 gap-4 mb-6 max-[1000px]:grid-cols-3 max-[700px]:grid-cols-2">
        {kpiCards.map((k, i) => (
          <KpiCard key={k.label} {...k} delay={i * 80} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 max-[900px]:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Lead Funnel</CardTitle>
          </CardHeader>
          <CardBody>
            {leadFunnel.length === 0 ? (
              <p className="text-t3 text-sm">Niciun lead disponibil</p>
            ) : (
              leadFunnel.map((f) => (
                <div key={f.state} className="flex items-center gap-3 mb-2">
                  <StageBadge
                    stage={f.state as LeadState}
                    size="sm"
                    className="w-32 justify-center"
                  />
                  <div className="flex-1 h-2 bg-s700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-b5 rounded-full"
                      style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-t3 w-10 text-right">{f.count}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuție Sentiment</CardTitle>
          </CardHeader>
          <CardBody>
            {sentimentDistribution.map((s) => (
              <div key={s.category} className="flex items-center justify-between mb-3">
                <span className="text-sm text-t2">{s.category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-s700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-b5"
                      style={{
                        width: `${(s.count / (sentimentDistribution.reduce((a, x) => a + x.count, 0) || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-t3 w-8 text-right">{s.count}</span>
                </div>
              </div>
            ))}
            {sentimentDistribution.length === 0 && (
              <p className="text-t3 text-sm">Nicio dată disponibilă</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quota WA — {phones.length} Telefoane</CardTitle>
        </CardHeader>
        <CardBody>
          {phones.length > 0 ? (
            <QuotaUsageGrid phones={phones} />
          ) : (
            <p className="text-t3 text-sm">Niciun telefon configurat</p>
          )}
        </CardBody>
      </Card>

      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activitate Recentă</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {recentActivity.slice(0, 10).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-1.5 border-b border-s700 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-t1">{a.company}</span>
                    <span className="text-xs text-t3">{a.action}</span>
                  </div>
                  <span className="text-xs text-t3">
                    {new Date(a.timestamp).toLocaleTimeString("ro-RO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </PageWrapper>
  );
}
