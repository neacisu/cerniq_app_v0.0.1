import { Link } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { usePauseQueue, useQueueStatuses, useResumeQueue } from "@/hooks/use-etapa1.js";
import { QueueStatusCard } from "@/components/data/QueueStatusCard.js";
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
    return (
      <PageWrapper title="Enrichment Queues">
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
          Eroare la încărcarea datelor: {queuesQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Enrichment Queues">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-t2">
          Monitorizare și control cozi BullMQ pentru enrichment pipeline.
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
              rateLimit={
                q.rateLimit && typeof q.rateLimit === "object"
                  ? {
                      max: Number((q.rateLimit as Record<string, unknown>).max ?? 0),
                      duration: Number((q.rateLimit as Record<string, unknown>).duration ?? 0),
                    }
                  : null
              }
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await pauseMutation.mutateAsync(String(q.name));
                }}
              >
                Pause
              </Button>
              <Button
                size="sm"
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
