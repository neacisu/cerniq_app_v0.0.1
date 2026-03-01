import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Badge } from "@/components/ui/badge.js";
import { Spinner } from "@/components/ui/spinner.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { DataTable } from "@/components/data/DataTable.js";
import { DataTablePagination } from "@/components/data/DataTablePagination.js";
import { SearchInput } from "@/components/forms/SearchInput.js";
import { useSilverEnrichmentLog } from "@/hooks/use-etapa1.js";

type EnrichmentLogRow = {
  id?: string;
  createdAt?: string;
  entityId?: string;
  stepName?: string;
  status?: string;
  source?: string;
  details?: unknown;
};

const STATUS_VARIANT: Record<string, "info" | "warning" | "brand"> = {
  success: "brand",
  failed: "warning",
  skipped: "info",
};

const enrichmentLogColumns: ColumnDef<EnrichmentLogRow>[] = [
  {
    accessorKey: "createdAt",
    header: "Data",
    cell: ({ row }) => {
      const d = row.original.createdAt;
      if (!d) return "—";
      try {
        return new Date(d).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" });
      } catch {
        return d;
      }
    },
  },
  {
    accessorKey: "entityId",
    header: "Entity ID",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.entityId ?? "—"}</span>,
  },
  {
    accessorKey: "stepName",
    header: "Step",
    cell: ({ row }) => row.original.stepName ?? "—",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const s = row.original.status ?? "unknown";
      return <Badge variant={STATUS_VARIANT[s] ?? "info"}>{s}</Badge>;
    },
  },
  {
    accessorKey: "source",
    header: "Sursa",
    cell: ({ row }) => row.original.source ?? "—",
  },
  {
    accessorKey: "details",
    header: "Detalii",
    cell: ({ row }) => {
      const d = row.original.details;
      if (d === null || d === undefined) return "—";
      const str = typeof d === "string" ? d : JSON.stringify(d);
      return (
        <span className="block max-w-[200px] truncate text-xs text-[var(--color-t3)]" title={str}>
          {str}
        </span>
      );
    },
  },
];

const PAGE_SIZE = 25;

export function EnrichmentLogs() {
  const [entityId, setEntityId] = useState("");
  const [page, setPage] = useState(1);

  const offset = (page - 1) * PAGE_SIZE;
  const {
    data: response,
    isPending,
    isError,
    error,
  } = useSilverEnrichmentLog(entityId || undefined, PAGE_SIZE, offset);

  const rows = (response?.data ?? []) as EnrichmentLogRow[];
  const total = response?.meta?.total ?? rows.length;

  return (
    <PageWrapper title="Enrichment Logs">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Log-uri Enrichment</CardTitle>
            <SearchInput
              value={entityId}
              onChange={(val) => {
                setEntityId(val);
                setPage(1);
              }}
              placeholder="Filtru dupa Entity ID..."
            />
          </div>
        </CardHeader>
        <CardBody>
          {isPending ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size={32} />
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
              Eroare la incarcarea log-urilor: {error?.message ?? "Eroare necunoscuta"}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon="FileText"
              title="Niciun log de enrichment"
              description={
                entityId
                  ? "Niciun log gasit pentru acest Entity ID."
                  : "Nu exista log-uri de enrichment."
              }
            />
          ) : (
            <>
              <DataTable columns={enrichmentLogColumns} data={rows} />
              <DataTablePagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
              />
            </>
          )}
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
