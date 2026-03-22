import { useId, useState } from "react";
import { Button } from "@/components/ui/index.js";
import { useResolveReview } from "@/hooks/use-etapa2.js";
import type { ReviewAction } from "@/lib/etapa2-api.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils.js";

const ACTIONS: { value: ReviewAction; label: string; variant?: string }[] = [
  { value: "APPROVED", label: "Aprobă & Trimite", variant: "success" },
  { value: "EDITED", label: "Editează & Trimite", variant: "brand" },
  { value: "REJECTED", label: "Respinge", variant: "danger" },
  { value: "IGNORED", label: "Ignoră", variant: "outline" },
];

interface ResolveReviewDialogProps {
  readonly reviewId: string;
  readonly originalContent?: string;
  readonly onClose: () => void;
}

export function ResolveReviewDialog({
  reviewId,
  originalContent,
  onClose,
}: Readonly<ResolveReviewDialogProps>) {
  const editedContentFieldId = useId();
  const notesFieldId = useId();
  const [action, setAction] = useState<ReviewAction>("APPROVED");
  const [editedContent, setEditedContent] = useState(originalContent ?? "");
  const [notes, setNotes] = useState("");
  const { mutateAsync, isPending } = useResolveReview();

  const handleResolve = async () => {
    try {
      await mutateAsync({
        id: reviewId,
        payload: {
          action,
          editedContent: action === "EDITED" ? editedContent : undefined,
          notes: notes || undefined,
        },
      });
      toast.success("Review rezolvat cu succes");
      onClose();
    } catch {
      toast.error("Eroare la rezolvarea review-ului");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-s950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-s600 bg-s800 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-t1">Rezolvare Review</h3>
          <button type="button" onClick={onClose} className="text-t3 hover:text-t1">
            ✕
          </button>
        </div>

        <div className="mb-3 flex gap-2 flex-wrap">
          {ACTIONS.map((a) => (
            <button
              type="button"
              key={a.value}
              onClick={() => setAction(a.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                action === a.value ? "bg-b5 text-s950" : "bg-s700 text-t2 hover:bg-s600",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>

        {action === "EDITED" && (
          <div className="mb-3">
            <label htmlFor={editedContentFieldId} className="mb-1 block text-xs text-t3">
              Conținut editat
            </label>
            <textarea
              id={editedContentFieldId}
              rows={4}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full resize-none rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 focus:outline-none focus:border-b5"
            />
          </div>
        )}

        <div className="mb-4">
          <label htmlFor={notesFieldId} className="mb-1 block text-xs text-t3">
            Note (opțional)
          </label>
          <textarea
            id={notesFieldId}
            rows={2}
            placeholder="Note despre decizia luată..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full resize-none rounded-md border border-s600 bg-s700 px-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:border-b5"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Anulează
          </Button>
          <Button size="sm" onClick={handleResolve} disabled={isPending}>
            {isPending ? "Se salvează..." : "Salvează Decizia"}
          </Button>
        </div>
      </div>
    </div>
  );
}
