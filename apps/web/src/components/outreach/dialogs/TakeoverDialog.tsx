import { useId, useState } from "react";
import { Button } from "@/components/ui/index.js";
import { useTakeover } from "@/hooks/use-etapa2.js";
import { toast } from "sonner";

interface TakeoverDialogProps {
  readonly leadId: string;
  readonly companyName?: string;
  readonly onClose: () => void;
}

export function TakeoverDialog({ leadId, companyName, onClose }: Readonly<TakeoverDialogProps>) {
  const reasonFieldId = useId();
  const [reason, setReason] = useState("");
  const { mutateAsync, isPending } = useTakeover();

  const handleTakeover = async () => {
    if (!reason.trim()) {
      toast.error("Motivul preluării este obligatoriu");
      return;
    }
    try {
      await mutateAsync({ id: leadId, reason: reason.trim() });
      toast.success("Lead preluat cu succes");
      onClose();
    } catch {
      toast.error("Eroare la preluarea lead-ului");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-s950/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-s600 bg-s800 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-t1">Preluare Control Uman</h3>
          <button type="button" onClick={onClose} className="text-t3 hover:text-t1">
            ✕
          </button>
        </div>

        {companyName && (
          <p className="mb-3 text-sm text-t2">
            Lead: <span className="font-medium text-t1">{companyName}</span>
          </p>
        )}

        <div className="mb-3 rounded-md bg-amber-900/20 border border-amber-800/40 p-3 text-sm text-amber-300">
          <strong>ADR-0064</strong>: Preluarea controlului va opri toate automatizările AI pentru
          acest lead. Toate mesajele viitoare vor fi trimise manual.
        </div>

        <label htmlFor={reasonFieldId} className="mb-1 block text-xs text-t3">
          Motiv preluare *
        </label>
        <textarea
          id={reasonFieldId}
          rows={3}
          placeholder="De ex: Client important, situație sensibilă, negociere avansată..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-4 w-full resize-none rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:border-b5"
        />

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Anulează
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleTakeover}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? "Se procesează..." : "Preia Controlul"}
          </Button>
        </div>
      </div>
    </div>
  );
}
