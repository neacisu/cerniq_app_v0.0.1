import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Card, CardHeader, CardTitle, CardBody, Input } from "@/components/ui/index.js";
import { fetchBronzeContacts, reprocessBronzeContact } from "@/lib/etapa1-api.js";
import { DataTable } from "@/components/data/DataTable.js";
import { bronzeContactsColumns } from "@/lib/table-columns.js";
import type { BronzeContactRow } from "@/lib/etapa1-types.js";

export function Bronze() {
  const [search, setSearch] = useState("");
  const contactsQuery = useQuery({
    queryKey: ["etapa1", "bronze", search],
    queryFn: () => fetchBronzeContacts({ limit: 50, offset: 0, search: search || undefined }),
  });
  const reprocessMutation = useMutation({
    mutationFn: (id: string) => reprocessBronzeContact(id),
    onSuccess: () => {
      void contactsQuery.refetch();
    },
  });
  const contacts = (contactsQuery.data?.data ?? []) as unknown as BronzeContactRow[];
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

  if (contactsQuery.isPending) {
    return (
      <PageWrapper title="Bronze Contacte">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (contactsQuery.isError) {
    return (
      <PageWrapper title="Bronze Contacte">
        <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
          Eroare la încărcarea datelor: {contactsQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Bronze Contacte">
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm text-[var(--color-t3)]">Calitate Medie:</span>
        <span className="text-xl font-bold text-[var(--color-t1)]">{avgQuality}%</span>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Caută firmă sau CUI..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacte Bronze</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable columns={bronzeContactsColumns} data={contacts} />
          <div className="px-5 pb-4">
            {contacts.map((c) => (
              <button
                key={`r-${c.id}`}
                className="mr-3 text-xs text-[var(--color-b5)] underline"
                onClick={() => void reprocessMutation.mutateAsync(String(c.id))}
              >
                Reprocess {c.extractedName ?? c.id}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
