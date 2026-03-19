import { useState, useMemo } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Button, Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { DataTable } from "@/components/data/DataTable.js";
import { DataTablePagination } from "@/components/data/DataTablePagination.js";
import { MultiSelectFilter } from "@/components/data/MultiSelectFilter.js";
import { makeGoldCompaniesColumns } from "@/lib/table-columns.js";
import { useGoldCompanies } from "@/hooks/use-etapa1.js";
import { GoldCompanyDrawer } from "@/components/drawers/GoldCompanyDrawer.js";
import type { GoldCompanyRow } from "@/lib/etapa1-types.js";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const GOLD_STATE_OPTIONS = [
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Qualified", value: "qualified" },
  { label: "Proposal", value: "proposal" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
  { label: "Do Not Contact", value: "do_not_contact" },
] as const;

export function Gold() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentStates, setCurrentStates] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchJudet, setSearchJudet] = useState("");

  const columns = useMemo(() => makeGoldCompaniesColumns(setSelectedId), []);

  const offset = (page - 1) * pageSize;

  const goldQuery = useGoldCompanies({
    limit: pageSize,
    offset,
    currentState: currentStates.length > 0 ? currentStates : undefined,
    judetCod: searchJudet || undefined,
  });
  const goldLeads = (goldQuery.data?.data ?? []) as unknown as GoldCompanyRow[];
  const total = goldQuery.data?.meta?.total ?? goldLeads.length;

  if (goldQuery.isPending) {
    return (
      <PageWrapper title="Gold Leads">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (goldQuery.isError) {
    return (
      <PageWrapper title="Gold Leads">
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
          Eroare la încărcarea datelor: {goldQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Gold Leads"
      actions={
        <>
          <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "Ascunde filtre" : "Filtre"}
          </Button>
          <Button variant="outline" onClick={() => goldQuery.refetch()}>
            Refresh
          </Button>
        </>
      }
    >
      <GoldCompanyDrawer
        open={selectedId !== null}
        id={selectedId}
        onClose={() => setSelectedId(null)}
      />
      {showFilters && (
        <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg border border-s600 bg-s800 p-4">
          <div>
            <p className="mb-1 text-xs font-medium text-t3">Stare Lead</p>
            <MultiSelectFilter
              options={[...GOLD_STATE_OPTIONS]}
              values={currentStates}
              onChange={(v) => {
                setCurrentStates(v);
                setPage(1);
              }}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-t3">Județ</p>
            <input
              className="w-full px-3 py-2 rounded-md bg-s700 border border-s600 text-t1 text-sm"
              placeholder="Ex: B, CJ, IS..."
              value={searchJudet}
              onChange={(e) => {
                setSearchJudet(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Leads Gold</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable columns={columns} data={goldLeads} />
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
