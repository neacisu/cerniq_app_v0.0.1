import { Button } from "@/components/ui/button.js";

type DedupReviewDialogProps = {
  open: boolean;
  left: Record<string, unknown>;
  right: Record<string, unknown>;
  score: number;
  onClose: () => void;
  onMerge: () => void;
  onReject: () => void;
};

export function DedupReviewDialog({
  open,
  left,
  right,
  score,
  onClose,
  onMerge,
  onReject,
}: DedupReviewDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-[var(--radius-lg)] border border-[var(--color-s600)] bg-[var(--color-s900)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--color-t1)]">
            Dedup Review (similaritate: {Math.round(score)}%)
          </h3>
          <Button variant="ghost" onClick={onClose}>
            Inchide
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <pre className="rounded border border-[var(--color-s700)] p-3 text-xs text-[var(--color-t2)]">
            {JSON.stringify(left, null, 2)}
          </pre>
          <pre className="rounded border border-[var(--color-s700)] p-3 text-xs text-[var(--color-t2)]">
            {JSON.stringify(right, null, 2)}
          </pre>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="danger" onClick={onReject}>
            Pastreaza separat
          </Button>
          <Button variant="success" onClick={onMerge}>
            Merge records
          </Button>
        </div>
      </div>
    </div>
  );
}
