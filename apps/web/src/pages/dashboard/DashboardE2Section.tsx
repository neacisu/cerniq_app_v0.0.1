import type { UseQueryResult } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card.js";
import { Spinner } from "@/components/ui/spinner.js";
import { BarTrendChart } from "@/components/charts/BarTrendChart.js";
import type { OutreachDashboard } from "@/lib/etapa2-api.js";
import { queryErrorMessage, sectionError } from "./utils.js";

type BarPoint = { label: string; value: number };

export type DashboardE2SectionProps = Readonly<{
  navigate: (path: string) => void;
  outreachQuery: UseQueryResult<{ data?: OutreachDashboard }, Error>;
  sentimentBar: BarPoint[];
  leadFunnelBar: BarPoint[];
}>;

function E2KpiBody({
  outreachQuery,
}: Readonly<{
  outreachQuery: UseQueryResult<{ data?: OutreachDashboard }, Error>;
}>) {
  if (outreachQuery.isPending) {
    return <Spinner size={24} />;
  }
  if (outreachQuery.isError) {
    return sectionError(queryErrorMessage(outreachQuery.error));
  }
  const outreach = outreachQuery.data?.data;
  if (!outreach) {
    return null;
  }
  return (
    <ul className="text-sm space-y-2">
      <li className="flex justify-between">
        <span className="text-t3">Mesaje trimise</span>
        <span className="text-t1">{outreach.kpis.messagesSent.toLocaleString("ro-RO")}</span>
      </li>
      <li className="flex justify-between">
        <span className="text-t3">Răspunsuri</span>
        <span className="text-t1">{outreach.kpis.replies.toLocaleString("ro-RO")}</span>
      </li>
      <li className="flex justify-between">
        <span className="text-t3">Rată conversie (est.)</span>
        <span className="text-t1">{outreach.kpis.conversionRate}%</span>
      </li>
      <li className="flex justify-between">
        <span className="text-t3">Secvențe active</span>
        <span className="text-t1">{outreach.kpis.activeSequences}</span>
      </li>
      <li className="flex justify-between">
        <span className="text-t3">Review în așteptare</span>
        <span className="text-t1">{outreach.kpis.pendingReviews}</span>
      </li>
    </ul>
  );
}

function E2SentimentBody({
  outreachQuery,
  sentimentBar,
}: Readonly<{
  outreachQuery: UseQueryResult<{ data?: OutreachDashboard }, Error>;
  sentimentBar: BarPoint[];
}>) {
  if (outreachQuery.isPending) {
    return <Spinner size={24} />;
  }
  if (outreachQuery.isError) {
    return sectionError(queryErrorMessage(outreachQuery.error));
  }
  if (sentimentBar.length > 0) {
    return <BarTrendChart data={sentimentBar} />;
  }
  return <p className="text-sm text-t3">Fără date în perioada selectată.</p>;
}

function E2LeadFunnelBody({
  outreachQuery,
  leadFunnelBar,
}: Readonly<{
  outreachQuery: UseQueryResult<{ data?: OutreachDashboard }, Error>;
  leadFunnelBar: BarPoint[];
}>) {
  if (outreachQuery.isPending) {
    return <Spinner size={24} />;
  }
  if (outreachQuery.isError) {
    return sectionError(queryErrorMessage(outreachQuery.error));
  }
  if (leadFunnelBar.length > 0) {
    return <BarTrendChart data={leadFunnelBar} />;
  }
  return <p className="text-sm text-t3">Fără lead-uri agregate.</p>;
}

export function DashboardE2Section({
  navigate,
  outreachQuery,
  sentimentBar,
  leadFunnelBar,
}: DashboardE2SectionProps) {
  return (
    <>
      <h2 className="text-lg font-semibold text-t1 mb-3">Etapa 2 — outreach</h2>
      <div className="grid grid-cols-2 gap-4 mb-8 max-[1100px]:grid-cols-1">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>KPI (7 zile)</CardTitle>
              <button
                type="button"
                className="text-xs text-b5 hover:underline"
                onClick={() => navigate("/outreach/dashboard")}
              >
                Dashboard outreach →
              </button>
            </div>
          </CardHeader>
          <CardBody>
            <E2KpiBody outreachQuery={outreachQuery} />
            <p className="text-[10px] text-t4 mt-3">
              Sursă: <code className="font-mono">GET /api/v1/outreach/dashboard?period=7d</code>
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribuție sentiment (7 zile)</CardTitle>
          </CardHeader>
          <CardBody>
            <E2SentimentBody outreachQuery={outreachQuery} sentimentBar={sentimentBar} />
          </CardBody>
        </Card>
      </div>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Lead funnel (outreach)</CardTitle>
        </CardHeader>
        <CardBody>
          <E2LeadFunnelBody outreachQuery={outreachQuery} leadFunnelBar={leadFunnelBar} />
        </CardBody>
      </Card>
    </>
  );
}
