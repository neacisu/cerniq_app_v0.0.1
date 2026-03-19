import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Badge } from "@/components/ui/badge.js";

type QueueStatusCardProps = {
  readonly name: string;
  readonly paused: boolean;
  readonly waiting: number;
  readonly active: number;
  readonly failed: number;
  readonly delayed: number;
  readonly rateLimit?: { readonly max: number; readonly duration: number } | null;
};

export function QueueStatusCard({
  name,
  paused,
  waiting,
  active,
  failed,
  delayed,
  rateLimit,
}: QueueStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate text-sm">{name}</span>
          <Badge variant={paused ? "warning" : "ok"}>{paused ? "paused" : "running"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-1 text-xs text-t2">
        <div className="flex justify-between">
          <span>waiting</span>
          <span>{waiting}</span>
        </div>
        <div className="flex justify-between">
          <span>active</span>
          <span>{active}</span>
        </div>
        <div className="flex justify-between">
          <span>failed</span>
          <span>{failed}</span>
        </div>
        <div className="flex justify-between">
          <span>delayed</span>
          <span>{delayed}</span>
        </div>
        {rateLimit ? (
          <div className="flex justify-between">
            <span>rate</span>
            <span>
              {rateLimit.max}/{rateLimit.duration}ms
            </span>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
