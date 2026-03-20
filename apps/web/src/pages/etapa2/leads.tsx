import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { StageBadge } from "@/components/outreach/shared/StageBadge.js";
import { ChannelBadge } from "@/components/outreach/shared/ChannelIcon.js";
import { SentimentIndicator } from "@/components/outreach/shared/SentimentIndicator.js";
import { useOutreachLeads } from "@/hooks/use-etapa2.js";
import { downloadOutreachLeadsCsv, type LeadState, type LeadChannel } from "@/lib/etapa2-api.js";
import { cn } from "@/lib/utils.js";
import { StateChangeDialog } from "@/components/outreach/dialogs/StateChangeDialog.js";
import { EnrollSequenceDialog } from "@/components/outreach/dialogs/EnrollSequenceDialog.js";
import { toast } from "sonner";
import { LeadQuickViewPanel } from "@/components/outreach/leads/LeadQuickViewPanel.js";

const STATE_TABS: { label: string; value: LeadState | "ALL" }[] = [
  { label: "Toți", value: "ALL" },
  { label: "Rece", value: "COLD" },
  { label: "Contactat WA", value: "CONTACTED_WA" },
  { label: "Contactat Email", value: "CONTACTED_EMAIL" },
  { label: "Răspuns Cald", value: "WARM_REPLY" },
  { label: "Negociere", value: "NEGOTIATION" },
  { label: "Convertit", value: "CONVERTED" },
];

const LEADS_TABLE_SKELETON_KEYS = [
  "leads-sk-1",
  "leads-sk-2",
  "leads-sk-3",
  "leads-sk-4",
  "leads-sk-5",
] as const;

export function Leads() {
  const navigate = useNavigate();
  const [stateFilter, setStateFilter] = useState<LeadState | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollLeadIds, setEnrollLeadIds] = useState<string[]>([]);
  const [panelLeadId, setPanelLeadId] = useState<string | null>(null);
  const [panelStateDialog, setPanelStateDialog] = useState<{
    leadId: string;
    currentState: LeadState;
  } | null>(null);
  const rowClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params =
    stateFilter === "ALL" ? { page, limit: 20 } : { state: stateFilter, page, limit: 20 };
  const { data, isLoading } = useOutreachLeads(params);

  /** Referință stabilă pentru dependențe (react-hooks/exhaustive-deps); `?? []` altfel e nou la fiecare render. */
  const leads = useMemo(() => data?.data ?? [], [data?.data]);
  const meta = data?.meta;
  const totalPages = Math.max(1, meta?.pages ?? 1);

  const selectedLeads = useMemo(
    () => leads.filter((l) => selectedIds.has(l.id)),
    [leads, selectedIds],
  );

  const bulkStateContext = useMemo(() => {
    if (selectedLeads.length === 0) return null;
    const states = new Set(selectedLeads.map((l) => l.currentState));
    if (states.size !== 1) return { error: "mixed" as const };
    return { currentState: selectedLeads[0].currentState as LeadState };
  }, [selectedLeads]);

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAllOnPage = () => {
    if (leads.length === 0) return;
    if (selectedIds.size === leads.length && leads.every((l) => selectedIds.has(l.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const openStateChange = () => {
    if (selectedLeads.length === 0) return;
    if (bulkStateContext && "error" in bulkStateContext) {
      toast.error("Selectați lead-uri cu aceeași stare curentă pentru schimbare în bulk.");
      return;
    }
    setStateDialogOpen(true);
  };

  return (
    <PageWrapper
      title="Lead Management"
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-s600 bg-s800 px-3 py-1.5 text-sm text-t1 hover:bg-s700"
            onClick={async () => {
              try {
                await downloadOutreachLeadsCsv(stateFilter === "ALL" ? {} : { state: stateFilter });
                toast.success("CSV descărcat");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Export eșuat");
              }
            }}
          >
            Export CSV
          </button>
          <Link
            to="/outreach/leads/import"
            className="rounded-md border border-s600 bg-s800 px-3 py-1.5 text-sm text-t1 hover:bg-s700"
          >
            Import CSV
          </Link>
        </div>
      }
    >
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-b5/30 bg-b5/10 px-3 py-2 text-sm">
          <span className="text-t1 font-medium">{selectedIds.size} selectate</span>
          <button
            type="button"
            className="rounded-md bg-s800 px-2 py-1 text-xs text-t1 hover:bg-s700"
            onClick={openStateChange}
          >
            Schimbă stare
          </button>
          <button
            type="button"
            className="rounded-md bg-s800 px-2 py-1 text-xs text-t1 hover:bg-s700"
            onClick={() => {
              if (selectedLeads.length === 0) {
                toast.error("Selectați cel puțin un lead.");
                return;
              }
              setEnrollLeadIds(selectedLeads.map((l) => l.id));
              setEnrollDialogOpen(true);
            }}
          >
            Înrolare secvență
          </button>
          <button type="button" className="text-xs text-t3 hover:text-t1" onClick={clearSelection}>
            Anulează selecția
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STATE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setStateFilter(t.value);
              setPage(1);
              clearSelection();
            }}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap",
              stateFilter === t.value ? "bg-b5 text-s950" : "bg-s800 text-t2 hover:bg-s700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {LEADS_TABLE_SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Leads{meta ? ` (${meta.total})` : ""}</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {leads.length === 0 ? (
              <div className="px-5 py-8 text-center text-t3">Niciun lead găsit</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-s700 text-left text-t3">
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={leads.length > 0 && leads.every((l) => selectedIds.has(l.id))}
                        onChange={selectAllOnPage}
                        aria-label="Selectează toate pe pagină"
                      />
                    </th>
                    <th className="px-5 py-3">Companie</th>
                    <th className="px-5 py-3">Stare</th>
                    <th className="px-5 py-3">Canal</th>
                    <th className="px-5 py-3">Sentiment</th>
                    <th className="px-5 py-3">Ultimul contact</th>
                    <th className="px-5 py-3">Următor</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-s700 last:border-0 hover:bg-s800/50 cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("input[type=checkbox]")) return;
                        if (rowClickTimerRef.current) clearTimeout(rowClickTimerRef.current);
                        rowClickTimerRef.current = setTimeout(() => {
                          setPanelLeadId(lead.id);
                        }, 240);
                      }}
                      onDoubleClick={(e) => {
                        if ((e.target as HTMLElement).closest("input[type=checkbox]")) return;
                        e.preventDefault();
                        if (rowClickTimerRef.current) {
                          clearTimeout(rowClickTimerRef.current);
                          rowClickTimerRef.current = null;
                        }
                        navigate(`/outreach/leads/${lead.id}`);
                      }}
                    >
                      <td
                        className="px-3 py-3"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          aria-label={`Selectează ${lead.company?.name ?? lead.id}`}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-t1">{lead.company?.name ?? "—"}</p>
                          {lead.requiresHumanReview && (
                            <span className="text-[10px] text-amber-400">⚠ Review necesar</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <StageBadge stage={lead.currentState} size="sm" />
                      </td>
                      <td className="px-5 py-3">
                        {lead.channel ? (
                          <ChannelBadge channel={lead.channel as LeadChannel} size="sm" />
                        ) : (
                          <span className="text-t3">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <SentimentIndicator
                          score={lead.sentimentScore ?? null}
                          variant="compact"
                          showScore
                        />
                      </td>
                      <td className="px-5 py-3 text-t3 text-xs">
                        {lead.lastContactAt
                          ? new Date(lead.lastContactAt).toLocaleDateString("ro-RO")
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-t3 text-xs">
                        {lead.nextActionAt
                          ? new Date(lead.nextActionAt).toLocaleDateString("ro-RO")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {stateDialogOpen && bulkStateContext && !("error" in bulkStateContext) && (
        <StateChangeDialog
          leadIds={selectedLeads.map((l) => l.id)}
          currentState={bulkStateContext.currentState}
          onClose={() => setStateDialogOpen(false)}
        />
      )}

      {enrollDialogOpen && enrollLeadIds.length > 0 && (
        <EnrollSequenceDialog
          leadIds={enrollLeadIds}
          onClose={() => {
            setEnrollDialogOpen(false);
            setEnrollLeadIds([]);
          }}
        />
      )}

      {panelStateDialog && (
        <StateChangeDialog
          leadId={panelStateDialog.leadId}
          currentState={panelStateDialog.currentState}
          onClose={() => setPanelStateDialog(null)}
        />
      )}

      <LeadQuickViewPanel
        leadId={panelLeadId}
        onClose={() => setPanelLeadId(null)}
        onOpenStateChange={(id, currentState) => {
          setPanelStateDialog({ leadId: id, currentState });
          setPanelLeadId(null);
        }}
        onOpenEnroll={(id) => {
          setEnrollLeadIds([id]);
          setEnrollDialogOpen(true);
          setPanelLeadId(null);
        }}
      />

      {meta != null && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => {
              setPage((p) => p - 1);
              clearSelection();
            }}
            className="px-3 py-1.5 rounded-md text-sm bg-s800 text-t2 hover:bg-s700 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-sm text-t3">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => {
              setPage((p) => p + 1);
              clearSelection();
            }}
            className="px-3 py-1.5 rounded-md text-sm bg-s800 text-t2 hover:bg-s700 disabled:opacity-40"
          >
            Următor →
          </button>
        </div>
      )}
    </PageWrapper>
  );
}
