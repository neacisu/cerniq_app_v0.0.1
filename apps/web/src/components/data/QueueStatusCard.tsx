import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Badge } from "@/components/ui/badge.js";

type QueueStatusCardProps = {
  readonly name: string;
  readonly paused: boolean;
  readonly waiting: number;
  readonly active: number;
  readonly failed: number;
  readonly delayed: number;
  /** Din GET /api/v1/enrichment/queues — job-uri finalizate cu succes (BullMQ). */
  readonly completed?: number;
  /** Concurrency configurat în registry (worker-shared). */
  readonly concurrency?: number;
  /** ISO timestamp ultimul job completed/failed (dacă există). */
  readonly lastJobAt?: string | null;
  readonly rateLimit?: { readonly max: number; readonly duration: number } | null;
};

export function QueueStatusCard({
  name,
  paused,
  waiting,
  active,
  failed,
  delayed,
  completed,
  concurrency,
  lastJobAt,
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
        {completed === undefined ? null : (
          <div className="flex justify-between">
            <span>completed</span>
            <span>{completed}</span>
          </div>
        )}
        {concurrency === undefined ? null : (
          <div className="flex justify-between">
            <span>concurrency</span>
            <span>{concurrency}</span>
          </div>
        )}
        {lastJobAt ? (
          <div className="flex justify-between gap-2">
            <span>last job</span>
            <span className="truncate text-end" title={lastJobAt}>
              {new Date(lastJobAt).toLocaleString("ro-RO", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ) : null}
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
