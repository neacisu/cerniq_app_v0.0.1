import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { DeduplicationReview } from "@/components/etapa1/DeduplicationReview.js";
import { useDecideDedup, useDedupCandidates } from "@/hooks/use-etapa1.js";
import { toast } from "@/components/ui/toast-api.js";

export function SilverDedup() {
  const { data: response, isPending, isError, error } = useDedupCandidates({ limit: 50 });
  const decide = useDecideDedup();

  const candidates = (response?.data ?? []) as Array<Record<string, unknown>>;

  const handleDecision = (id: string, decision: "merge" | "reject" | "skip") => {
    decide.mutate(
      { id, decision },
      {
        onSuccess: () => toast.success(`Decizie "${decision}" inregistrata`),
        onError: () => toast.error("Eroare la inregistrarea deciziei"),
      },
    );
  };

  if (isPending) {
    return (
      <PageWrapper title="Silver Dedup Candidates">
        <div className="flex items-center justify-center py-20">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Silver Dedup Candidates">
        <div className="rounded-lg border border-er bg-er/10 p-4 text-sm text-er">
          Eroare la incarcarea candidatilor dedup: {error?.message ?? "Eroare necunoscuta"}
        </div>
      </PageWrapper>
    );
  }

  if (candidates.length === 0) {
    return (
      <PageWrapper title="Silver Dedup Candidates">
        <EmptyState
          icon="GitMerge"
          title="Niciun candidat de deduplicare"
          description="Nu exista perechi de companii candidate pentru deduplicare."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Silver Dedup Candidates">
      <div className="space-y-4">
        {candidates.map((candidate) => {
          const id = String(candidate.id ?? "");
          return (
            <DeduplicationReview
              key={id}
              candidate={candidate}
              disabled={decide.isPending}
              onDecision={(cid, decision) => handleDecision(cid, decision)}
            />
          );
        })}
      </div>
    </PageWrapper>
  );
}
