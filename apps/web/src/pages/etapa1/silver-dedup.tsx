import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { Spinner } from "@/components/ui/spinner.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
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
          const left = (candidate.companyAData ?? candidate.leftCompany ?? {}) as Record<
            string,
            unknown
          >;
          const right = (candidate.companyBData ?? candidate.rightCompany ?? {}) as Record<
            string,
            unknown
          >;
          const score = Number(candidate.similarityScore ?? candidate.score ?? 0);
          const status = String(candidate.status ?? "pending");
          const canDecide = status === "pending" || status === "hitl_pending";

          return (
            <Card key={id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Pereche Dedup</CardTitle>
                  <Badge variant={status === "pending" ? "warning" : "info"}>{status}</Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-s700 p-3">
                    <span className="mb-1 block text-xs font-medium text-t3">Compania A</span>
                    <p className="text-sm font-semibold text-t1">
                      {String(left.denumire ?? left.name ?? "—")}
                    </p>
                    <p className="text-xs text-t2">
                      CUI: {String(left.cui ?? "—")} | Judet:{" "}
                      {String(left.judet ?? left.judetCod ?? "—")}
                    </p>
                  </div>

                  <div className="rounded-lg border border-s700 p-3">
                    <span className="mb-1 block text-xs font-medium text-t3">Compania B</span>
                    <p className="text-sm font-semibold text-t1">
                      {String(right.denumire ?? right.name ?? "—")}
                    </p>
                    <p className="text-xs text-t2">
                      CUI: {String(right.cui ?? "—")} | Judet:{" "}
                      {String(right.judet ?? right.judetCod ?? "—")}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-t3">
                    Scor similaritate: <span className="font-semibold text-t1">{score}%</span>
                  </span>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecision(id, "skip")}
                      disabled={decide.isPending || !canDecide}
                    >
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-er text-er"
                      onClick={() => handleDecision(id, "reject")}
                      disabled={decide.isPending || !canDecide}
                    >
                      Respinge
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDecision(id, "merge")}
                      disabled={decide.isPending || !canDecide}
                    >
                      Merge
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </PageWrapper>
  );
}
