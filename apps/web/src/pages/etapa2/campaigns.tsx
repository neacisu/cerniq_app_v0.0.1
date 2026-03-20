import type { ReactNode } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody } from "@/components/ui/index.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { useOutreachCampaigns } from "@/hooks/use-etapa2.js";
import type { OutreachCampaign } from "@/lib/etapa2-api.js";
import { cn } from "@/lib/utils.js";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-900/30 text-green-400",
  PAUSED: "bg-yellow-900/30 text-yellow-400",
  COMPLETED: "bg-blue-900/30 text-blue-400",
  DRAFT: "bg-s600 text-t3",
};

const CAMPAIGNS_SKELETON_KEYS = ["campaigns-sk-1", "campaigns-sk-2", "campaigns-sk-3"] as const;

export function Campaigns() {
  const { data, isLoading } = useOutreachCampaigns();
  const campaigns: OutreachCampaign[] = data?.data ?? [];

  let main: ReactNode;
  if (isLoading) {
    main = (
      <div className="space-y-3">
        {CAMPAIGNS_SKELETON_KEYS.map((k) => (
          <Skeleton key={k} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  } else if (campaigns.length === 0) {
    main = (
      <div className="flex flex-col items-center justify-center py-16 text-t3">
        <p className="font-medium text-t1">Nicio campanie</p>
        <p className="text-sm mt-1">
          Creează o secvență și înrolează leads pentru a porni o campanie.
        </p>
      </div>
    );
  } else {
    main = (
      <div className="space-y-3">
        {campaigns.map((c) => {
          const replyRate = c.sent > 0 ? ((c.replies / c.sent) * 100).toFixed(1) : "0.0";
          return (
            <Card key={c.id}>
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-t1">{c.name}</h3>
                    <p className="text-xs text-t3 mt-0.5 font-mono">{c.id}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_STYLE[c.status] ?? "bg-s600 text-t3",
                    )}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                  {[
                    { label: "Trimise", value: c.sent },
                    { label: "Deschideri", value: c.opens },
                    { label: "Răspunsuri", value: c.replies },
                    { label: "Bounce", value: c.bounces },
                    { label: "Bounce rate", value: `${c.bounceRate.toFixed(1)}%` },
                    { label: "Reply rate", value: `${replyRate}%` },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-md bg-s700 py-2">
                      <p className="text-lg font-bold text-t1">{stat.value}</p>
                      <p className="text-[10px] text-t3">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    );
  }

  return <PageWrapper title="Campaigns">{main}</PageWrapper>;
}
