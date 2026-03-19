import { Card, CardBody } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";

type ApprovalCardProps = {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly urgency?: "LOW" | "MED" | "HIGH";
  readonly confidence?: number;
  readonly onApprove?: () => void;
  readonly onReject?: () => void;
};

const URGENCY_VARIANT = {
  HIGH: "error",
  MED: "warning",
  LOW: "info",
} as const satisfies Record<"HIGH" | "MED" | "LOW", "error" | "warning" | "info">;

export function ApprovalCard({
  id,
  title,
  description,
  urgency = "MED",
  confidence = 0,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const variant = URGENCY_VARIANT[urgency];
  return (
    <Card className="border-l-4 border-l-wa" data-approval-id={id}>
      <CardBody>
        <div className="mb-3 flex items-start justify-between">
          <h3 className="font-semibold text-t1">{title}</h3>
          <Badge variant={variant}>{urgency}</Badge>
        </div>
        {description ? <p className="mb-3 text-sm text-t3">{description}</p> : null}
        <ProgressBar value={confidence} />
        <div className="mt-3 flex gap-2">
          <Button variant="success" size="sm" className="flex-1" onClick={onApprove}>
            Aproba
          </Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={onReject}>
            Respinge
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
