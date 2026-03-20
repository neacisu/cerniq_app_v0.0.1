import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/index.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { StageBadge } from "@/components/outreach/shared/StageBadge.js";
import { useOutreachAnalytics, useOutreachDailyStats } from "@/hooks/use-etapa2.js";
import type { AnalyticsParams, DailyStat, OutreachAnalytics } from "@/lib/etapa2-api.js";
import { cn } from "@/lib/utils.js";

type FunnelRow = OutreachAnalytics["funnel"][number];

const PERIOD_OPTIONS: { label: string; value: AnalyticsParams["period"] }[] = [
  { label: "7 zile", value: "7d" },
  { label: "30 zile", value: "30d" },
  { label: "90 zile", value: "90d" },
];

const ANALYTICS_GRID_SKELETON_KEYS = [
  "analytics-sk-a",
  "analytics-sk-b",
  "analytics-sk-c",
  "analytics-sk-d",
] as const;

export function Analytics() {
  const [period, setPeriod] = useState<AnalyticsParams["period"]>("7d");
  const { data: analyticsData, isLoading } = useOutreachAnalytics({ period });
  const { data: dailyData } = useOutreachDailyStats();

  const analytics = analyticsData?.data;
  const daily = dailyData?.data ?? [];

  return (
    <PageWrapper title="Analytics Outreach">
      <div className="flex gap-2 mb-6">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium",
              period === opt.value ? "bg-b5 text-s950" : "bg-s800 text-t2 hover:bg-s700",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {ANALYTICS_GRID_SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Canale — Mesaje Trimise</CardTitle>
            </CardHeader>
            <CardBody>
              {analytics ? (
                <div className="space-y-3">
                  {[
                    { label: "WhatsApp", data: analytics.byChannel.whatsapp },
                    { label: "Email Cold", data: analytics.byChannel.emailCold },
                    { label: "Email Cald", data: analytics.byChannel.emailWarm },
                  ].map(({ label, data }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-t2">{label}</span>
                        <span className="text-t1 font-medium">{data.sent}</span>
                      </div>
                      <div className="flex gap-1 text-[10px] text-t3 mb-1">
                        <span>
                          {"delivered" in data
                            ? `Livrat: ${data.delivered}`
                            : `Deschis: ${data.opened}`}
                        </span>
                        <span>·</span>
                        <span>Răspuns: {data.replied}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-t3 text-sm">Nicio dată disponibilă</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Funnel</CardTitle>
            </CardHeader>
            <CardBody>
              {analytics?.funnel && analytics.funnel.length > 0 ? (
                <div className="space-y-2">
                  {analytics.funnel.map((f: FunnelRow) => (
                    <div key={f.state} className="flex items-center gap-3">
                      <StageBadge stage={f.state} size="sm" className="w-36 justify-center" />
                      <div className="flex-1 h-2 bg-s700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-b5 rounded-full"
                          style={{
                            width: `${(f.count / Math.max(...analytics.funnel.map((x: FunnelRow) => x.count), 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-t3 w-8 text-right">{f.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-t3 text-sm">Niciun lead</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sentiment</CardTitle>
            </CardHeader>
            <CardBody>
              {analytics ? (
                <div className="space-y-3">
                  {[
                    {
                      label: "Pozitiv (≥50)",
                      count: analytics.sentiment.positive,
                      color: "bg-green-500",
                    },
                    {
                      label: "Neutru (0-49)",
                      count: analytics.sentiment.neutral,
                      color: "bg-yellow-500",
                    },
                    {
                      label: "Negativ (<0)",
                      count: analytics.sentiment.negative,
                      color: "bg-red-500",
                    },
                  ].map(({ label, count, color }) => {
                    const total =
                      analytics.sentiment.positive +
                        analytics.sentiment.neutral +
                        analytics.sentiment.negative || 1;
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-t2">{label}</span>
                          <span className="text-t1 font-medium">
                            {count} ({Math.round((count / total) * 100)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-s700 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", color)}
                            style={{ width: `${(count / total) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-t3 text-sm">Nicio dată</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistici Zilnice (ultimele {daily.length} zile)</CardTitle>
            </CardHeader>
            <CardBody>
              {daily.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-t3 border-b border-s700">
                        <th className="text-left py-1 pr-3">Data</th>
                        <th className="text-right py-1 pr-3">Trimise</th>
                        <th className="text-right py-1 pr-3">Primite</th>
                        <th className="text-right py-1">Conversii</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.slice(0, 7).map((d: DailyStat) => (
                        <tr key={d.statDate} className="border-b border-s700/50 last:border-0">
                          <td className="py-1 pr-3 text-t2">{d.statDate}</td>
                          <td className="py-1 pr-3 text-right text-t1">{d.messagesSent}</td>
                          <td className="py-1 pr-3 text-right text-t1">{d.messagesReceived}</td>
                          <td className="py-1 text-right text-t1">{d.conversions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-t3 text-sm">Nicio statistică disponibilă</p>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}
