import type { UseQueryResult } from "@tanstack/react-query";
import { Brain, GitBranch } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { Spinner } from "@/components/ui/spinner.js";
import { BarTrendChart } from "@/components/charts/BarTrendChart.js";
import type { BrainCatalogPayload, BrainTopologyPayload } from "@/lib/unified-dashboard-api.js";
import { queryErrorMessage, sectionError } from "./utils.js";

type BarPoint = { label: string; value: number };

export type DashboardBrainSectionProps = Readonly<{
  navigate: (path: string) => void;
  brainTopologyQuery: UseQueryResult<{ data?: BrainTopologyPayload }, Error>;
  brainCatalogQuery: UseQueryResult<{ data?: BrainCatalogPayload }, Error>;
  brainByEtapaBar: BarPoint[];
  brainCat: BrainCatalogPayload["stats"] | undefined;
}>;

function BrainTopologyCardBody({
  query,
}: Readonly<{
  query: UseQueryResult<{ data?: BrainTopologyPayload }, Error>;
}>) {
  if (query.isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }
  if (query.isError) {
    return sectionError(queryErrorMessage(query.error));
  }
  const meta = query.data?.data?.metadata;
  if (!meta) {
    return <p className="text-sm text-t3">Fără metadata topologie.</p>;
  }
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-t3">Neuroni activi / total</span>
        <span className="text-t1 font-mono">
          {meta.activeNeurons} / {meta.totalNeurons}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-t3">Ultima actualizare</span>
        <span className="text-t2">{new Date(meta.lastUpdated).toLocaleString("ro-RO")}</span>
      </div>
      <p className="text-[10px] text-t4 pt-1">
        Sursă: <code className="font-mono">GET /api/v1/brain/topology</code>
      </p>
    </div>
  );
}

function BrainCatalogCardBody({
  query,
  brainByEtapaBar,
  brainCat,
}: Readonly<{
  query: UseQueryResult<{ data?: BrainCatalogPayload }, Error>;
  brainByEtapaBar: BarPoint[];
  brainCat: BrainCatalogPayload["stats"] | undefined;
}>) {
  if (query.isPending) {
    return <Spinner size={24} />;
  }
  if (query.isError) {
    return sectionError(queryErrorMessage(query.error));
  }
  const stats = brainCat ?? query.data?.data?.stats;
  if (!stats) {
    return <p className="text-sm text-t3">Fără statistici catalog.</p>;
  }
  return (
    <>
      <div className="space-y-2 text-sm mb-3">
        <div className="flex justify-between">
          <span className="text-t3">Neuroni în catalog</span>
          <span className="text-t1 font-mono">{stats.total.toLocaleString("ro-RO")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-t3">Omise (total)</span>
          <span className="text-t1 font-mono">{stats.skippedTotal.toLocaleString("ro-RO")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-t3">Cozi omise</span>
          <span className="text-t1 font-mono">{stats.skippedQueues.toLocaleString("ro-RO")}</span>
        </div>
      </div>
      {brainByEtapaBar.length > 0 ? (
        <BarTrendChart data={brainByEtapaBar} />
      ) : (
        <p className="text-sm text-t3">Nicio agregare pe etapă.</p>
      )}
      <p className="text-[10px] text-t4 mt-2">
        Sursă: <code className="font-mono">GET /api/v1/brain/catalog</code>
      </p>
    </>
  );
}

export function DashboardBrainSection({
  navigate,
  brainTopologyQuery,
  brainCatalogQuery,
  brainByEtapaBar,
  brainCat,
}: DashboardBrainSectionProps) {
  return (
    <div className="space-y-4 mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <Brain className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-semibold text-t1">Cognitive Brain</h2>
        <button
          type="button"
          onClick={() => navigate("/brain")}
          className="text-xs text-b5 hover:underline ml-auto"
        >
          Deschide Brain →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-wa/40 bg-bg1/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-t2 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-accent" />
              Topologie globală
            </CardTitle>
          </CardHeader>
          <CardBody>
            <BrainTopologyCardBody query={brainTopologyQuery} />
          </CardBody>
        </Card>

        <Card className="border-wa/40 bg-bg1/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-t2 flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent" />
              Catalog &amp; agregare pe etapă
            </CardTitle>
          </CardHeader>
          <CardBody>
            <BrainCatalogCardBody
              query={brainCatalogQuery}
              brainByEtapaBar={brainByEtapaBar}
              brainCat={brainCat}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
