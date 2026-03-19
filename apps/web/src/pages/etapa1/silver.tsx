import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Button, Card, CardHeader, CardTitle, CardBody, TBadge } from "@/components/ui/index.js";
import { triggerSilverEnrich, triggerSilverPromote } from "@/lib/etapa1-api.js";
import { DataTable } from "@/components/data/DataTable.js";
import { DataTablePagination } from "@/components/data/DataTablePagination.js";
import { makeSilverCompaniesColumns } from "@/lib/table-columns.js";
import { useSilverCompanies } from "@/hooks/use-etapa1.js";
import { SilverCompanyDrawer } from "@/components/drawers/SilverCompanyDrawer.js";
import type { SilverCompanyRow } from "@/lib/etapa1-types.js";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const offset = (page - 1) * pageSize;

  const companiesQuery = useSilverCompanies({
    limit: pageSize,
    offset,
    search: search || undefined,
  });
  const enrichMutation = useMutation({
    mutationFn: (id: string) => triggerSilverEnrich(id),
  });
  const promoteMutation = useMutation({
    mutationFn: (id: string) => triggerSilverPromote(id),
    onSuccess: () => {
      companiesQuery.refetch();
    },
  });

  const actionsColumn = useMemo(
    () =>
      createActionsColumn({
        onEnrich: (id) => {
          enrichMutation.mutateAsync(id);
        },
        onPromote: (id) => {
          promoteMutation.mutateAsync(id);
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
      <Card>
        <CardHeader>
          <CardTitle>Companii Validate</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable columns={columns} data={silverCompanies} />
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
