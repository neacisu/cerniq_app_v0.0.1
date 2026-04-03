import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card.js";
import { Spinner } from "@/components/ui/spinner.js";
import { BarTrendChart } from "@/components/charts/BarTrendChart.js";
import { cn } from "@/lib/utils.js";
import type {
  NurturingStatsData,
  ChurnStatsData,
  ReferralStatsData,
  GraphStatsData,
  E5ComplianceAlertStatsData,
} from "@/lib/unified-dashboard-api.js";
import { queryErrorMessage, sectionError } from "./utils.js";

type BarPoint = { label: string; value: number };

export type DashboardE5SectionProps = Readonly<{
  nurturingQuery: UseQueryResult<{ data?: NurturingStatsData }, Error>;
  churnQuery: UseQueryResult<{ data?: ChurnStatsData }, Error>;
  e5ComplianceQuery: UseQueryResult<{ data?: E5ComplianceAlertStatsData }, Error>;
  referralQuery: UseQueryResult<{ data?: ReferralStatsData }, Error>;
  graphQuery: UseQueryResult<{ data?: GraphStatsData }, Error>;
  churnRiskBars: BarPoint[];
  churnSentimentBar: BarPoint[];
}>;

function ApiSourceNote({
  path,
  className,
}: Readonly<{ path: string; className?: string }>): ReactNode {
  return (
    <p className={cn("text-[10px] text-t4", className ?? "mt-2")}>
      Sursă: <code className="font-mono">{path}</code>
    </p>
  );
}

function NurturingNpsBody({
  query,
}: Readonly<{
  query: UseQueryResult<{ data?: NurturingStatsData }, Error>;
}>): ReactNode {
  if (query.isPending) {
    return <Spinner size={24} />;
  }
  if (query.isError) {
    return sectionError(queryErrorMessage(query.error));
  }
  const d = query.data?.data;
  if (!d) {
    return null;
  }
  return (
    <>
      <p className="text-sm mb-2">
        NPS: trimise {d.nps.totalSent.toLocaleString("ro-RO")} · răspunsuri{" "}
        {d.nps.responded.toLocaleString("ro-RO")} · medie {d.nps.avgScore}
      </p>
      {d.byState.length > 0 ? (
        <BarTrendChart
          data={d.byState.map((r) => ({
            label: r.currentState,
            value: r.count,
          }))}
        />
      ) : (
        <p className="text-t3 text-sm">Fără stări nurturing.</p>
      )}
    </>
  );
}

function ChurnInsightsBody({
  query,
  churn,
  churnRiskBars,
  churnSentimentBar,
}: Readonly<{
  query: UseQueryResult<{ data?: ChurnStatsData }, Error>;
  churn: ChurnStatsData | undefined;
  churnRiskBars: BarPoint[];
  churnSentimentBar: BarPoint[];
}>): ReactNode {
  if (query.isPending) {
    return <Spinner size={24} />;
  }
  if (query.isError) {
    return sectionError(queryErrorMessage(query.error));
  }
  if (!churn) {
    return null;
  }
  const hasSentiment = churnSentimentBar.some((x) => x.value > 0);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-xs text-t3 mb-1">După nivel risc</p>
        {churnRiskBars.length > 0 ? (
          <BarTrendChart data={churnRiskBars} />
        ) : (
          <p className="text-sm text-t3">Fără factori churn.</p>
        )}
      </div>
      <div>
        <p className="text-xs text-t3 mb-1">Sentiment (analize)</p>
        {hasSentiment ? (
          <BarTrendChart data={churnSentimentBar} />
        ) : (
          <p className="text-sm text-t3">Fără analize sentiment.</p>
        )}
      </div>
    </div>
  );
}

function ComplianceAlertsBody({
  query,
}: Readonly<{
  query: UseQueryResult<{ data?: E5ComplianceAlertStatsData }, Error>;
}>): ReactNode {
  if (query.isPending) {
    return <Spinner size={24} />;
  }
  if (query.isError) {
    return sectionError(queryErrorMessage(query.error));
  }
  const d = query.data?.data;
  if (!d) {
    return null;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ul className="space-y-2">
        <li className="flex justify-between">
          <span className="text-t3">AT_RISK (stare)</span>
          <span className="text-t1">{d.summary.atRiskCount.toLocaleString("ro-RO")}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-t3">CHURNED</span>
          <span className="text-t1">{d.summary.churnedCount.toLocaleString("ro-RO")}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-t3">Risc CRITICAL</span>
          <span className="text-t1">{d.summary.criticalCount.toLocaleString("ro-RO")}</span>
        </li>
      </ul>
      {d.byRiskLevel.length > 0 ? (
        <div className="min-h-40">
          <BarTrendChart
            data={d.byRiskLevel.map((r) => ({
              label: r.riskLevel ?? "—",
              value: r.count,
            }))}
          />
        </div>
      ) : (
        <p className="text-t3 self-center">Fără distribuție pe nivel risc.</p>
      )}
    </div>
  );
}

function ReferralsBody({
  query,
}: Readonly<{
  query: UseQueryResult<{ data?: ReferralStatsData }, Error>;
}>): ReactNode {
  if (query.isPending) {
    return <Spinner size={24} />;
  }
  if (query.isError) {
    return sectionError(queryErrorMessage(query.error));
  }
  const d = query.data?.data;
  if (!d) {
    return null;
  }
  return (
    <>
      <div className="flex justify-between">
        <span className="text-t3">Total referral-uri</span>
        <span className="text-t1">{d.consent.total.toLocaleString("ro-RO")}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-t3">Cu consimțământ</span>
        <span className="text-t1">{d.consent.withConsent.toLocaleString("ro-RO")}</span>
      </div>
      {d.byStatus.length > 0 ? (
        <div className="pt-2 h-48">
          <BarTrendChart
            data={d.byStatus.map((r) => ({
              label: r.status,
              value: r.count,
            }))}
          />
        </div>
      ) : null}
    </>
  );
}

function GraphStatsBody({
  query,
}: Readonly<{
  query: UseQueryResult<{ data?: GraphStatsData }, Error>;
}>): ReactNode {
  if (query.isPending) {
    return <Spinner size={24} />;
  }
  if (query.isError) {
    return sectionError(queryErrorMessage(query.error));
  }
  const d = query.data?.data;
  if (!d) {
    return null;
  }
  return (
    <>
      <div className="flex justify-between">
        <span className="text-t3">Clustere</span>
        <span className="text-t1">{d.clusters.totalClusters.toLocaleString("ro-RO")}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-t3">Membri medii / cluster</span>
        <span className="text-t1">{d.clusters.avgMemberCount}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-t3">KOL marcați</span>
        <span className="text-t1">{d.clusters.kolCount}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-t3">Relații entități</span>
        <span className="text-t1">
          {d.relationships.totalRelationships.toLocaleString("ro-RO")}
        </span>
      </div>
    </>
  );
}

export function DashboardE5Section(props: DashboardE5SectionProps): ReactNode {
  const {
    nurturingQuery,
    churnQuery,
    e5ComplianceQuery,
    referralQuery,
    graphQuery,
    churnRiskBars,
    churnSentimentBar,
  } = props;
  const churn = churnQuery.data?.data;

  return (
    <>
      <h2 className="text-lg font-semibold text-t1 mb-3">Etapa 5 — nurturing &amp; rețea</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Nurturing &amp; NPS</CardTitle>
          </CardHeader>
          <CardBody>
            <NurturingNpsBody query={nurturingQuery} />
            <ApiSourceNote path="GET /api/v1/nurturing/stats" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Churn — risc &amp; sentiment analize</CardTitle>
          </CardHeader>
          <CardBody>
            <ChurnInsightsBody
              query={churnQuery}
              churn={churn}
              churnRiskBars={churnRiskBars}
              churnSentimentBar={churnSentimentBar}
            />
            <ApiSourceNote path="GET /api/v1/churn/stats" />
          </CardBody>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Alerte compliance (nurturing / churn)</CardTitle>
        </CardHeader>
        <CardBody className="text-sm">
          <ComplianceAlertsBody query={e5ComplianceQuery} />
          <ApiSourceNote path="GET /api/v1/e5/alerts/compliance/stats" className="mt-3" />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Referrals (GDPR / consimțământ)</CardTitle>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            <ReferralsBody query={referralQuery} />
            <ApiSourceNote path="GET /api/v1/referrals/stats" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Graf social (clustere &amp; relații)</CardTitle>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            <GraphStatsBody query={graphQuery} />
            <ApiSourceNote path="GET /api/v1/graph/stats" />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
