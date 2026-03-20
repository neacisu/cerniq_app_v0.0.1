import { Button } from "@/components/ui/button.js";

type DedupReviewDialogProps = {
  readonly open: boolean;
  readonly left: Record<string, unknown>;
  readonly right: Record<string, unknown>;
  readonly score: number;
  readonly onClose: () => void;
  readonly onMerge: () => void;
  readonly onReject: () => void;
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
      <div className="w-full max-w-4xl rounded-lg border border-s600 bg-s900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-t1">
            Dedup Review (similaritate: {Math.round(score)}%)
          </h3>
          <Button variant="ghost" onClick={onClose}>
            Inchide
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <pre className="rounded border border-s700 p-3 text-xs text-t2">
            {JSON.stringify(left, null, 2)}
          </pre>
          <pre className="rounded border border-s700 p-3 text-xs text-t2">
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
