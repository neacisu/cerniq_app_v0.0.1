import { useState, useMemo } from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Button, Card, CardHeader, CardTitle, CardBody, TBadge } from "@/components/ui/index.js";
import { triggerSilverEnrich, triggerSilverPromote } from "@/lib/etapa1-api.js";
import { DataTable } from "@/components/data/DataTable.js";
import { DataTablePagination } from "@/components/data/DataTablePagination.js";
import { BulkActionBar } from "@/components/data/BulkActionBar.js";
import { MultiSelectFilter } from "@/components/data/MultiSelectFilter.js";
import { makeSilverCompaniesColumns } from "@/lib/table-columns.js";
import { useSilverCompanies } from "@/hooks/use-etapa1.js";
import { SilverCompanyDrawer } from "@/components/drawers/SilverCompanyDrawer.js";
import type { SilverCompanyRow } from "@/lib/etapa1-types.js";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const ENRICHMENT_STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in_progress" },
  { label: "Complete", value: "complete" },
  { label: "Partial", value: "partial" },
  { label: "Failed", value: "failed" },
] as const;

const PROMOTION_STATUS_OPTIONS = [
  { label: "Eligible", value: "eligible" },
  { label: "Review Required", value: "review_required" },
  { label: "Blocked", value: "blocked" },
  { label: "Promoted", value: "promoted" },
] as const;

type ActionHandlers = { onEnrich: (id: string) => void; onPromote: (id: string) => void };

function ActionsCell({ c, onEnrich, onPromote }: { c: SilverCompanyRow } & ActionHandlers) {
  return (
    <div className="flex items-center gap-2">
      <TBadge tier={String(c.promotionStatus) === "promoted" ? "gold" : "silver"} />
      <button className="text-b5 underline text-xs" onClick={() => onEnrich(String(c.id))}>
        Enrich
      </button>
      <button className="text-ok underline text-xs" onClick={() => onPromote(String(c.id))}>
        Promote
      </button>
    </div>
  );
}

function createActionsColumn(handlers: ActionHandlers): ColumnDef<SilverCompanyRow> {
  return {
    id: "actions",
    header: "Acțiuni",
    cell: ({ row }) => <ActionsCell c={row.original} {...handlers} />,
  };
}

export function Silver() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [enrichmentStatuses, setEnrichmentStatuses] = useState<string[]>([]);
  const [promotionStatuses, setPromotionStatuses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const offset = (page - 1) * pageSize;

  const companiesQuery = useSilverCompanies({
    limit: pageSize,
    offset,
    search: search || undefined,
    enrichmentStatus: enrichmentStatuses[0] as
      | "pending"
      | "in_progress"
      | "complete"
      | "partial"
      | "failed"
      | undefined,
    promotionStatus: promotionStatuses[0] as
      | "eligible"
      | "review_required"
      | "blocked"
      | "promoted"
      | undefined,
  });
  const enrichMutation = useMutation({
    mutationFn: (id: string) => triggerSilverEnrich(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["silver-companies"] }).catch(() => undefined);
    },
  });
  const promoteMutation = useMutation({
    mutationFn: (id: string) => triggerSilverPromote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["silver-companies"] }).catch(() => undefined);
    },
  });

  const actionsColumn = useMemo(
    () =>
      createActionsColumn({
        onEnrich: (id) => {
          enrichMutation.mutateAsync(id).catch(() => undefined);
        },
        onPromote: (id) => {
          promoteMutation.mutateAsync(id).catch(() => undefined);
        },
      }),
    [enrichMutation, promoteMutation],
  );

  const columns = useMemo(
    () => [...makeSilverCompaniesColumns(setSelectedId), actionsColumn],
    [actionsColumn],
  );

  const silverCompanies = (companiesQuery.data?.data ?? []) as unknown as SilverCompanyRow[];
  const total = companiesQuery.data?.meta?.total ?? silverCompanies.length;

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
  const selectedCount = selectedIds.length;

  if (companiesQuery.isPending) {
    return (
      <PageWrapper title="Silver Companies">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (companiesQuery.isError) {
    return (
      <PageWrapper title="Silver Companies">
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
          Eroare la încărcarea datelor: {companiesQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Silver Companies"
      actions={
        <>
          <input
            className="px-3 py-2 rounded-md bg-s800 border border-s600 text-t1 text-sm"
            placeholder="Cauta dupa denumire, CUI sau Nr. Reg. Com."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "Ascunde filtre" : "Filtre"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              companiesQuery.refetch();
            }}
          >
            Refresh
          </Button>
        </>
      }
    >
      <SilverCompanyDrawer
        open={selectedId !== null}
        id={selectedId}
        onClose={() => setSelectedId(null)}
      />
      {showFilters && (
        <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg border border-s600 bg-s800 p-4">
          <div>
            <p className="mb-1 text-xs font-medium text-t3">Status Enrichment</p>
            <MultiSelectFilter
              options={[...ENRICHMENT_STATUS_OPTIONS]}
              values={enrichmentStatuses}
              onChange={(v) => {
                setEnrichmentStatuses(v);
                setPage(1);
              }}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-t3">Status Promovare</p>
            <MultiSelectFilter
              options={[...PROMOTION_STATUS_OPTIONS]}
              values={promotionStatuses}
              onChange={(v) => {
                setPromotionStatuses(v);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}
      <BulkActionBar
        selectedCount={selectedCount}
        onClear={() => setRowSelection({})}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                Promise.allSettled(selectedIds.map((id) => enrichMutation.mutateAsync(id))).catch(
                  () => undefined,
                );
                setRowSelection({});
              }}
            >
              Enrich All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                Promise.allSettled(selectedIds.map((id) => promoteMutation.mutateAsync(id))).catch(
                  () => undefined,
                );
                setRowSelection({});
              }}
            >
              Promote All
            </Button>
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Companii Validate</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={columns}
            data={silverCompanies}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => setPage(p)}
            pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
