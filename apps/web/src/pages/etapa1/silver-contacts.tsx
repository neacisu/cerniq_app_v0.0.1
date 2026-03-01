import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Spinner } from "@/components/ui/spinner.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { DataTable } from "@/components/data/DataTable.js";
import { DataTablePagination } from "@/components/data/DataTablePagination.js";
import { SearchInput } from "@/components/forms/SearchInput.js";
import { silverCompaniesColumns } from "@/lib/table-columns.js";
import type { SilverCompanyRow } from "@/lib/etapa1-types.js";
import { useSilverCompanies } from "@/hooks/use-etapa1.js";

const PAGE_SIZE = 25;

export function SilverContacts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const offset = (page - 1) * PAGE_SIZE;
  const {
    data: response,
    isPending,
    isError,
    error,
  } = useSilverCompanies({
    limit: PAGE_SIZE,
    offset,
    search: search || undefined,
  });

  const rows = (response?.data ?? []) as unknown as SilverCompanyRow[];
  const total = response?.meta?.total ?? rows.length;

  return (
    <PageWrapper title="Silver Contacts">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Companii Silver (contact scope)</CardTitle>
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Cauta dupa denumire, CUI..."
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
              Eroare la incarcarea companiilor silver: {error?.message ?? "Eroare necunoscuta"}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon="Building"
              title="Nicio companie silver"
              description={
                search
                  ? "Niciun rezultat pentru cautarea curenta."
                  : "Nu exista companii in stratul Silver."
              }
            />
          ) : (
            <>
              <DataTable columns={silverCompaniesColumns} data={rows} />
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
