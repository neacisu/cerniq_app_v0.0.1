import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Spinner } from "@/components/ui/spinner.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { DataTable } from "@/components/data/DataTable.js";
import { DataTablePagination } from "@/components/data/DataTablePagination.js";
import { SearchInput } from "@/components/forms/SearchInput.js";
import { goldCompaniesColumns } from "@/lib/table-columns.js";
import type { GoldCompanyRow } from "@/lib/etapa1-types.js";
import { useGoldCompanies } from "@/hooks/use-etapa1.js";

const PAGE_SIZE = 25;

export function GoldContacts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const offset = (page - 1) * PAGE_SIZE;
  const {
    data: response,
    isPending,
    isError,
    error,
  } = useGoldCompanies({
    limit: PAGE_SIZE,
    offset,
  });

  const allRows = (response?.data ?? []) as unknown as GoldCompanyRow[];
  const filtered = search
    ? allRows.filter((r) => {
        const s = search.toLowerCase();
        const row = r as Record<string, unknown>;
        return (
          String(row.denumire ?? "")
            .toLowerCase()
            .includes(s) ||
          String(row.judetCod ?? "")
            .toLowerCase()
            .includes(s) ||
          String(row.currentState ?? "")
            .toLowerCase()
            .includes(s)
        );
      })
    : allRows;
  const total = response?.meta?.total ?? filtered.length;

  function renderContent() {
    if (isPending) {
      return (
        <div className="flex items-center justify-center py-16">
          <Spinner size={32} />
        </div>
      );
    }
    if (isError) {
      return (
        <div className="rounded-lg border border-(--color-danger) bg-(--color-danger)/10 p-4 text-sm text-(--color-danger)">
          Eroare la incarcarea companiilor gold: {error?.message ?? "Eroare necunoscuta"}
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <EmptyState
          icon="Star"
          title="Nicio companie gold"
          description={
            search
              ? "Niciun rezultat pentru cautarea curenta."
              : "Nu exista companii in stratul Gold."
          }
        />
      );
    }
    return (
      <>
        <DataTable columns={goldCompaniesColumns} data={filtered} />
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
    <PageWrapper title="Gold Contacts">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Companii Gold (contact scope)</CardTitle>
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Filtreaza dupa denumire, judet..."
            />
          </div>
        </CardHeader>
        <CardBody>{renderContent()}</CardBody>
      </Card>
    </PageWrapper>
  );
}
