/**
 * Pereche deduplicare — același model de date ca `fetchDedupCandidates` / pagina silver-dedup.
 */
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { cn } from "@/lib/utils.js";

export type DedupDecision = "merge" | "reject" | "skip";

export type DedupCandidateShape = Record<string, unknown>;

export type DeduplicationReviewProps = Readonly<{
  candidate: DedupCandidateShape;
  onDecision: (id: string, decision: DedupDecision) => void;
  disabled?: boolean;
  className?: string;
}>;

export function DeduplicationReview({
  candidate,
  onDecision,
  disabled = false,
  className,
}: DeduplicationReviewProps) {
  const id = String(candidate.id ?? "");
  const left = (candidate.companyAData ?? candidate.leftCompany ?? {}) as Record<string, unknown>;
  const right = (candidate.companyBData ?? candidate.rightCompany ?? {}) as Record<string, unknown>;
  const score = Number(candidate.similarityScore ?? candidate.score ?? 0);
  const status = String(candidate.status ?? "pending");
  const canDecide = status === "pending" || status === "hitl_pending";

  return (
    <Card className={cn(className)} data-testid={`dedup-review-${id || "row"}`}>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Review deduplicare</CardTitle>
          <Badge variant={status === "pending" ? "warning" : "info"}>{status}</Badge>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--color-s700)] p-3">
            <span className="mb-1 block text-xs font-medium text-t3">Compania A</span>
            <p className="text-sm font-semibold text-t1">
              {String(left.denumire ?? left.name ?? "—")}
            </p>
            <p className="text-xs text-t2">
              CUI: {String(left.cui ?? "—")} | Județ: {String(left.judet ?? left.judetCod ?? "—")}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--color-s700)] p-3">
            <span className="mb-1 block text-xs font-medium text-t3">Compania B</span>
            <p className="text-sm font-semibold text-t1">
              {String(right.denumire ?? right.name ?? "—")}
            </p>
            <p className="text-xs text-t2">
              CUI: {String(right.cui ?? "—")} | Județ:{" "}
              {String(right.judet ?? right.judetCod ?? "—")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-t3">
            Scor similaritate: <span className="font-semibold text-t1">{score}%</span>
          </span>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDecision(id, "skip")}
              disabled={disabled || !canDecide}
            >
              Skip
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-er text-er"
              onClick={() => onDecision(id, "reject")}
              disabled={disabled || !canDecide}
            >
              Respinge
            </Button>
            <Button
              size="sm"
              onClick={() => onDecision(id, "merge")}
              disabled={disabled || !canDecide}
            >
              Merge
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
