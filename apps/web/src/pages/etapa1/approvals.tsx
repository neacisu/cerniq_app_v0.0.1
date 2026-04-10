import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Button } from "@/components/ui/button.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { decideApproval, type ApprovalListParams, type ApprovalTask } from "@/lib/etapa1-api.js";
import { useApprovals } from "@/hooks/use-etapa1.js";
import { ApprovalCard } from "@/components/data/ApprovalCard.js";
import { SLACountdown } from "@/components/data/SLACountdown.js";
import { voidAsyncHandler } from "@/lib/void-async-handlers.js";

type TabKey = "pending" | "completed";

function resolveUrgency(raw: string): "HIGH" | "LOW" | "MED" {
  if (raw === "HIGH") return "HIGH";
  if (raw === "LOW") return "LOW";
  return "MED";
}

export function Approvals() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const pendingQuery = useApprovals({
    statuses: ["pending", "assigned", "escalated"],
    approvalType: (typeFilter as ApprovalListParams["approvalType"]) || undefined,
    overdue: overdueOnly || undefined,
    limit: 100,
  });

  const completedQuery = useApprovals({
    statuses: ["approved", "rejected", "expired"],
    limit: 50,
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
      queryClient.invalidateQueries({ queryKey: ["etapa1", "approvals"] }).catch(voidAsyncHandler);
    },
  });

  const activeQuery = activeTab === "pending" ? pendingQuery : completedQuery;
  const items = activeQuery.data?.data ?? [];
  const hasItems = items.length > 0;

  if (activeQuery.isPending) {
    return (
      <PageWrapper title="HITL Approvals">
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  if (activeQuery.isError) {
    return (
      <PageWrapper title="HITL Approvals">
        <div className="rounded-lg border border-er/30 bg-er/10 p-4 text-sm text-er">
          Eroare la încărcarea datelor: {activeQuery.error?.message ?? "Eroare necunoscută"}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="HITL Approvals">
      {/* Tab Bar */}
      <div className="mb-4 flex items-center gap-2 border-b border-s600">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "pending"
              ? "border-b5 text-t1"
              : "border-transparent text-t3 hover:text-t2"
          }`}
        >
          Pending ({pendingQuery.data?.data?.length ?? "…"})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "completed"
              ? "border-b5 text-t1"
              : "border-transparent text-t3 hover:text-t2"
          }`}
        >
          Completate ({completedQuery.data?.data?.length ?? "…"})
        </button>
        {activeTab === "pending" && (
          <div className="ml-auto flex items-center gap-2">
            <select
              className="px-2 py-1 rounded bg-s800 border border-s600 text-t1 text-xs"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Toate tipurile</option>
              <option value="dedup_review">Deduplicare</option>
              <option value="quality_review">Calitate</option>
              <option value="identity_conflict">Conflict identitate</option>
              <option value="ai_structuring_review">AI Structurare</option>
              <option value="ai_merge_review">AI Merge</option>
              <option value="low_confidence_review">Incredere scazuta</option>
              <option value="data_anomaly">Anomalie date</option>
              <option value="manual_verification">Verificare manuala</option>
              <option value="error_review">Eroare</option>
            </select>
            <label className="flex items-center gap-1 text-xs text-t3 cursor-pointer">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="rounded"
              />
              <span>Overdue</span>
            </label>
            <Button size="sm" variant="ghost" onClick={() => activeQuery.refetch()}>
              Refresh
            </Button>
          </div>
        )}
      </div>

      {hasItems ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a: ApprovalTask) => {
            const urgency = resolveUrgency((a.urgency ?? "medium").toUpperCase());
            const isCompleted = activeTab === "completed";
            return (
              <div key={a.id} className="space-y-2">
                <ApprovalCard
                  id={a.id}
                  title={a.title}
                  description={a.description ?? ""}
                  urgency={urgency}
                  confidence={(a.aiConfidence ?? 0) * 100}
                  onApprove={
                    isCompleted
                      ? undefined
                      : () => decisionMutation.mutate({ id: a.id, decision: "approve" })
                  }
                  onReject={
                    isCompleted
                      ? undefined
                      : () => decisionMutation.mutate({ id: a.id, decision: "reject" })
                  }
                />
                {a.dueAt && !isCompleted ? (
                  <div className="text-xs text-t3">
                    SLA: <SLACountdown dueAt={a.dueAt} />
                  </div>
                ) : null}
                {isCompleted && a.decidedAt ? (
                  <div className="text-xs text-t3">
                    Decis la: {new Date(a.decidedAt).toLocaleDateString("ro-RO")}
                    {a.decision ? ` — ${a.decision}` : ""}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={activeTab === "pending" ? "Inbox gol" : "Nicio aprobare completată"}
          description={
            activeTab === "pending"
              ? "Nu există aprobări în așteptare."
              : "Nu există aprobări finalizate."
          }
        />
      )}
    </PageWrapper>
  );
}
