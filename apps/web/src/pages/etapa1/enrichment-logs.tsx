import { useMemo, useState } from "react";
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
import {
  enrichmentLogStatusBadgeVariant,
  mapSilverEnrichmentLogApiRow,
  type SilverEnrichmentLogRowView,
} from "@/lib/silver-enrichment-log.js";

function buildEnrichmentLogColumns(): ColumnDef<SilverEnrichmentLogRowView>[] {
  return [
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
      accessorKey: "entityType",
      header: "Entity type",
      cell: ({ row }) => <span className="text-xs">{row.original.entityType ?? "—"}</span>,
    },
    {
      accessorKey: "entityId",
      header: "Entity ID",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.entityId ?? "—"}</span>,
    },
    {
      accessorKey: "operation",
      header: "Operație",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.operation}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        return <Badge variant={enrichmentLogStatusBadgeVariant(s)}>{s}</Badge>;
      },
    },
    {
      accessorKey: "source",
      header: "Sursă",
      cell: ({ row }) => row.original.source ?? "—",
    },
    {
      accessorKey: "jobId",
      header: "Job ID",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.jobId ?? "—"}</span>,
    },
    {
      accessorKey: "errorMessage",
      header: "Eroare",
      cell: ({ row }) => {
        const e = row.original.errorMessage;
        if (!e) return "—";
        return (
          <span className="block max-w-40 truncate text-xs text-er" title={e}>
            {e}
          </span>
        );
      },
    },
    {
      accessorKey: "details",
      header: "Detalii",
      cell: ({ row }) => {
        const d = row.original.details;
        if (d === null || d === undefined) return "—";
        const str = typeof d === "string" ? d : JSON.stringify(d);
        return (
          <span className="block max-w-50 truncate text-xs text-t3" title={str}>
            {str}
          </span>
        );
      },
    },
  ];
}

const PAGE_SIZE = 25;

export function EnrichmentLogs() {
  const [entityId, setEntityId] = useState("");
  const [page, setPage] = useState(1);
  const columns = useMemo(() => buildEnrichmentLogColumns(), []);

  const offset = (page - 1) * PAGE_SIZE;
  const {
    data: response,
    isPending,
    isError,
    error,
  } = useSilverEnrichmentLog(entityId || undefined, PAGE_SIZE, offset);

  const rows: SilverEnrichmentLogRowView[] = useMemo(() => {
    const raw = (response?.data ?? []) as Record<string, unknown>[];
    return raw.map((r) => mapSilverEnrichmentLogApiRow(r));
  }, [response?.data]);

  const total = response?.meta?.total ?? rows.length;

  let content: React.ReactNode;

  if (isPending) {
    content = (
      <div className="flex items-center justify-center py-16">
        <Spinner size={32} />
      </div>
    );
  } else if (isError) {
    content = (
      <div className="rounded-lg border border-er bg-er/10 p-4 text-sm text-er">
        Eroare la încărcarea log-urilor: {error?.message ?? "Eroare necunoscută"}
      </div>
    );
  } else if (rows.length === 0) {
    content = (
      <EmptyState
        icon="FileText"
        title="Niciun log de enrichment"
        description={
          entityId
            ? "Niciun log găsit pentru acest Entity ID."
            : "Nu există log-uri de enrichment pentru tenant."
        }
      />
    );
  } else {
    content = (
      <>
        <DataTable columns={columns} data={rows} />
        <DataTablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </>
    );
  }

  return (
    <PageWrapper title="Enrichment Logs">
      <p className="mb-4 text-xs text-t4">
        Sursă:{" "}
        <code className="font-mono">
          GET /api/v1/silver/enrichment-log?limit=&amp;offset=&amp;entityId=
        </code>
        {" — "}
        jurnal audit Silver (coloane <code className="font-mono">operation</code>,{" "}
        <code className="font-mono">status</code> din DB). Nu există rută dedicată sub{" "}
        <code className="font-mono">/api/v1/enrichment</code> pentru acest jurnal.
      </p>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Log-uri enrichment (Silver)</CardTitle>
            <SearchInput
              value={entityId}
              onChange={(val) => {
                setEntityId(val);
                setPage(1);
              }}
              placeholder="Filtru după Entity ID (UUID)..."
            />
          </div>
        </CardHeader>
        <CardBody>{content}</CardBody>
      </Card>
    </PageWrapper>
  );
}
