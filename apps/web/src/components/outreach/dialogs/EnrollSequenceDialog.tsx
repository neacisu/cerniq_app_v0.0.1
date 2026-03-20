import { useState } from "react";
import { Button } from "@/components/ui";
import { useEnrollSequence, useOutreachSequences } from "@/hooks/use-etapa2";
import type { OutreachSequence } from "@/lib/etapa2-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EnrollSequenceDialogProps {
  readonly leadIds: readonly string[];
  readonly onClose: () => void;
}

function leadSelectionSummary(count: number): string {
  if (count === 1) {
    return "1 lead selectat";
  }
  return `${count} leaduri selectate`;
}

export function EnrollSequenceDialog({ leadIds, onClose }: Readonly<EnrollSequenceDialogProps>) {
  const [sequenceId, setSequenceId] = useState("");
  const { data } = useOutreachSequences({ isActive: true });
  const { mutateAsync, isPending } = useEnrollSequence();

  const sequences = data?.data ?? [];

  const handleEnroll = async () => {
    if (!sequenceId) {
      toast.error("Selectați o secvență");
      return;
    }
    try {
      await mutateAsync({ sequenceId, payload: { leadIds: [...leadIds] } });
      toast.success(`${leadIds.length} lead(uri) înrolate în secvență`);
      onClose();
    } catch {
      toast.error("Eroare la înrolare");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-s950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-s600 bg-s800 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-t1">Înrolare în Secvență</h3>
          <button type="button" onClick={onClose} className="text-t3 hover:text-t1">
            ✕
          </button>
        </div>

        <p className="mb-3 text-sm text-t2">{leadSelectionSummary(leadIds.length)}</p>

        {sequences.length === 0 ? (
          <p className="text-sm text-t3 mb-4">Nicio secvență activă disponibilă.</p>
        ) : (
          <div className="mb-4 space-y-1 max-h-48 overflow-y-auto">
            {sequences.map((seq: OutreachSequence) => (
              <button
                type="button"
                key={seq.id}
                onClick={() => setSequenceId(seq.id)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                  sequenceId === seq.id
                    ? "border border-b5/40 bg-b5/20 text-b5"
                    : "bg-s700 text-t2 hover:bg-s600",
                )}
              >
                <span className="block font-medium">{seq.name}</span>
                <span className="text-xs text-t3">
                  {seq.steps?.length ?? 0} pași · {seq.totalEnrolled} înrolați
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Anulează
          </Button>
          <Button size="sm" onClick={handleEnroll} disabled={isPending || !sequenceId}>
            {isPending ? "Se înrolează..." : "Înrolează"}
          </Button>
        </div>
      </div>
    </div>
  );
}
