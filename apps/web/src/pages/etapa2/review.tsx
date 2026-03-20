import type { ReactNode } from "react";
import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody } from "@/components/ui/index.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { PriorityBadge } from "@/components/outreach/shared/PriorityBadge.js";
import { SlaTimer } from "@/components/outreach/shared/SlaTimer.js";
import { ResolveReviewDialog } from "@/components/outreach/dialogs/ResolveReviewDialog.js";
import { TakeoverDialog } from "@/components/outreach/dialogs/TakeoverDialog.js";
import { useOutreachReviews, useReviewStats } from "@/hooks/use-etapa2.js";
import type { ReviewPriority, ReviewStatus } from "@/lib/etapa2-api.js";
import { cn } from "@/lib/utils.js";

const PRIORITY_TABS: { label: string; value: ReviewPriority | "ALL" }[] = [
  { label: "Toate", value: "ALL" },
  { label: "Urgent", value: "URGENT" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

const STATUS_COLOR: Record<ReviewStatus, string> = {
  PENDING: "text-amber-400",
  ASSIGNED: "text-blue-400",
  IN_PROGRESS: "text-purple-400",
  RESOLVED: "text-green-400",
  ESCALATED: "text-red-400",
  EXPIRED: "text-red-600",
};

const REVIEW_QUEUE_SKELETON_KEYS = ["review-sk-1", "review-sk-2", "review-sk-3"] as const;

export function Review() {
  const [priorityFilter, setPriorityFilter] = useState<ReviewPriority | "ALL">("ALL");
  const [resolving, setResolving] = useState<{ id: string; content: string } | null>(null);
  const [takeover, setTakeover] = useState<{ journeyId: string; companyName?: string } | null>(
    null,
  );

  const params =
    priorityFilter === "ALL"
      ? { status: "PENDING" as ReviewStatus }
      : { priority: priorityFilter, status: "PENDING" as ReviewStatus };
  const { data, isLoading } = useOutreachReviews(params);
  const { data: stats } = useReviewStats();

  const reviews = data?.data ?? [];
  const statsData = stats?.data;

  let queueBody: ReactNode;
  if (isLoading) {
    queueBody = (
      <div className="space-y-3">
        {REVIEW_QUEUE_SKELETON_KEYS.map((k) => (
          <Skeleton key={k} className="h-36 rounded-lg" />
        ))}
      </div>
    );
  } else if (reviews.length === 0) {
    queueBody = (
      <div className="flex flex-col items-center justify-center py-16 text-t3">
        <div className="text-4xl mb-3">✓</div>
        <p className="font-medium text-t1">Coadă goală</p>
        <p className="text-sm mt-1">Nu există mesaje în așteptarea revizuirii.</p>
      </div>
    );
  } else {
    queueBody = (
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityBadge priority={review.priority as ReviewPriority} />
                  <SlaTimer
                    slaDueAt={review.slaDueAt}
                    priority={review.priority as ReviewPriority}
                  />
                  <span
                    className={`text-xs font-medium ${STATUS_COLOR[review.status as ReviewStatus] ?? "text-t3"}`}
                  >
                    {review.status}
                  </span>
                </div>
                <span className="text-xs text-t3">
                  {new Date(review.createdAt).toLocaleString("ro-RO")}
                </span>
              </div>

              {review.reason ? (
                <div className="mb-2 rounded-md border border-amber-800/40 bg-amber-900/10 px-3 py-1.5 text-xs text-amber-400">
                  ⚠ {review.reason}
                </div>
              ) : null}

              {review.aiSuggestedResponse ? (
                <p className="mb-3 rounded-md bg-s700 px-3 py-2 text-sm text-t2">
                  {review.aiSuggestedResponse}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md bg-green-700/30 px-3 py-1.5 text-xs text-green-400 hover:bg-green-700/50"
                  onClick={() =>
                    setResolving({ id: review.id, content: review.aiSuggestedResponse ?? "" })
                  }
                >
                  Rezolvă
                </button>
                <button
                  type="button"
                  className="rounded-md bg-amber-700/30 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-700/50"
                  onClick={() =>
                    setTakeover({
                      journeyId: review.journeyId,
                      companyName: review.lead?.company?.name,
                    })
                  }
                >
                  Preia control
                </button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <PageWrapper title="AI Message Review Queue">
      {statsData && (
        <div className="grid grid-cols-4 gap-3 mb-5 max-[700px]:grid-cols-2">
          <div className="rounded-lg border border-s700 bg-s800 px-3 py-2">
            <p className="text-xs text-t3">SLA Breach Rate</p>
            <p className="text-lg font-bold text-t1">
              {(statsData.slaBreachRate * 100).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg border border-s700 bg-s800 px-3 py-2">
            <p className="text-xs text-t3">Rezolvări/Zi</p>
            <p className="text-lg font-bold text-t1">{statsData.reviewsPerDay}</p>
          </div>
          <div className="rounded-lg border border-s700 bg-s800 px-3 py-2">
            <p className="text-xs text-t3">Timp Mediu Rezolvare</p>
            <p className="text-lg font-bold text-t1">
              {Math.round(statsData.avgResolutionTimeMs / 60000)}m
            </p>
          </div>
          <div className="rounded-lg border border-s700 bg-s800 px-3 py-2">
            <p className="text-xs text-t3">Urgente</p>
            <p className="text-lg font-bold text-red-400">{statsData.byPriority?.URGENT ?? 0}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {PRIORITY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setPriorityFilter(tab.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap",
              priorityFilter === tab.value ? "bg-b5 text-s950" : "bg-s800 text-t2 hover:bg-s700",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {queueBody}

      {resolving && (
        <ResolveReviewDialog
          reviewId={resolving.id}
          originalContent={resolving.content}
          onClose={() => setResolving(null)}
        />
      )}

      {takeover && (
        <TakeoverDialog
          leadId={takeover.journeyId}
          companyName={takeover.companyName}
          onClose={() => setTakeover(null)}
        />
      )}
    </PageWrapper>
  );
}
