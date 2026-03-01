import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { Spinner } from "@/components/ui/spinner.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { useApprovals, useDecideApproval } from "@/hooks/use-etapa1.js";
import { toast } from "@/components/ui/toast-api.js";

export function SilverDedup() {
  const {
    data: response,
    isPending,
    isError,
    error,
  } = useApprovals({
    approvalType: "dedup_review",
    limit: 50,
  });
  const decide = useDecideApproval();

  const approvals = (response?.data ?? []) as Array<Record<string, unknown>>;

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
        <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-4 text-sm text-[var(--color-danger)]">
          Eroare la incarcarea candidatilor dedup: {error?.message ?? "Eroare necunoscuta"}
        </div>
      </PageWrapper>
    );
  }

  if (approvals.length === 0) {
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
        {approvals.map((approval) => {
          const id = String(approval.id ?? "");
          const payload = (approval.payload ?? approval.entityData ?? {}) as Record<
            string,
            unknown
          >;
          const left = (payload.left ?? payload.companyA ?? {}) as Record<string, unknown>;
          const right = (payload.right ?? payload.companyB ?? {}) as Record<string, unknown>;
          const score = Number(payload.similarityScore ?? payload.score ?? 0);
          const status = String(approval.status ?? "pending");

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
                  <div className="rounded-lg border border-[var(--color-s700)] p-3">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-t3)]">
                      Compania A
                    </span>
                    <p className="text-sm font-semibold text-[var(--color-t1)]">
                      {String(left.denumire ?? left.name ?? "—")}
                    </p>
                    <p className="text-xs text-[var(--color-t2)]">
                      CUI: {String(left.cui ?? "—")} | Judet:{" "}
                      {String(left.judet ?? left.judetCod ?? "—")}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[var(--color-s700)] p-3">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-t3)]">
                      Compania B
                    </span>
                    <p className="text-sm font-semibold text-[var(--color-t1)]">
                      {String(right.denumire ?? right.name ?? "—")}
                    </p>
                    <p className="text-xs text-[var(--color-t2)]">
                      CUI: {String(right.cui ?? "—")} | Judet:{" "}
                      {String(right.judet ?? right.judetCod ?? "—")}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[var(--color-t3)]">
                    Scor similaritate:{" "}
                    <span className="font-semibold text-[var(--color-t1)]">{score}%</span>
                  </span>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecision(id, "skip")}
                      disabled={decide.isPending || status !== "pending"}
                    >
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[var(--color-danger)] text-[var(--color-danger)]"
                      onClick={() => handleDecision(id, "reject")}
                      disabled={decide.isPending || status !== "pending"}
                    >
                      Respinge
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDecision(id, "merge")}
                      disabled={decide.isPending || status !== "pending"}
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
