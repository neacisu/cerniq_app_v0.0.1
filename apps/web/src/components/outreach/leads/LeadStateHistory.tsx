import { STAGE_CONFIG } from "@/components/outreach/shared/stage-config.js";
import type { OutreachLead } from "@/lib/etapa2-api.js";

type LeadStateHistoryProps = {
  readonly lead: OutreachLead;
};

/** Istoric minim al tranzitiei de stare (date din `lead_journey`). */
export function LeadStateHistory({ lead }: Readonly<LeadStateHistoryProps>) {
  return (
    <div className="rounded-lg border border-s700 bg-s800/40 p-4">
      <h3 className="text-sm font-semibold text-t1 mb-3">Istoric stare</h3>
      <div className="relative border-l-2 border-s600 pl-4 space-y-4">
        <div className="relative">
          <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-s600" />
          <p className="text-xs text-t3">Stare curentă</p>
          <p className="text-sm font-medium text-b5">
            {STAGE_CONFIG[lead.currentState]?.label ?? lead.currentState}
          </p>
        </div>
        {lead.previousState && (
          <div className="relative">
            <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-s500" />
            <p className="text-xs text-t3">Stare anterioară</p>
            <p className="text-sm text-t2">
              {STAGE_CONFIG[lead.previousState]?.label ?? lead.previousState}
            </p>
          </div>
        )}
        <div className="text-xs text-t3 space-y-1">
          <p>
            Ultima modificare:{" "}
            {lead.stateChangedAt ? new Date(lead.stateChangedAt).toLocaleString("ro-RO") : "—"}
          </p>
          {lead.stateChangeReason ? (
            <p>
              Motiv: <span className="text-t2">{lead.stateChangeReason}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
