import type { UseQueryResult } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card.js";
import { Spinner } from "@/components/ui/spinner.js";
import { BarTrendChart } from "@/components/charts/BarTrendChart.js";
import type {
  OrderStatsData,
  CreditStatsData,
  ContractStatsData,
  ShipmentStatsData,
} from "@/lib/unified-dashboard-api.js";
import { queryErrorDetail, queryErrorMessage, sectionError } from "./utils.js";

type BarPoint = { label: string; value: number };

export type DashboardE4SectionProps = Readonly<{
  orderQuery: UseQueryResult<{ data?: OrderStatsData }, Error>;
  creditQuery: UseQueryResult<{ data?: CreditStatsData }, Error>;
  contractQuery: UseQueryResult<{ data?: ContractStatsData }, Error>;
  shipmentQuery: UseQueryResult<{ data?: ShipmentStatsData }, Error>;
  orderBars: BarPoint[];
}>;

function E4OrdersBody({
  orderQuery,
  orderBars,
}: Readonly<{
  orderQuery: UseQueryResult<{ data?: OrderStatsData }, Error>;
  orderBars: BarPoint[];
}>) {
  if (orderQuery.isPending) {
    return <Spinner size={24} />;
  }
  if (orderQuery.isError) {
    return sectionError(queryErrorMessage(orderQuery.error));
  }
  const orders = orderQuery.data?.data;
  if (!orders) {
    return null;
  }
  return (
    <>
      <p className="text-sm mb-2">
        Restanțe / parțial plătite: <strong>{orders.overdue.count.toLocaleString("ro-RO")}</strong>{" "}
        comenzi · sumă datorată: {orders.overdue.totalDue}
      </p>
      {orderBars.length > 0 ? (
        <BarTrendChart data={orderBars} />
      ) : (
        <p className="text-sm text-t3">Nicio comandă.</p>
      )}
    </>
  );
}

function E4CreditBody({
  creditQuery,
}: Readonly<{
  creditQuery: UseQueryResult<{ data?: CreditStatsData }, Error>;
}>) {
  if (creditQuery.isPending) {
    return <Spinner size={24} />;
  }
  if (creditQuery.isError) {
    return sectionError(queryErrorMessage(creditQuery.error));
  }
  const d = creditQuery.data?.data;
  if (!d) {
    return null;
  }
  const byRiskChart = d.byRisk.map((r) => ({ label: r.riskTier, value: r.count }));
  return (
    <>
      <p className="text-t3 mb-2">
        Scor mediu: {d.scoreStats.avg} (min {d.scoreStats.min}, max {d.scoreStats.max})
      </p>
      {byRiskChart.length > 0 ? (
        <BarTrendChart data={byRiskChart} />
      ) : (
        <p className="text-t3">Niciun profil de credit.</p>
      )}
    </>
  );
}

function E4ContractBlock({
  query,
}: Readonly<{
  query: UseQueryResult<{ data?: ContractStatsData }, Error>;
}>) {
  if (query.isError) {
    return sectionError(queryErrorDetail(query.error, "Eroare contracte"));
  }
  const d = query.data?.data;
  if (!d) {
    return null;
  }
  return (
    <div>
      <p className="text-t3 mb-1">Contracte expirând în 7 zile</p>
      <p className="text-t1 text-lg">{d.expiringIn7Days.toLocaleString("ro-RO")}</p>
      {d.byStatus.length > 0 ? (
        <div className="mt-2 h-40">
          <BarTrendChart
            data={d.byStatus.map((r) => ({
              label: r.status,
              value: r.count,
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}

function E4ShipmentBlock({
  query,
}: Readonly<{
  query: UseQueryResult<{ data?: ShipmentStatsData }, Error>;
}>) {
  if (query.isError) {
    return sectionError(queryErrorDetail(query.error, "Eroare livrări"));
  }
  const d = query.data?.data;
  if (!d) {
    return null;
  }
  return (
    <div>
      <p className="text-t3 mb-1">Livrări COD: colectate / total</p>
      <p className="text-t1">
        {d.cod.collected} / {d.cod.total} · sumă COD: {d.cod.codAmount}
      </p>
      {d.byStatus.length > 0 ? (
        <div className="mt-2 h-40">
          <BarTrendChart
            data={d.byStatus.map((r) => ({
              label: r.status,
              value: r.count,
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}

function E4ContractsShipmentsBody({
  contractQuery,
  shipmentQuery,
}: Readonly<{
  contractQuery: UseQueryResult<{ data?: ContractStatsData }, Error>;
  shipmentQuery: UseQueryResult<{ data?: ShipmentStatsData }, Error>;
}>) {
  if (contractQuery.isPending || shipmentQuery.isPending) {
    return <Spinner size={24} />;
  }
  return (
    <div className="space-y-3">
      <E4ContractBlock query={contractQuery} />
      <E4ShipmentBlock query={shipmentQuery} />
    </div>
  );
}

export function DashboardE4Section({
  orderQuery,
  creditQuery,
  contractQuery,
  shipmentQuery,
  orderBars,
}: DashboardE4SectionProps) {
  return (
    <>
      <h2 className="text-lg font-semibold text-t1 mb-3">Etapa 4 — post-vânzare</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Comenzi</CardTitle>
          </CardHeader>
          <CardBody>
            <E4OrdersBody orderQuery={orderQuery} orderBars={orderBars} />
            <p className="text-[10px] text-t4 mt-2">
              Sursă: <code className="font-mono">GET /api/v1/orders/stats</code>
            </p>
          </CardBody>
        </Card>
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Credit</CardTitle>
            </CardHeader>
            <CardBody className="text-sm">
              <E4CreditBody creditQuery={creditQuery} />
              <p className="text-[10px] text-t4 mt-2">
                Sursă: <code className="font-mono">GET /api/v1/credit/stats</code>
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Contracte &amp; livrări</CardTitle>
            </CardHeader>
            <CardBody className="text-sm space-y-3">
              <E4ContractsShipmentsBody
                contractQuery={contractQuery}
                shipmentQuery={shipmentQuery}
              />
              <p className="text-[10px] text-t4">
                Surse: <code className="font-mono">GET /api/v1/contracts/stats</code>,{" "}
                <code className="font-mono">GET /api/v1/shipments/stats</code>
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
