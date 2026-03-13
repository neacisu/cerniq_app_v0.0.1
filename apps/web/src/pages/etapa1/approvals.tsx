import { useMutation, useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { decideApproval, fetchApprovals } from "@/lib/etapa1-api.js";
import { ApprovalCard } from "@/components/data/ApprovalCard.js";
import { SLACountdown } from "@/components/data/SLACountdown.js";

function resolveUrgency(raw: string): "HIGH" | "LOW" | "MED" {
  if (raw === "HIGH") return "HIGH";
  if (raw === "LOW") return "LOW";
  return "MED";
}

export function Approvals() {
  const approvalsQuery = useQuery({
    queryKey: ["etapa1", "approvals"],
    queryFn: () => fetchApprovals({ limit: 100 }),
  });
  const decisionMutation = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: "approve" | "reject" | "merge" | "skip";
    }) => decideApproval(id, decision),
    onSuccess: () => {
      approvalsQuery.refetch();
    },
  });
  const items = approvalsQuery.data?.data ?? [];
  const hasItems = items.length > 0;

  if (approvalsQuery.isPending) {
    return (
      <PageWrapper title="HITL Approvals">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (approvalsQuery.isError) {
    return (
      <PageWrapper title="HITL Approvals">
        <div className="rounded-lg border border-(--color-danger)/30 bg-(--color-danger)/10 p-4 text-sm text-(--color-danger)">
          Eroare la încărcarea datelor: {approvalsQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="HITL Approvals">
      {hasItems ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a: Record<string, unknown>) => {
            const urgency = String(a.urgency ?? "MED").toUpperCase();
            return (
              <div key={String(a.id)} className="space-y-2">
                <ApprovalCard
                  id={String(a.id)}
                  title={String(a.title ?? a.entityId)}
                  description={String(a.description ?? "")}
                  urgency={resolveUrgency(urgency)}
                  confidence={Number(a.aiConfidence ?? 0) * 100}
                  onApprove={() =>
                    decisionMutation.mutate({ id: String(a.id), decision: "approve" })
                  }
                  onReject={() => decisionMutation.mutate({ id: String(a.id), decision: "reject" })}
                />
                {a.dueAt ? (
                  <div className="text-xs text-t3">
                    SLA: <SLACountdown dueAt={String(a.dueAt)} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Inbox gol" description="Nu există aprobări în așteptare." />
      )}
    </PageWrapper>
  );
}
