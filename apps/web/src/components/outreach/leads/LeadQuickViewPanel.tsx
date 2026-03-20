import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useOutreachLead } from "@/hooks/use-etapa2.js";
import { StageBadge } from "@/components/outreach/shared/StageBadge.js";
import { SentimentIndicator } from "@/components/outreach/shared/SentimentIndicator.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { cn } from "@/lib/utils.js";
import type { LeadState } from "@/lib/etapa2-api.js";

type LeadQuickViewPanelProps = {
  readonly leadId: string | null;
  readonly onClose: () => void;
  readonly onOpenStateChange?: (id: string, currentState: LeadState) => void;
  readonly onOpenEnroll?: (id: string) => void;
};

/**
 * Panou slide-over dreapta — quick view lead (spec etapa2-ui-pages §3.1).
 * Folosește `<dialog>` nativ + `showModal()` pentru accesibilitate (focus trap, Escape).
 */
export function LeadQuickViewPanel({
  leadId,
  onClose,
  onOpenStateChange,
  onOpenEnroll,
}: Readonly<LeadQuickViewPanelProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data, isLoading } = useOutreachLead(leadId ?? undefined);
  const lead = data?.data;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (leadId) {
      if (!el.open) el.showModal();
    } else {
      el.close();
    }
  }, [leadId]);

  if (!leadId) {
    return null;
  }

  const lastMsg = lead?.communications?.[0];

  const panelBody = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      );
    }
    if (!lead) {
      return <p className="text-t3 text-sm">Nu s-au putut încărca datele.</p>;
    }
    return (
      <>
        <div>
          <p className="text-xs text-t3 mb-1">Companie</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-t1 font-medium text-lg">{lead.company?.name ?? "—"}</p>
            <StageBadge stage={lead.currentState} size="sm" />
          </div>
        </div>

        <div className="grid gap-2 text-sm">
          <div>
            <span className="text-t3">Email: </span>
            <span className="text-t1">{lead.company?.email ?? "—"}</span>
          </div>
          <div>
            <span className="text-t3">Telefon: </span>
            <span className="text-t1">{lead.company?.telefon ?? "—"}</span>
          </div>
          <div>
            <span className="text-t3">Județ: </span>
            <span className="text-t1">{lead.company?.judet ?? "—"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-t3">Sentiment</span>
          <SentimentIndicator score={lead.sentimentScore ?? null} variant="compact" showScore />
        </div>
        <div>
          <p className="text-xs text-t3 mb-1">Răspunsuri / engagement</p>
          <p className="text-sm text-t3">
            replyCount: {lead.replyCount ?? 0} · engagement: {lead.engagementScore ?? "—"}
          </p>
        </div>

        <div className="rounded-md border border-s700 bg-s800/50 p-3">
          <p className="text-xs text-t3 mb-1">Ultimul mesaj</p>
          <p className="text-sm text-t2 line-clamp-4">
            {lastMsg?.contentPreview ?? "Niciun mesaj încă."}
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            className="rounded-md border border-s600 bg-s800 px-3 py-2 text-sm text-t1 hover:bg-s700"
            onClick={() => onOpenStateChange?.(lead.id, lead.currentState)}
          >
            Schimbă stare
          </button>
          <button
            type="button"
            className="rounded-md border border-s600 bg-s800 px-3 py-2 text-sm text-t1 hover:bg-s700"
            onClick={() => onOpenEnroll?.(lead.id)}
          >
            Înrolare în secvență
          </button>
          <Link
            to={`/outreach/leads/${lead.id}/conversation`}
            className="rounded-md border border-b5/40 bg-b5/10 px-3 py-2 text-center text-sm text-b5 hover:bg-b5/20"
            onClick={onClose}
          >
            Trimite mesaj
          </Link>
          <Link
            to={`/outreach/leads/${lead.id}`}
            className="rounded-md bg-b5 px-3 py-2 text-center text-sm text-s950 font-medium hover:opacity-90"
            onClick={onClose}
          >
            Deschide detalii
          </Link>
        </div>
      </>
    );
  };

  return (
    <dialog
      ref={dialogRef}
      id="lead-quick-view-dialog"
      className={cn(
        "fixed inset-0 z-50 m-0 max-h-none max-w-none h-full w-full max-w-full border-0 bg-transparent p-0",
        "backdrop:bg-black/50",
      )}
      aria-labelledby="lead-quick-view-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="relative flex h-full w-full justify-end">
        <button
          type="button"
          className="absolute inset-0 z-0 bg-black/50"
          aria-label="Închide panoul"
          onClick={onClose}
        />
        <div
          className={cn(
            "relative z-10 h-full w-full max-w-md border-l border-s700 bg-s900 shadow-xl",
            "flex flex-col animate-in slide-in-from-right duration-200",
          )}
        >
          <div className="flex items-center justify-between border-b border-s700 px-4 py-3">
            <h2 id="lead-quick-view-title" className="text-lg font-semibold text-t1">
              Quick view
            </h2>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm text-t3 hover:bg-s800 hover:text-t1"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">{panelBody()}</div>
        </div>
      </div>
    </dialog>
  );
}
