import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Button, Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { fetchGoldCompanies } from "@/lib/etapa1-api.js";
import { DataTable } from "@/components/data/DataTable.js";
import { goldCompaniesColumns } from "@/lib/table-columns.js";
import type { GoldCompanyRow } from "@/lib/etapa1-types.js";

export function Gold() {
  const goldQuery = useQuery({
    queryKey: ["etapa1", "gold"],
    queryFn: () => fetchGoldCompanies({ limit: 50, offset: 0 }),
  });
  const goldLeads = (goldQuery.data?.data ?? []) as unknown as GoldCompanyRow[];

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
        <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
          Eroare la încărcarea datelor: {goldQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Gold Leads" actions={<Button>Launch Outreach</Button>}>
      <Card>
        <CardHeader>
          <CardTitle>Leads Gold</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable columns={goldCompaniesColumns} data={goldLeads} />
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
