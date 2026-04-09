import { useLayoutEffect, useMemo, useRef } from "react";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { Activity, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.js";
import { SBadge } from "@/components/ui/index.js";
import { Spinner } from "@/components/ui/spinner.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { useBackgroundProcesses } from "@/hooks/use-background-processes.js";
import { api } from "@/lib/api.js";
import type {
  SystemProcessesResponse,
  SystemProcessCategory,
  SystemProcessRow,
} from "@/lib/system-processes-api.js";
import { cn } from "@/lib/utils.js";

/** Referință stabilă când API-ul nu trimite încă `processes` — evită array nou la fiecare render (exhaustive-deps / grouped). */
const EMPTY_PROCESS_ROWS: SystemProcessRow[] = [];

const CATEGORY_ORDER: SystemProcessCategory[] = [
  "Imports",
  "Enrichment Pipeline",
  "Outreach Batches",
  "AI Tasks",
  "Other",
];

function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function statusBadgeLabel(status: SystemProcessRow["status"]): string {
  switch (status) {
    case "running":
      return "PROCESSING";
    case "queued":
      return "PENDING";
    case "paused":
      return "PAUSED";
    case "failed":
      return "FAILED";
    case "completed":
      return "COMPLETED";
    default:
      return String(status).toUpperCase();
  }
}

function statusDot(
  status: SystemProcessRow["status"],
): "ok" | "warning" | "error" | "info" | "neutral" {
  if (status === "running") return "ok";
  if (status === "failed") return "error";
  if (status === "paused") return "warning";
  if (status === "queued") return "info";
  return "neutral";
}

function groupByCategory(rows: SystemProcessRow[]): Map<SystemProcessCategory, SystemProcessRow[]> {
  const map = new Map<SystemProcessCategory, SystemProcessRow[]>();
  for (const c of CATEGORY_ORDER) map.set(c, []);
  for (const row of rows) {
    const list = map.get(row.category) ?? [];
    list.push(row);
    map.set(row.category, list);
  }
  return map;
}

type PanelMainProps = {
  q: UseQueryResult<SystemProcessesResponse, Error>;
  processes: SystemProcessRow[];
  grouped: Map<SystemProcessCategory, SystemProcessRow[]>;
  cancelMutation: UseMutationResult<void, unknown, string, unknown>;
};

function BackgroundPanelProcessList({
  grouped,
  cancelMutation,
}: Readonly<Pick<PanelMainProps, "grouped" | "cancelMutation">>) {
  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped.get(cat) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={cat}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-t3">
              {cat}
            </h3>
            <ul className="space-y-2">
              {items.map((p) => (
                <li key={p.id} className="rounded-lg border border-s700/80 bg-s800/40 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <StatusDot status={statusDot(p.status)} className="mt-1.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-t1">{p.name}</span>
                        <SBadge status={statusBadgeLabel(p.status)} />
                      </div>
                      {typeof p.progressPercent === "number" ? (
                        <div className="mt-2">
                          <div className="h-1.5 overflow-hidden rounded-full bg-s700">
                            <div
                              className="h-full rounded-full bg-sky-500 transition-all"
                              style={{ width: `${p.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-t3">{p.progressPercent}%</span>
                        </div>
                      ) : null}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-t3">
                        {typeof p.durationMs === "number" ? (
                          <span>Durată ~{formatDuration(p.durationMs)}</span>
                        ) : null}
                        {p.startedAt ? (
                          <span>Început: {new Date(p.startedAt).toLocaleString("ro-RO")}</span>
                        ) : null}
                      </div>
                      {typeof p.meta?.waiting === "number" ? (
                        <div className="mt-1 text-[10px] text-t3 font-mono">
                          w {p.meta.waiting} · a {Number(p.meta.active ?? 0)} · d{" "}
                          {Number(p.meta.delayed ?? 0)} · f {Number(p.meta.failed ?? 0)}
                        </div>
                      ) : null}
                    </div>
                    {p.cancellable && p.cancel?.kind === "import_batch" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-er border-er/40"
                        disabled={cancelMutation.isPending}
                        onClick={() => {
                          const ok = globalThis.window?.confirm(
                            "Anulați acest import? Joburile în curs pot fi oprite.",
                          );
                          if (!ok) return;
                          const bid = p.cancel?.batchId;
                          if (!bid) return;
                          cancelMutation.mutate(bid);
                        }}
                      >
                        Anulează
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function BackgroundPanelMainContent({
  q,
  processes,
  grouped,
  cancelMutation,
}: Readonly<PanelMainProps>) {
  if (q.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size={28} />
      </div>
    );
  }
  if (q.isError) {
    return (
      <p className="text-sm text-er" role="alert">
        {q.error instanceof Error ? q.error.message : "Eroare la încărcare"}
      </p>
    );
  }
  if (processes.length === 0) {
    return <p className="text-sm text-t3 py-8 text-center">Niciun proces activ raportat.</p>;
  }
  return <BackgroundPanelProcessList grouped={grouped} cancelMutation={cancelMutation} />;
}

export function BackgroundProcessPanel({
  open,
  onClose,
  query,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  query: ReturnType<typeof useBackgroundProcesses>;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const qc = useQueryClient();
  const q = query;
  const data = q.data?.data;
  const processesList = data?.processes;
  const processes = useMemo(() => processesList ?? EMPTY_PROCESS_ROWS, [processesList]);
  const grouped = useMemo(() => groupByCategory(processes), [processes]);

  const cancelMutation = useMutation({
    mutationFn: async (batchId: string) => {
      await api.post(`/api/v1/imports/${batchId}/cancel`, {});
    },
    onSuccess: async () => {
      toast.success("Import anulat.");
      await qc.invalidateQueries({ queryKey: ["background-processes"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Anulare eșuată";
      toast.error(msg);
    },
  });

  useLayoutEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;
    if (typeof el.showModal === "function") {
      el.showModal();
      return () => {
        el.close();
      };
    }
    el.setAttribute("open", "");
    return () => {
      el.removeAttribute("open");
    };
  }, [open]);

  if (!open) return null;

  const monitoringUnavailable = data?.queuesReachable === false;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[70] m-0 flex h-full max-h-none w-full max-w-none flex-row border-0 bg-transparent p-0 [&::backdrop]:bg-transparent"
      aria-labelledby="bg-process-title"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        type="button"
        className="min-h-0 min-w-0 flex-1 cursor-default bg-black/50"
        aria-label="Închide panoul procese"
        onClick={onClose}
      />
      <div className="flex h-full w-full max-w-md shrink-0 flex-col border-l border-s600 bg-s900 shadow-xl">
        <div className="flex items-center justify-between border-b border-s600 px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-sky-400" aria-hidden />
            <h2 id="bg-process-title" className="text-sm font-semibold text-t1">
              Procese în fundal
            </h2>
          </div>
          <button
            type="button"
            className="rounded p-1 text-t3 hover:bg-s800 hover:text-t1"
            onClick={onClose}
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-s600 px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <KpiCard
              label="Active (estimare)"
              value={String(data?.activeCount ?? 0)}
              icon="Layers"
              delay={0}
            />
            <KpiCard
              label="Monitoring cozi"
              value={data?.queuesReachable === false ? "Off" : "OK"}
              icon="Server"
              delay={60}
            />
          </div>
          {monitoringUnavailable ? (
            <output className="mt-2 block text-[11px] text-wa">
              Monitoring API indisponibil — se afișează doar importurile din tenant.
            </output>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <BackgroundPanelMainContent
            q={q}
            processes={processes}
            grouped={grouped}
            cancelMutation={cancelMutation}
          />
        </div>

        <div className={cn("border-t border-s600 px-4 py-2 text-[10px] text-t4")}>
          Reîmprospătare 5s · surse: Monitoring /api/queues + importuri tenant
        </div>
      </div>
    </dialog>
  );
}
