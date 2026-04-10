import { Link } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { usePauseQueue, useQueueStatuses, useResumeQueue } from "@/hooks/use-etapa1.js";
import { QueueStatusCard } from "@/components/data/QueueStatusCard.js";
import { EnrichmentProviderStatus } from "@/components/etapa1/EnrichmentProviderStatus.js";
import { Button } from "@/components/ui/button.js";
import { Brain } from "lucide-react";
export function EnrichmentQueues() {
  const queuesQuery = useQueueStatuses();
  const pauseMutation = usePauseQueue();
  const resumeMutation = useResumeQueue();
  const queues = queuesQuery.data?.data ?? [];

  if (queuesQuery.isPending) {
    return (
      <PageWrapper title="Enrichment Queues">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (queuesQuery.isError) {
    const msg = queuesQuery.error?.message ?? "";
    const forbidden = /403|forbidden/i.test(msg);
    return (
      <PageWrapper title="Enrichment Queues">
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er space-y-2">
          <p>Eroare la încărcarea cozilor: {msg || "Eroare necunoscută"}</p>
          {forbidden ? (
            <p className="text-t2">
              Lista cozilor necesită rol <strong>admin</strong>, <strong>owner</strong> sau{" "}
              <strong>superadmin</strong> (GET{" "}
              <code className="font-mono">/api/v1/enrichment/queues</code>
              ). Pause/Resume folosesc POST{" "}
              <code className="font-mono">/api/v1/enrichment/queues/:name/pause|resume</code> cu
              aceeași restricție.
            </p>
          ) : null}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Enrichment Queues">
      <p className="mb-2 text-xs text-t4">
        Sursă: <code className="font-mono">GET /api/v1/enrichment/queues</code>
        {" — "}
        stări BullMQ reale ( <code className="font-mono">waiting</code>,{" "}
        <code className="font-mono">active</code>, <code className="font-mono">completed</code>,{" "}
        <code className="font-mono">failed</code>, <code className="font-mono">delayed</code>,{" "}
        <code className="font-mono">paused</code>). Controale: POST pause/resume pe coadă.
      </p>
      <EnrichmentProviderStatus queues={queues as Record<string, unknown>[]} className="mb-6" />

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-t2">
          Monitorizare și control cozi BullMQ pentru pipeline enrichment (date din API,
          reîmprospătare ~15s).
        </p>
        <Link to="/brain">
          <Button
            variant="outline"
            className="flex items-center gap-2 border-[var(--color-neuron-executive)] text-[var(--color-neuron-executive)] hover:bg-[var(--color-neuron-executive)]/10"
          >
            <Brain size={16} />
            Cognitive Brain
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {queues.map((q: Record<string, unknown>) => (
          <div key={String(q.name)} className="space-y-2">
            <QueueStatusCard
              name={String(q.name)}
              paused={Boolean(q.paused)}
              waiting={Number(q.waiting ?? 0)}
              active={Number(q.active ?? 0)}
              failed={Number(q.failed ?? 0)}
              delayed={Number(q.delayed ?? 0)}
              completed={q.completed === undefined ? undefined : Number(q.completed)}
              concurrency={q.concurrency === undefined ? undefined : Number(q.concurrency)}
              lastJobAt={typeof q.lastJobAt === "string" ? q.lastJobAt : null}
              rateLimit={
                q.rateLimit && typeof q.rateLimit === "object"
                  ? {
                      max: Number((q.rateLimit as Record<string, unknown>).max ?? 0),
                      duration: Number((q.rateLimit as Record<string, unknown>).duration ?? 0),
                    }
                  : null
              }
            />
            {/* Răspunsul 200 la GET /queues este permis doar admin/owner/superadmin — același rol pentru pause/resume. */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pauseMutation.isPending}
                onClick={async () => {
                  await pauseMutation.mutateAsync(String(q.name));
                }}
              >
                Pause
              </Button>
              <Button
                size="sm"
                disabled={resumeMutation.isPending}
                onClick={async () => {
                  await resumeMutation.mutateAsync(String(q.name));
                }}
              >
                Resume
              </Button>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
