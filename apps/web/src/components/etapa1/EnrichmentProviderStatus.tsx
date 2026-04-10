/**
 * Vizualizare stări cozi BullMQ din GET /api/v1/enrichment/queues.
 * Nu inventăm latency sau provideri externi: rândurile reflectă exact `queues[]` din răspuns.
 */
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Badge } from "@/components/ui/badge.js";
import { cn } from "@/lib/utils.js";

export type EnrichmentProviderStatusProps = Readonly<{
  /** Rânduri din `fetchQueueStatuses` -> `data[]` */
  queues: readonly Record<string, unknown>[];
  className?: string;
}>;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Evită String(object) -> "[object Object]" pentru câmpuri API eronate. */
function queueLabel(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "string" || typeof v === "number") return String(v);
  return "—";
}

export function EnrichmentProviderStatus(props: EnrichmentProviderStatusProps) {
  const { queues, className } = props;
  if (queues.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Stare cozi enrichment</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-t3">Nicio coadă returnată de API.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-[var(--color-s700)]">
        <CardTitle className="text-base">Stare cozi enrichment</CardTitle>
        <p className="text-xs text-t3 mt-1">
          Sursă: <code className="font-mono">GET /api/v1/enrichment/queues</code> — fiecare rând
          este o coadă BullMQ (nu un catalog fix de "provideri" externi). Coloanele reflectă
          câmpurile disponibile în răspuns: așteptare, activ, eșuat, amânat, pauză, limită rată.
        </p>
      </CardHeader>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-s700)] bg-[var(--color-s900)] text-xs text-t3">
                <th className="px-3 py-2 font-medium">Coadă</th>
                <th className="px-3 py-2 font-medium">Pauză</th>
                <th className="px-3 py-2 font-medium">Waiting</th>
                <th className="px-3 py-2 font-medium">Active</th>
                <th className="px-3 py-2 font-medium">Failed</th>
                <th className="px-3 py-2 font-medium">Delayed</th>
                <th className="px-3 py-2 font-medium">Completed</th>
                <th className="px-3 py-2 font-medium">Concurrency</th>
                <th className="px-3 py-2 font-medium">Rate limit</th>
                <th className="px-3 py-2 font-medium">Ultim job</th>
              </tr>
            </thead>
            <tbody>
              {queues.map((q) => {
                const name = queueLabel(q.name);
                const paused = Boolean(q.paused);
                const rl = q.rateLimit;
                const rlStr =
                  rl && typeof rl === "object"
                    ? `${num((rl as Record<string, unknown>).max)}/${num((rl as Record<string, unknown>).duration)}ms`
                    : "—";
                const last =
                  typeof q.lastJobAt === "string"
                    ? new Date(q.lastJobAt).toLocaleString("ro-RO")
                    : "—";
                return (
                  <tr
                    key={name}
                    className="border-b border-[var(--color-s800)] odd:bg-[var(--color-s950)]/50"
                  >
                    <td className="px-3 py-2 font-mono text-t1">{name}</td>
                    <td className="px-3 py-2">
                      {paused ? (
                        <Badge variant="warning">pauză</Badge>
                      ) : (
                        <Badge variant="info">activ</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{num(q.waiting)}</td>
                    <td className="px-3 py-2 tabular-nums">{num(q.active)}</td>
                    <td className="px-3 py-2 tabular-nums text-er">{num(q.failed)}</td>
                    <td className="px-3 py-2 tabular-nums">{num(q.delayed)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {q.completed === undefined ? "—" : num(q.completed)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {q.concurrency === undefined ? "—" : num(q.concurrency)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-t2">{rlStr}</td>
                    <td className="px-3 py-2 text-xs text-t2">{last}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
