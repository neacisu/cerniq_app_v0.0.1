import { Card, CardBody } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";

type ApprovalCardProps = {
  id: string;
  title: string;
  description?: string;
  urgency?: "LOW" | "MED" | "HIGH";
  confidence?: number;
  onApprove?: () => void;
  onReject?: () => void;
};

export function ApprovalCard({
  title,
  description,
  urgency = "MED",
  confidence = 0,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const variant = urgency === "HIGH" ? "error" : urgency === "MED" ? "warning" : "info";
  return (
    <Card className="border-l-4 border-l-[var(--color-wa)]">
      <CardBody>
        <div className="mb-3 flex items-start justify-between">
          <h3 className="font-semibold text-[var(--color-t1)]">{title}</h3>
          <Badge variant={variant}>{urgency}</Badge>
        </div>
        {description ? <p className="mb-3 text-sm text-[var(--color-t3)]">{description}</p> : null}
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
