import { useState, useMemo, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { createOutreachLeadsFromGold } from "@/lib/etapa2-api.js";
import { buildGoldSelectColumnDef } from "@/pages/etapa1/gold-select-column-def.js";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const GOLD_STATE_OPTIONS = [
  { label: "Cold", value: "COLD" },
  { label: "Contacted WA", value: "CONTACTED_WA" },
  { label: "Contacted Email", value: "CONTACTED_EMAIL" },
  { label: "Contacted Phone", value: "CONTACTED_PHONE" },
  { label: "Warm Reply", value: "WARM_REPLY" },
  { label: "Engaged", value: "ENGAGED" },
  { label: "Negotiation", value: "NEGOTIATION" },
  { label: "Proposal", value: "PROPOSAL" },
  { label: "Closing", value: "CLOSING" },
  { label: "Converted", value: "CONVERTED" },
  { label: "Onboarding", value: "ONBOARDING" },
  { label: "Nurturing Active", value: "NURTURING_ACTIVE" },
  { label: "At Risk", value: "AT_RISK" },
  { label: "Loyal Advocate", value: "LOYAL_ADVOCATE" },
  { label: "Churned", value: "CHURNED" },
  { label: "Dead", value: "DEAD" },
  { label: "Do Not Contact", value: "DO_NOT_CONTACT" },
] as const;

export function Gold() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentStates, setCurrentStates] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchJudet, setSearchJudet] = useState("");
  /** Doar companii fără rând în `lead_journey` (outreach). */
  const [notInOutreachOnly, setNotInOutreachOnly] = useState(false);

  const offset = (page - 1) * pageSize;

  const goldQuery = useGoldCompanies({
    limit: pageSize,
    offset,
    currentState: currentStates.length > 0 ? currentStates : undefined,
    judetCod: searchJudet || undefined,
    notInOutreach: notInOutreachOnly ? true : undefined,
  });
  /** Referință stabilă — evită `[]` nou la fiecare render când lipsește `data` (react-hooks/exhaustive-deps). */
  const goldLeads = useMemo(
    () => (goldQuery.data?.data ?? []) as unknown as GoldCompanyRow[],
    [goldQuery.data?.data],
  );
  const total = goldQuery.data?.meta?.total ?? goldLeads.length;

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectPage = useCallback(() => {
    const pageIds = goldLeads.map((r) => r.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }, [goldLeads, selectedIds]);

  const addToOutreachMutation = useMutation({
    mutationFn: (ids: string[]) => createOutreachLeadsFromGold(ids),
    onSuccess: async (res) => {
      const d = res.data;
      await queryClient.invalidateQueries({ queryKey: ["etapa2", "leads"] });
      toast.success(
        `Outreach: ${d.created} create, ${d.alreadyExists} deja existente` +
          (d.rejectedDnc ? `, ${d.rejectedDnc} DNC` : "") +
          (d.rejectedNoContact ? `, ${d.rejectedNoContact} fără contact` : "") +
          (d.notFound ? `, ${d.notFound} negăsite` : ""),
      );
      setSelectedIds(new Set());
    },
    onError: (e: Error) => {
      toast.error(e.message ?? "Eroare la adăugare în outreach");
    },
  });

  const columns = useMemo((): ColumnDef<GoldCompanyRow>[] => {
    const base = makeGoldCompaniesColumns(setSelectedId);
    const pageIds = goldLeads.map((r) => r.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    return [
      buildGoldSelectColumnDef(allPageSelected, toggleSelectPage, selectedIds, toggleRow),
      ...base,
    ];
  }, [goldLeads, selectedIds, toggleRow, toggleSelectPage, setSelectedId]);

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
          <div className="col-span-2 flex items-center gap-2">
            <input
              id="gold-not-in-outreach"
              type="checkbox"
              className="h-4 w-4 rounded border-s600"
              checked={notInOutreachOnly}
              onChange={(e) => {
                setNotInOutreachOnly(e.target.checked);
                setPage(1);
              }}
            />
            <label htmlFor="gold-not-in-outreach" className="text-sm text-t2">
              Doar companii nepromovate în Outreach (fără lead_journey)
            </label>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-b5/40 bg-s800 px-4 py-3">
          <span className="text-sm text-t2">{selectedIds.size} selectat(e)</span>
          <Button
            variant="brand"
            disabled={addToOutreachMutation.isPending}
            onClick={() => addToOutreachMutation.mutate([...selectedIds])}
          >
            {addToOutreachMutation.isPending
              ? "Se adaugă…"
              : `Adaugă la Outreach (${selectedIds.size})`}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Anulează selecția
          </Button>
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
