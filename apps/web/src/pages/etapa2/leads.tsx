import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { StageBadge } from "@/components/outreach/shared/StageBadge.js";
import { ChannelBadge } from "@/components/outreach/shared/ChannelIcon.js";
import { SentimentIndicator } from "@/components/outreach/shared/SentimentIndicator.js";
import { useOutreachLeads } from "@/hooks/use-etapa2.js";
import type { LeadState, LeadChannel } from "@/lib/etapa2-api.js";
import { cn } from "@/lib/utils.js";

const STATE_TABS: { label: string; value: LeadState | "ALL" }[] = [
  { label: "Toți", value: "ALL" },
  { label: "Rece", value: "COLD" },
  { label: "Contactat WA", value: "CONTACTED_WA" },
  { label: "Contactat Email", value: "CONTACTED_EMAIL" },
  { label: "Răspuns Cald", value: "WARM_REPLY" },
  { label: "Negociere", value: "NEGOTIATION" },
  { label: "Convertit", value: "CONVERTED" },
];

const LEADS_TABLE_SKELETON_KEYS = [
  "leads-sk-1",
  "leads-sk-2",
  "leads-sk-3",
  "leads-sk-4",
  "leads-sk-5",
] as const;

export function Leads() {
  const navigate = useNavigate();
  const [stateFilter, setStateFilter] = useState<LeadState | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const params =
    stateFilter === "ALL" ? { page, limit: 20 } : { state: stateFilter, page, limit: 20 };
  const { data, isLoading } = useOutreachLeads(params);

  const leads = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = Math.max(1, meta?.pages ?? 1);

  return (
    <PageWrapper title="Lead Management">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STATE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setStateFilter(t.value);
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap",
              stateFilter === t.value ? "bg-b5 text-s950" : "bg-s800 text-t2 hover:bg-s700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {LEADS_TABLE_SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Leads{meta ? ` (${meta.total})` : ""}</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {leads.length === 0 ? (
              <div className="px-5 py-8 text-center text-t3">Niciun lead găsit</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-s700 text-left text-t3">
                    <th className="px-5 py-3">Companie</th>
                    <th className="px-5 py-3">Stare</th>
                    <th className="px-5 py-3">Canal</th>
                    <th className="px-5 py-3">Sentiment</th>
                    <th className="px-5 py-3">Ultimul contact</th>
                    <th className="px-5 py-3">Următor</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-s700 last:border-0 hover:bg-s800/50 cursor-pointer"
                      onClick={() => navigate(`/outreach/leads/${lead.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-t1">{lead.company?.name ?? "—"}</p>
                          {lead.requiresHumanReview && (
                            <span className="text-[10px] text-amber-400">⚠ Review necesar</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <StageBadge stage={lead.currentState} size="sm" />
                      </td>
                      <td className="px-5 py-3">
                        {lead.channel ? (
                          <ChannelBadge channel={lead.channel as LeadChannel} size="sm" />
                        ) : (
                          <span className="text-t3">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <SentimentIndicator
                          score={lead.sentimentScore ?? null}
                          variant="compact"
                          showScore
                        />
                      </td>
                      <td className="px-5 py-3 text-t3 text-xs">
                        {lead.lastContactAt
                          ? new Date(lead.lastContactAt).toLocaleDateString("ro-RO")
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-t3 text-xs">
                        {lead.nextActionAt
                          ? new Date(lead.nextActionAt).toLocaleDateString("ro-RO")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {meta != null && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-md text-sm bg-s800 text-t2 hover:bg-s700 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-sm text-t3">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-md text-sm bg-s800 text-t2 hover:bg-s700 disabled:opacity-40"
          >
            Următor →
          </button>
        </div>
      )}
    </PageWrapper>
  );
}
