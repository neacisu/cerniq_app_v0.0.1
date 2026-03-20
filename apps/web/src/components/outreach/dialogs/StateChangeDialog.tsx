import { useState } from "react";
import { Button } from "@/components/ui";
import { useUpdateLead } from "@/hooks/use-etapa2";
import type { LeadState } from "@/lib/etapa2-api";
import { STAGE_CONFIG } from "@/components/outreach/shared/stage-config.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const VALID_TRANSITIONS: Record<LeadState, LeadState[]> = {
  COLD: ["CONTACTED_WA", "CONTACTED_EMAIL", "DEAD"],
  CONTACTED_WA: ["WARM_REPLY", "DEAD", "PAUSED"],
  CONTACTED_EMAIL: ["WARM_REPLY", "DEAD", "PAUSED"],
  WARM_REPLY: ["NEGOTIATION", "DEAD", "PAUSED"],
  NEGOTIATION: ["CONVERTED", "DEAD", "PAUSED"],
  CONVERTED: [],
  DEAD: ["COLD"],
  PAUSED: ["COLD", "CONTACTED_WA", "CONTACTED_EMAIL"],
};

interface StateChangeDialogProps {
  readonly leadId: string;
  readonly currentState: LeadState;
  readonly companyName?: string;
  readonly onClose: () => void;
}

export function StateChangeDialog({
  leadId,
  currentState,
  companyName,
  onClose,
}: Readonly<StateChangeDialogProps>) {
  const [newState, setNewState] = useState<LeadState | null>(null);
  const { mutateAsync, isPending } = useUpdateLead();

  const validTargets = VALID_TRANSITIONS[currentState] ?? [];

  const handleChange = async () => {
    if (!newState) return;
    try {
      await mutateAsync({ id: leadId, payload: { currentState: newState } });
      toast.success(`Lead mutat în starea ${newState}`);
      onClose();
    } catch {
      toast.error("Eroare la schimbarea stării");
    }
  };

  const overlayClass =
    "fixed inset-0 z-50 flex items-center justify-center bg-s950/80 backdrop-blur-sm";
  const panelClass = "w-full max-w-sm rounded-xl border border-s600 bg-s800 p-5 shadow-2xl";

  return (
    <div className={overlayClass}>
      <div className={panelClass}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-t1">Schimbare Stare Lead</h3>
          <button type="button" onClick={onClose} className="text-t3 hover:text-t1">
            ✕
          </button>
        </div>

        {companyName && (
          <p className="mb-4 text-sm text-t2">
            <span className="font-medium text-t1">{companyName}</span>
          </p>
        )}

        <p className="mb-3 text-xs text-t3">
          Stare curentă:{" "}
          <span className="font-medium text-t1">
            {STAGE_CONFIG[currentState]?.label ?? currentState}
          </span>
        </p>

        {validTargets.length === 0 ? (
          <p className="text-sm text-t3 mb-4">Nicio tranziție validă disponibilă.</p>
        ) : (
          <div className="mb-4 space-y-1">
            {validTargets.map((state) => {
              const cfg = STAGE_CONFIG[state];
              return (
                <button
                  type="button"
                  key={state}
                  onClick={() => setNewState(state)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                    newState === state
                      ? "border border-b5/40 bg-b5/20 text-b5"
                      : "bg-s700 text-t2 hover:bg-s600",
                  )}
                >
                  → {cfg?.label ?? state}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Anulează
          </Button>
          <Button size="sm" onClick={handleChange} disabled={isPending || !newState}>
            {isPending ? "Se salvează..." : "Aplică Schimbare"}
          </Button>
        </div>
      </div>
    </div>
  );
}
