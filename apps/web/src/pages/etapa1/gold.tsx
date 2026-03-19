import { useState, useMemo } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Button, Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { DataTable } from "@/components/data/DataTable.js";
import { DataTablePagination } from "@/components/data/DataTablePagination.js";
import { makeGoldCompaniesColumns } from "@/lib/table-columns.js";
import { useGoldCompanies } from "@/hooks/use-etapa1.js";
import { GoldCompanyDrawer } from "@/components/drawers/GoldCompanyDrawer.js";
import type { GoldCompanyRow } from "@/lib/etapa1-types.js";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function Gold() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const columns = useMemo(() => makeGoldCompaniesColumns(setSelectedId), []);

  const offset = (page - 1) * pageSize;

  const goldQuery = useGoldCompanies({ limit: pageSize, offset });
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
    <PageWrapper title="Gold Leads" actions={<Button>Launch Outreach</Button>}>
      <GoldCompanyDrawer
        open={selectedId !== null}
        id={selectedId}
        onClose={() => setSelectedId(null)}
      />
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
          <div className="px-5 pb-4">
            {goldLeads.map((c) => (
              <Button key={`send-${c.id}`} size="sm" className="mr-2 mb-2">
                Send {c.denumire ?? c.id}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
