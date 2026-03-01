import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Button, Card, CardHeader, CardTitle, CardBody, TBadge } from "@/components/ui/index.js";
import {
  fetchSilverCompanies,
  triggerSilverEnrich,
  triggerSilverPromote,
} from "@/lib/etapa1-api.js";
import { DataTable } from "@/components/data/DataTable.js";
import { silverCompaniesColumns } from "@/lib/table-columns.js";
import type { SilverCompanyRow } from "@/lib/etapa1-types.js";

export function Silver() {
  const [search, setSearch] = useState("");
  const companiesQuery = useQuery({
    queryKey: ["etapa1", "silver", search],
    queryFn: () => fetchSilverCompanies({ limit: 50, offset: 0, search: search || undefined }),
  });
  const enrichMutation = useMutation({
    mutationFn: (id: string) => triggerSilverEnrich(id),
  });
  const promoteMutation = useMutation({
    mutationFn: (id: string) => triggerSilverPromote(id),
    onSuccess: () => void companiesQuery.refetch(),
  });
  const silverCompanies = (companiesQuery.data?.data ?? []) as unknown as SilverCompanyRow[];

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
        <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
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
            className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-s800)] border border-[var(--color-s600)] text-[var(--color-t1)] text-sm"
            placeholder="Cauta dupa denumire/CUI"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outline" onClick={() => void companiesQuery.refetch()}>
            Refresh
          </Button>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Companii Validate</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable columns={silverCompaniesColumns} data={silverCompanies} />
          <div className="px-5 pb-4">
            {silverCompanies.map((c) => (
              <div key={`actions-${c.id}`} className="mb-1 flex items-center gap-2 text-xs">
                <TBadge tier={String(c.promotionStatus) === "promoted" ? "gold" : "silver"} />
                <button
                  className="text-[var(--color-b5)] underline"
                  onClick={() => void enrichMutation.mutateAsync(String(c.id))}
                >
                  Enrich {c.denumire ?? c.id}
                </button>
                <button
                  className="text-[var(--color-ok)] underline"
                  onClick={() => void promoteMutation.mutateAsync(String(c.id))}
                >
                  Promote
                </button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
