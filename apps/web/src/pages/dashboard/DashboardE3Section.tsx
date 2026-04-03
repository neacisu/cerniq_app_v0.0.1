import type { UseQueryResult } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card.js";
import { Spinner } from "@/components/ui/spinner.js";
import { BarTrendChart } from "@/components/charts/BarTrendChart.js";
import type {
  NegotiationStatsData,
  ProductStatsData,
  FiscalOblioStatsData,
} from "@/lib/unified-dashboard-api.js";
import { queryErrorMessage, sectionError } from "./utils.js";

type BarPoint = { label: string; value: number };

export type DashboardE3SectionProps = Readonly<{
  negotiationQuery: UseQueryResult<{ data?: NegotiationStatsData }, Error>;
  productQuery: UseQueryResult<{ data?: ProductStatsData }, Error>;
  fiscalQuery: UseQueryResult<{ data?: FiscalOblioStatsData }, Error>;
  negotiationBars: BarPoint[];
}>;

function E3NegotiationBody({
  negotiationQuery,
  negotiationBars,
}: Readonly<{
  negotiationQuery: UseQueryResult<{ data?: NegotiationStatsData }, Error>;
  negotiationBars: BarPoint[];
}>) {
  if (negotiationQuery.isPending) {
    return <Spinner size={24} />;
  }
  if (negotiationQuery.isError) {
    return sectionError(queryErrorMessage(negotiationQuery.error));
  }
  const neg = negotiationQuery.data?.data;
  if (!neg) {
    return null;
  }
  return (
    <>
      <p className="text-xs text-t3 mb-2">
        Încredere AI medie: {Number(neg.avgAiConfidence).toFixed(2)} · Probabilitate închidere
        medie: {Number(neg.avgCloseProbability).toFixed(2)}
      </p>
      {negotiationBars.length > 0 ? (
        <BarTrendChart data={negotiationBars} />
      ) : (
        <p className="text-sm text-t3">Nicio negociere înregistrată.</p>
      )}
    </>
  );
}

function E3ProductBody({
  productQuery,
}: Readonly<{
  productQuery: UseQueryResult<{ data?: ProductStatsData }, Error>;
}>) {
  if (productQuery.isPending) {
    return <Spinner size={24} />;
  }
  if (productQuery.isError) {
    return sectionError(queryErrorMessage(productQuery.error));
  }
  const d = productQuery.data?.data;
  if (!d) {
    return null;
  }
  return (
    <>
      <div className="flex justify-between">
        <span className="text-t3">Produse totale</span>
        <span className="text-t1">{d.products.total.toLocaleString("ro-RO")}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-t3">Active</span>
        <span className="text-t1">{d.products.active.toLocaleString("ro-RO")}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-t3">Cu embedding (descriere)</span>
        <span className="text-t1">{d.products.withEmbeddings.toLocaleString("ro-RO")}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-t3">SKU-uri inventar</span>
        <span className="text-t1">{d.inventory.totalSkus.toLocaleString("ro-RO")}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-t3">Stoc total / rezervat</span>
        <span className="text-t1">
          {d.inventory.totalStock.toLocaleString("ro-RO")} /{" "}
          {d.inventory.reserved.toLocaleString("ro-RO")}
        </span>
      </div>
    </>
  );
}

function E3FiscalBody({
  fiscalQuery,
}: Readonly<{
  fiscalQuery: UseQueryResult<{ data?: FiscalOblioStatsData }, Error>;
}>) {
  if (fiscalQuery.isPending) {
    return <Spinner size={24} />;
  }
  if (fiscalQuery.isError) {
    return sectionError(queryErrorMessage(fiscalQuery.error));
  }
  const d = fiscalQuery.data?.data;
  if (!d) {
    return null;
  }
  return (
    <>
      <div className="flex justify-between">
        <span className="text-t3">e-Factura: validate</span>
        <span className="text-t1">{d.einvoice.validated}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-t3">e-Factura: în curs</span>
        <span className="text-t1">{d.einvoice.pending}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-t3">e-Factura: respinse</span>
        <span className="text-t1">{d.einvoice.rejected}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-t3">Tipuri documente Oblio</span>
        <span className="text-t1">{d.oblioByType.length}</span>
      </div>
    </>
  );
}

export function DashboardE3Section({
  negotiationQuery,
  productQuery,
  fiscalQuery,
  negotiationBars,
}: DashboardE3SectionProps) {
  return (
    <>
      <h2 className="text-lg font-semibold text-t1 mb-3">Etapa 3 — AI sales</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Negocieri</CardTitle>
          </CardHeader>
          <CardBody>
            <E3NegotiationBody
              negotiationQuery={negotiationQuery}
              negotiationBars={negotiationBars}
            />
            <p className="text-[10px] text-t4 mt-2">
              Sursă: <code className="font-mono">GET /api/v1/negotiation/stats</code>
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Produse &amp; stoc</CardTitle>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            <E3ProductBody productQuery={productQuery} />
            <p className="text-[10px] text-t4">
              Sursă: <code className="font-mono">GET /api/v1/products/stats</code>
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fiscal (Oblio / e-Factura)</CardTitle>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            <E3FiscalBody fiscalQuery={fiscalQuery} />
            <p className="text-[10px] text-t4">
              Sursă: <code className="font-mono">GET /api/v1/fiscal/oblio/stats</code>
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
