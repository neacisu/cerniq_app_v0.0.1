import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { DataTable } from "@/components/data/DataTable.js";
import { DataTablePagination } from "@/components/data/DataTablePagination.js";
import { SearchInput } from "@/components/forms/SearchInput.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { bronzeContactsColumns } from "@/lib/table-columns.js";
import type { BronzeContactRow } from "@/lib/etapa1-types.js";
import { useBronzeContacts, useReprocessBronze } from "@/hooks/use-etapa1.js";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function Bronze() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const offset = (page - 1) * pageSize;

  const {
    data: response,
    isPending,
    isError,
    error,
  } = useBronzeContacts({
    limit: pageSize,
    offset,
    search: search || undefined,
  });

  const reprocessMutation = useReprocessBronze();

  const contacts = (response?.data ?? []) as unknown as BronzeContactRow[];
  const total = response?.meta?.total ?? contacts.length;

  const avgQuality =
    contacts.length === 0
      ? 0
      : Math.round(
          contacts.reduce((sum: number, row: Record<string, unknown>) => {
            const status = String(row.processingStatus ?? "pending");
            if (status === "promoted") return sum + 95;
            if (status === "processing") return sum + 60;
            if (status === "error") return sum + 20;
            return sum + 40;
          }, 0) / contacts.length,
        );

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
        <div className="rounded-lg border border-(--color-danger)/30 bg-(--color-danger)/10 p-4 text-sm text-(--color-danger)">
          Eroare la încărcarea datelor: {error?.message ?? "Eroare necunoscută"}
        </div>
      );
    }
    if (contacts.length === 0) {
      return (
        <EmptyState
          icon="Database"
          title="Niciun contact bronze"
          description={
            search
              ? "Niciun rezultat pentru căutarea curentă."
              : "Nu există contacte în stratul Bronze."
          }
        />
      );
    }
    return (
      <>
        <DataTable columns={bronzeContactsColumns} data={contacts} />
        <div className="pt-2 pb-1">
          {contacts.map((c) => (
            <button
              key={`r-${c.id}`}
              className="mr-3 text-xs text-b5 underline"
              onClick={() => reprocessMutation.mutate(String(c.id))}
            >
              Reprocess {c.extractedName ?? c.id}
            </button>
          ))}
        </div>
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </>
    );
  }

  return (
    <PageWrapper title="Bronze Contacte">
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm text-t3">Calitate Medie:</span>
        <span className="text-xl font-bold text-t1">{avgQuality}%</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Contacte Bronze</CardTitle>
            <SearchInput
              value={searchInput}
              onChange={(val) => setSearchInput(val)}
              placeholder="Caută după CUI, Nume firmă sau Nr. reg. com..."
            />
          </div>
        </CardHeader>
        <CardBody>{renderContent()}</CardBody>
      </Card>
    </PageWrapper>
  );
}
